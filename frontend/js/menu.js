document.addEventListener('DOMContentLoaded', async () => {
  const data = window.FOODSTACK_DATA;

  if (!data) {
    return;
  }

  const tabs = document.getElementById('menu-tabs');
  const grid = document.getElementById('menu-grid');
  const msg = document.getElementById('menu-msg');
  const menuTitle = document.getElementById('menu-title');
  const menuSubtitle = document.getElementById('menu-subtitle');
  const menuCartCta = document.getElementById('menu-cart-cta');

  let switchTimer = null;
  let availableCategories = ['All'];
  let activeCategory = 'All';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showMessage(text) {
    if (msg) {
      msg.textContent = text || '';
    }
  }

  function hasStaffSession() {
    const raw = window.localStorage.getItem('foodstack-admin-session');

    if (!raw) {
      return false;
    }

    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.user);
    } catch (error) {
      return false;
    }
  }

  const isStaffContext = hasStaffSession();

  function configureContextView() {
    if (!isStaffContext) {
      return;
    }

    if (menuTitle) {
      menuTitle.textContent = 'Menu overview';
    }

    if (menuSubtitle) {
      menuSubtitle.textContent = 'Review products, categories, and pricing.';
    }

    if (menuCartCta) {
      menuCartCta.hidden = true;
      menuCartCta.setAttribute('aria-hidden', 'true');
    }
  }

  function showAddFeedback(button) {
    if (button.dataset.adding === '1') {
      return;
    }

    const originalText = button.getAttribute('data-default-label') || 'Add';
    button.classList.add('is-press');
    window.setTimeout(() => button.classList.remove('is-press'), 140);
    button.dataset.adding = '1';
    button.textContent = 'Added';
    button.classList.add('is-added');

    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('is-added');
      delete button.dataset.adding;
    }, 800);
  }

  function renderTabs() {
    if (!tabs) {
      return;
    }

    tabs.innerHTML = '';

    availableCategories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'category-tab' + (category === activeCategory ? ' is-active' : '');
      button.textContent = category;

      button.addEventListener('click', () => {
        activeCategory = category;
        renderGrid();
        renderTabs();
      });

      tabs.appendChild(button);
    });
  }

  function renderEmptyGrid(message) {
    if (!grid) {
      return;
    }

    grid.innerHTML = `
      <article class="product-card">
        <div class="product-card__body">
          <h3 class="product-card__title">No products available</h3>
          <p class="product-card__meta">${escapeHtml(message)}</p>
        </div>
      </article>
    `;
  }

  function renderGrid() {
    if (!grid) {
      return;
    }

    const items = data.byCategory(activeCategory);

    grid.classList.add('is-switching');

    if (switchTimer) {
      window.clearTimeout(switchTimer);
    }

    switchTimer = window.setTimeout(() => {
      if (!items.length) {
        renderEmptyGrid(
          activeCategory === 'All'
            ? 'The API returned no active products.'
            : `No products found in category "${activeCategory}".`
        );
        grid.classList.remove('is-switching');
        return;
      }

      grid.innerHTML = items
        .map((product) => {
          const name = escapeHtml(product.name);
          const description = escapeHtml(product.description);
          const image = escapeHtml(product.image);
          const productId = escapeHtml(product.id);

          return `
            <article class="product-card">
              <div class="product-image">
                <img
                  class="product-card__image"
                  src="${image}"
                  alt="${name}"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  onerror="this.onerror=null;this.src='assets/images/logo-foodstack.png';"
                >
              </div>
              <div class="product-card__body">
                <h3 class="product-card__title">${name}</h3>
                <p class="product-card__meta">${description}</p>
                <div class="product-card__footer${isStaffContext ? ' is-view-only' : ''}">
                  <p class="product-price">${data.money(product.price)}</p>
                  ${
                    isStaffContext
                      ? '<p class="menu-view-only">View only</p>'
                      : `<button class="pill-btn pill-btn--primary" type="button" data-add-id="${productId}">Add</button>`
                  }
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      if (!isStaffContext) {
        document.querySelectorAll('[data-add-id]').forEach((button) => {
          button.addEventListener('click', () => {
            data.addToCart(button.getAttribute('data-add-id'), 1);
            showAddFeedback(button);
            showMessage('Added to cart.');
          });
        });
      }

      grid.classList.remove('is-switching');
    }, 120);
  }

  async function initializeCatalog() {
    configureContextView();

    showMessage('Loading menu...');

    if (grid) {
      renderEmptyGrid('Fetching products and categories from API.');
    }

    await data.loadCatalog();

    availableCategories = ['All'].concat(data.getCategories());

    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get('category');
    activeCategory = availableCategories.includes(requestedCategory)
      ? requestedCategory
      : 'All';

    renderTabs();
    renderGrid();

    if (isStaffContext) {
      showMessage('Staff mode: cart and purchase actions are disabled.');
    } else {
      showMessage('');
    }
  }

  try {
    await initializeCatalog();
  } catch (error) {
    if (tabs) {
      tabs.innerHTML = '';
    }

    renderEmptyGrid('Products could not be loaded from API.');
    showMessage(data.getCatalogError() || 'Could not load menu data from API.');
  }
});
