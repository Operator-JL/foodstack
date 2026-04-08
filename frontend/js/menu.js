document.addEventListener('DOMContentLoaded', () => {
  const data = window.FOODSTACK_DATA;

  if (!data) {
    return;
  }

  const tabs = document.getElementById('menu-tabs');
  const grid = document.getElementById('menu-grid');
  const msg = document.getElementById('menu-msg');
  let switchTimer = null;
  const availableCategories = ['All', ...data.categories];

  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get('category');
  const initialCategory = availableCategories.includes(requestedCategory) ? requestedCategory : 'All';
  let activeCategory = initialCategory;

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
      button.className = 'category-tab' + (category === activeCategory ? ' is-active' : '');
      button.textContent = category;

      button.addEventListener('click', () => {
        activeCategory = category;
        render();
      });

      tabs.appendChild(button);
    });
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
      grid.innerHTML = items.map((product) => `
        <article class="product-card">
          <div class="product-image">
            <img class="product-card__image" src="${product.image}" alt="${product.name}">
          </div>
          <div class="product-card__body">
            <h3 class="product-card__title">${product.name}</h3>
            <p class="product-card__meta">${product.description}</p>
            <div class="product-card__footer">
              <p class="product-price">${data.money(product.price)}</p>
              <button class="pill-btn pill-btn--primary" type="button" data-add-id="${product.id}">Add</button>
            </div>
          </div>
        </article>
      `).join('');

      document.querySelectorAll('[data-add-id]').forEach((button) => {
        button.addEventListener('click', () => {
          data.addToCart(button.getAttribute('data-add-id'), 1);
          showAddFeedback(button);

          if (msg) {
            msg.textContent = 'Added to cart.';
          }
        });
      });

      grid.classList.remove('is-switching');
    }, 120);
  }

  function render() {
    renderTabs();
    renderGrid();
  }

  render();
});
