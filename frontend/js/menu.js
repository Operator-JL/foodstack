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
  const DEFAULT_PRODUCT_IMAGE = 'assets/images/logo-foodstack.png';
  const VISIBLE_CATEGORY_SLUGS = new Set(['burgers', 'burritos', 'drinks', 'sides']);

  let switchTimer = null;
  let availableCategories = ['All'];
  let activeCategory = 'All';
  const EXTRA_OPTION_CATALOG = Object.freeze({
    meat: { label: 'extra meat', price: 25, maxQuantity: 2 },
    cheese: { label: 'extra cheese', price: 12, maxQuantity: 3 },
    bacon: { label: 'extra bacon', price: 20, maxQuantity: 2 },
    sauce: { label: 'extra sauce', price: 5, maxQuantity: 3 },
    onion: { label: 'extra onion', price: 4, maxQuantity: 2 },
    jalapenos: { label: 'extra jalapenos', price: 6, maxQuantity: 2 },
    birria: { label: 'extra birria', price: 28, maxQuantity: 2 },
    ice: { label: 'extra ice', price: 0, maxQuantity: 1 }
  });
  const PREFERENCE_OPTION_CATALOG = Object.freeze({
    no_pickles: { label: 'no pickles' },
    no_onion: { label: 'no onion' },
    no_jalapenos: { label: 'no jalapenos' },
    no_sauce: { label: 'no sauce' },
    no_ice: { label: 'no ice' }
  });

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const text = normalizeText(value).toLowerCase();
    return text !== '0' && text !== 'false' && text !== 'inactive';
  }

  function toCategorySlug(value) {
    const text = normalizeText(value).toLowerCase();
    const compact = text.replace(/[^a-z]/g, '');

    if (!compact) {
      return '';
    }

    if (compact.startsWith('burger')) {
      return 'burgers';
    }

    if (compact.startsWith('burrito')) {
      return 'burritos';
    }

    if (compact.startsWith('drink') || compact.startsWith('beverage')) {
      return 'drinks';
    }

    if (compact.startsWith('side') || compact.startsWith('snack') || compact.startsWith('fries')) {
      return 'sides';
    }

    return compact;
  }

  function isVisibleCategory(categoryName) {
    return VISIBLE_CATEGORY_SLUGS.has(toCategorySlug(categoryName));
  }

  function getVisibleProducts() {
    const products = data.getProducts();

    if (isStaffContext) {
      return products.slice();
    }

    return products.filter((product) => isVisibleCategory(product && product.category));
  }

  function getVisibleCategoryNames() {
    return Array.from(
      new Set(
        getVisibleProducts()
          .map((product) => normalizeText(product && product.category))
          .filter(Boolean)
      )
    );
  }

  function buildImageBlock(product) {
    const name = escapeHtml(product && product.name);
    const image = normalizeText(product && product.image);
    const isMissingImage = !image || image === DEFAULT_PRODUCT_IMAGE;

    if (isMissingImage) {
      return `
        <div class="product-image product-image--placeholder" aria-label="${name}">
          <div class="product-image__fallback">
            <strong>Image coming soon</strong>
            <span>${name}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="product-image">
        <img
          class="product-card__image"
          src="${escapeHtml(image)}"
          alt="${name}"
          loading="lazy"
          referrerpolicy="no-referrer"
          data-product-image="1"
        >
        <div class="product-image__fallback" data-product-image-fallback="1" hidden>
          <strong>Image coming soon</strong>
          <span>${name}</span>
        </div>
      </div>
    `;
  }

  function activateImageFallbacks() {
    document.querySelectorAll('[data-product-image="1"]').forEach((img) => {
      if (img.dataset.fallbackBound === '1') {
        return;
      }

      const fallbackNode = img.parentElement
        ? img.parentElement.querySelector('[data-product-image-fallback="1"]')
        : null;

      img.dataset.fallbackBound = '1';
      img.addEventListener('error', () => {
        img.setAttribute('hidden', 'hidden');
        if (fallbackNode) {
          fallbackNode.hidden = false;
        }
      });
    });
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

  function toNameKey(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function hasAllTokens(nameKey, tokens) {
    return (Array.isArray(tokens) ? tokens : []).every((token) =>
      nameKey.includes(toNameKey(token))
    );
  }

  function buildExtraOptions(keys) {
    return (Array.isArray(keys) ? keys : [])
      .map((key, index) => {
        const catalog = EXTRA_OPTION_CATALOG[key];

        if (!catalog) {
          return null;
        }

        return {
          id: `extra-${key}`,
          domKey: `extra-${key}-${index}`,
          kind: 'extra',
          name: catalog.label,
          extraPrice: normalizeNumber(catalog.price),
          maxQuantity: Math.max(1, Math.floor(normalizeNumber(catalog.maxQuantity || 1))),
          defaultQuantity: 0
        };
      })
      .filter(Boolean);
  }

  function buildPreferenceOptions(keys) {
    return (Array.isArray(keys) ? keys : [])
      .map((key, index) => {
        const catalog = PREFERENCE_OPTION_CATALOG[key];

        if (!catalog) {
          return null;
        }

        return {
          id: `pref-${key}`,
          domKey: `pref-${key}-${index}`,
          kind: 'preference',
          name: catalog.label,
          extraPrice: 0
        };
      })
      .filter(Boolean);
  }

  function resolveSideCustomization(nameKey) {
    const rules = [
      {
        tokens: ['curly', 'fries'],
        extras: ['cheese', 'sauce', 'jalapenos'],
        preferences: []
      },
      {
        tokens: ['loaded', 'fries'],
        extras: ['cheese', 'meat', 'jalapenos', 'sauce'],
        preferences: []
      },
      {
        tokens: ['nachos', 'birria'],
        extras: ['birria', 'cheese', 'jalapenos', 'onion', 'sauce'],
        preferences: ['no_jalapenos', 'no_onion']
      },
      {
        tokens: ['chicken', 'tenders'],
        extras: ['sauce'],
        preferences: []
      },
      {
        tokens: ['chimichang', 'bites'],
        extras: ['sauce', 'cheese'],
        preferences: []
      },
      {
        tokens: ['bacon', 'mac', 'cheese'],
        extras: ['cheese', 'bacon'],
        preferences: []
      },
      {
        tokens: ['chili', 'cheese', 'fries'],
        extras: ['cheese', 'jalapenos', 'sauce'],
        preferences: []
      }
    ];

    const match = rules.find((rule) => hasAllTokens(nameKey, rule.tokens));
    if (match) {
      return match;
    }

    return {
      extras: ['sauce'],
      preferences: []
    };
  }

  function getCommercialCustomization(product) {
    const categorySlug = toCategorySlug(product && product.category);
    const nameKey = toNameKey(product && product.name);

    if (categorySlug === 'burgers') {
      return {
        extras: buildExtraOptions(['meat', 'cheese', 'bacon', 'sauce', 'onion']),
        preferences: buildPreferenceOptions([
          'no_pickles',
          'no_onion',
          'no_jalapenos',
          'no_sauce'
        ]),
        note: ''
      };
    }

    if (categorySlug === 'burritos') {
      return {
        extras: buildExtraOptions(['meat', 'cheese', 'sauce', 'jalapenos', 'onion']),
        preferences: buildPreferenceOptions(['no_onion', 'no_jalapenos', 'no_sauce']),
        note: ''
      };
    }

    if (categorySlug === 'drinks') {
      if (nameKey.includes('bottle') || nameKey.includes('can')) {
        return {
          extras: [],
          preferences: [],
          note: 'No extra customization available for this drink.'
        };
      }

      return {
        extras: buildExtraOptions(['ice']),
        preferences: buildPreferenceOptions(['no_ice']),
        note: ''
      };
    }

    if (categorySlug === 'sides') {
      const sideSetup = resolveSideCustomization(nameKey);
      return {
        extras: buildExtraOptions(sideSetup.extras),
        preferences: buildPreferenceOptions(sideSetup.preferences),
        note: ''
      };
    }

    return {
      extras: [],
      preferences: [],
      note: 'No extra customization available.'
    };
  }

  function truncateDescription(value) {
    const text = normalizeText(value) || 'Freshly made for your order.';
    if (text.length <= 118) {
      return text;
    }
    return `${text.slice(0, 117).trim()}...`;
  }

  function makeOptionPriceLabel(option) {
    if (option.extraPrice <= 0) {
      return 'Included';
    }
    return `+${data.money(option.extraPrice)}`;
  }

  function readModalSelection(container, option) {
    const row = container.querySelector(`[data-extra-id="${option.domKey}"]`);
    if (!row) {
      return option.defaultQuantity;
    }

    const qtyNode = row.querySelector('[data-extra-qty]');
    const quantity = Math.floor(normalizeNumber(qtyNode && qtyNode.textContent));
    return Math.min(option.maxQuantity, Math.max(option.defaultQuantity, quantity));
  }

  function readPreferenceSelection(container, option) {
    const checkbox = container.querySelector(
      `[data-pref-id="${option.domKey}"] input[type="checkbox"]`
    );
    return Boolean(checkbox && checkbox.checked);
  }

  function buildCustomizationPayload(product, extras, preferences, popup) {
    const selectedExtras = extras
      .map((option) => {
        const quantity = readModalSelection(popup, option);

        if (quantity <= 0) {
          return null;
        }

        return {
          productIngredientId: option.id,
          ingredientId: option.id,
          name: option.name,
          quantity: quantity,
          defaultQuantity: 0,
          chargedQuantity: quantity,
          extraPrice: option.extraPrice,
          lineExtraTotal: Number((quantity * option.extraPrice).toFixed(2)),
          kind: 'extra'
        };
      })
      .filter(Boolean);

    const selectedPreferences = preferences
      .map((option) => {
        const selected = readPreferenceSelection(popup, option);

        if (!selected) {
          return null;
        }

        return {
          productIngredientId: option.id,
          ingredientId: option.id,
          name: option.name,
          quantity: 1,
          defaultQuantity: 1,
          chargedQuantity: 0,
          extraPrice: 0,
          lineExtraTotal: 0,
          kind: 'preference'
        };
      })
      .filter(Boolean);

    const extraTotal = selectedExtras.reduce(
      (sum, option) => sum + normalizeNumber(option.lineExtraTotal),
      0
    );
    const basePrice = normalizeNumber(product && product.price);
    const allOptions = selectedExtras.concat(selectedPreferences);

    return {
      productId: normalizeText(product && product.id),
      productName: normalizeText(product && product.name),
      basePrice: basePrice,
      extraTotal: Number(extraTotal.toFixed(2)),
      finalPrice: Number((basePrice + extraTotal).toFixed(2)),
      notes: selectedPreferences.map((option) => option.name).join(', '),
      options: allOptions
    };
  }

  function renderCustomizationSummary(popup, product, extras, preferences) {
    const payload = buildCustomizationPayload(product, extras, preferences, popup);
    const baseNode = popup.querySelector('[data-modal-base-price]');
    const extrasNode = popup.querySelector('[data-modal-extra-price]');
    const finalNode = popup.querySelector('[data-modal-final-price]');

    if (baseNode) {
      baseNode.textContent = data.money(payload.basePrice);
    }
    if (extrasNode) {
      extrasNode.textContent =
        payload.extraTotal > 0 ? `+ ${data.money(payload.extraTotal)}` : '$0.00';
    }
    if (finalNode) {
      finalNode.textContent = data.money(payload.finalPrice);
    }
  }

  async function openAddModal(product) {
    if (!product) {
      return false;
    }

    if (!window.Swal) {
      data.addToCart(product.id, 1);
      return true;
    }

    const customizationConfig = getCommercialCustomization(product);
    const extraOptions = customizationConfig.extras;
    const preferenceOptions = customizationConfig.preferences;
    const hasExtras = extraOptions.length > 0;
    const hasPreferences = preferenceOptions.length > 0;
    const basePrice = normalizeNumber(product.price);
    const image = normalizeText(product.image);
    const showImage = Boolean(image && image !== DEFAULT_PRODUCT_IMAGE);
    const description = escapeHtml(truncateDescription(product.description));
    const name = escapeHtml(product.name);
    const warningMarkup = customizationConfig.note
      ? `<p class="menu-modal__warning">${escapeHtml(customizationConfig.note)}</p>`
      : '';

    const extrasMarkup = hasExtras
      ? extraOptions
          .map((option) => {
            const quantityLabel = option.defaultQuantity > 0 ? option.defaultQuantity : 0;

            return `
              <div class="menu-modal__option" data-extra-id="${option.domKey}">
                <div class="menu-modal__option-copy">
                  <p class="menu-modal__option-title">${escapeHtml(option.name)}</p>
                  <p class="menu-modal__option-meta">
                    <span>${escapeHtml(makeOptionPriceLabel(option))}</span>
                  </p>
                </div>
                <div class="menu-modal__stepper">
                  <button type="button" data-extra-minus aria-label="Decrease ${escapeHtml(
                    option.name
                  )}">-</button>
                  <span data-extra-qty>${quantityLabel}</span>
                  <button type="button" data-extra-plus aria-label="Increase ${escapeHtml(
                    option.name
                  )}">+</button>
                </div>
              </div>
            `;
          })
          .join('')
      : `
          <div class="menu-modal__empty">
            <p>No priced extras for this product.</p>
          </div>
        `;

    const preferencesMarkup = hasPreferences
      ? preferenceOptions
          .map(
            (option) => `
              <label class="menu-modal__preference" data-pref-id="${option.domKey}">
                <input type="checkbox">
                <span>${escapeHtml(option.name)}</span>
              </label>
            `
          )
          .join('')
      : `
          <div class="menu-modal__empty">
            <p>No preference options for this product.</p>
          </div>
        `;

    const html = `
      <section class="menu-modal">
        <div class="menu-modal__top">
          ${
            showImage
              ? `<div class="menu-modal__media">
                   <img src="${escapeHtml(image)}" alt="${name}" data-modal-image>
                   <div class="menu-modal__media-fallback" data-modal-image-fallback hidden>
                     <strong>Image coming soon</strong>
                   </div>
                 </div>`
              : `<div class="menu-modal__media menu-modal__media--fallback">
                   <strong>Image coming soon</strong>
                 </div>`
          }
          <div class="menu-modal__headline">
            <h3>${name}</h3>
            <p>${description}</p>
            <p class="menu-modal__base">Base price: <strong>${data.money(basePrice)}</strong></p>
          </div>
        </div>

        <div class="menu-modal__customize">
          <h4>Customize your order</h4>
          ${warningMarkup}
          <div class="menu-modal__group">
            <h5>Extras</h5>
            ${extrasMarkup}
          </div>
          <div class="menu-modal__group">
            <h5>Preferences</h5>
            <div class="menu-modal__preferences">${preferencesMarkup}</div>
          </div>
        </div>

        <div class="menu-modal__summary">
          <p><span>Base</span><strong data-modal-base-price>${data.money(basePrice)}</strong></p>
          <p><span>Extras</span><strong data-modal-extra-price>$0.00</strong></p>
          <p class="menu-modal__summary-total"><span>Final price</span><strong data-modal-final-price>${data.money(
            basePrice
          )}</strong></p>
        </div>
      </section>
    `;

    const response = await window.Swal.fire({
      title: 'Add to cart',
      html: html,
      width: 640,
      showCancelButton: true,
      confirmButtonText: 'Add to cart',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'menu-swal-popup',
        title: 'menu-swal-title',
        confirmButton: 'pill-btn pill-btn--primary menu-swal-confirm',
        cancelButton: 'pill-btn pill-btn--ghost menu-swal-cancel',
        actions: 'menu-swal-actions'
      },
      buttonsStyling: false,
      focusConfirm: false,
      didOpen: (popup) => {
        const modalImage = popup.querySelector('[data-modal-image]');
        const modalImageFallback = popup.querySelector('[data-modal-image-fallback]');

        if (modalImage) {
          modalImage.addEventListener('error', () => {
            modalImage.setAttribute('hidden', 'hidden');
            if (modalImageFallback) {
              modalImageFallback.hidden = false;
            }
          });
        }

        extraOptions.forEach((option) => {
          const row = popup.querySelector(`[data-extra-id="${option.domKey}"]`);

          if (!row) {
            return;
          }

          const minusButton = row.querySelector('[data-extra-minus]');
          const plusButton = row.querySelector('[data-extra-plus]');
          const quantityNode = row.querySelector('[data-extra-qty]');
          const updateControls = () => {
            const current = readModalSelection(popup, option);
            if (minusButton) {
              minusButton.disabled = current <= option.defaultQuantity;
            }
            if (plusButton) {
              plusButton.disabled = current >= option.maxQuantity;
            }
          };

          if (minusButton) {
            minusButton.addEventListener('click', () => {
              const current = readModalSelection(popup, option);
              const next = Math.max(option.defaultQuantity, current - 1);
              if (quantityNode) {
                quantityNode.textContent = String(next);
              }
              updateControls();
              renderCustomizationSummary(popup, product, extraOptions, preferenceOptions);
            });
          }

          if (plusButton) {
            plusButton.addEventListener('click', () => {
              const current = readModalSelection(popup, option);
              const next = Math.min(option.maxQuantity, current + 1);
              if (quantityNode) {
                quantityNode.textContent = String(next);
              }
              updateControls();
              renderCustomizationSummary(popup, product, extraOptions, preferenceOptions);
            });
          }

          updateControls();
        });

        popup.querySelectorAll('[data-pref-id] input[type="checkbox"]').forEach((checkbox) => {
          checkbox.addEventListener('change', () => {
            renderCustomizationSummary(popup, product, extraOptions, preferenceOptions);
          });
        });

        renderCustomizationSummary(popup, product, extraOptions, preferenceOptions);
      },
      preConfirm: () => {
        const popup = window.Swal.getPopup();
        return buildCustomizationPayload(product, extraOptions, preferenceOptions, popup);
      }
    });

    if (!response.isConfirmed) {
      return false;
    }

    const selectedCustomization = response.value || {
      productId: normalizeText(product.id),
      productName: normalizeText(product.name),
      basePrice: basePrice,
      extraTotal: 0,
      finalPrice: basePrice,
      options: []
    };

    if (typeof data.addCustomizedToCart === 'function') {
      data.addCustomizedToCart(product.id, 1, selectedCustomization);
    } else {
      data.addToCart(product.id, 1);
    }

    return true;
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

    const sourceItems = getVisibleProducts();
    const items =
      activeCategory === 'All'
        ? sourceItems
        : sourceItems.filter((item) => normalizeText(item.category) === activeCategory);

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
          const productId = escapeHtml(product.id);

          return `
            <article class="product-card">
              ${buildImageBlock(product)}
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

      activateImageFallbacks();

      if (!isStaffContext) {
        document.querySelectorAll('[data-add-id]').forEach((button) => {
          button.addEventListener('click', async () => {
            if (button.dataset.busy === '1') {
              return;
            }

            button.dataset.busy = '1';
            button.disabled = true;

            const productId = button.getAttribute('data-add-id');
            const product = data.findProduct(productId);

            try {
              const added = await openAddModal(product);

              if (added) {
                showAddFeedback(button);
                showMessage('Added to cart.');
              }
            } catch (error) {
              showMessage(
                error instanceof Error
                  ? `Could not open customization: ${error.message}`
                  : 'Could not open customization.'
              );
            } finally {
              button.disabled = false;
              delete button.dataset.busy;
            }
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

    const result = await data.loadCatalog();

    availableCategories = ['All'].concat(getVisibleCategoryNames());

    const params = new URLSearchParams(window.location.search);
    const requestedCategory = normalizeText(params.get('category'));
    const matchedCategory = availableCategories.find(
      (categoryName) => toCategorySlug(categoryName) === toCategorySlug(requestedCategory)
    );
    activeCategory = matchedCategory
      ? matchedCategory
      : 'All';

    renderTabs();
    renderGrid();

    if (result && result.source === 'demo') {
      showMessage(result.warning || 'Using local demo catalog.');
    } else if (isStaffContext) {
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
