document.addEventListener('DOMContentLoaded', async () => {
  const data = window.FOODSTACK_DATA;
  const api = window.FOODSTACK_API;

  if (!data) {
    return;
  }

  const list = document.getElementById('cart-items');
  const countNodes = document.querySelectorAll('[data-cart-count]');
  const subtotalNode = document.getElementById('summary-subtotal');
  const feeNode = document.getElementById('summary-fee');
  const totalNode = document.getElementById('summary-total');
  const proceedButton = document.getElementById('proceed-order-btn');

  let lastSummary = { subtotal: 0, fee: 0, total: 0 };
  let lastItems = [];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setProceedState(loading, label) {
    if (!proceedButton) {
      return;
    }

    proceedButton.disabled = Boolean(loading);
    proceedButton.textContent = label || 'Proceed to Order';
  }

  function showInlineMessage(message) {
    if (!list) {
      return;
    }

    const existing = list.querySelector('[data-cart-inline-msg]');

    if (existing) {
      existing.textContent = message || '';
      return;
    }

    if (!message) {
      return;
    }

    const node = document.createElement('p');
    node.setAttribute('data-cart-inline-msg', '1');
    node.className = 'menu-note';
    node.textContent = message;
    list.prepend(node);
  }

  function pulseValue(node) {
    if (!node) {
      return;
    }

    node.classList.remove('is-updated');
    void node.offsetWidth;
    node.classList.add('is-updated');
    window.setTimeout(() => node.classList.remove('is-updated'), 220);
  }

  function updateBadge(count) {
    const cartTotal = typeof count === 'number' ? count : data.cartCount();

    countNodes.forEach((node) => {
      node.textContent = String(cartTotal);
    });
  }

  function getItems() {
    const cart = data.readCart();

    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = data.findProduct(id);

        if (!product) {
          return null;
        }

        return {
          ...product,
          qty: Number(qty)
        };
      })
      .filter(Boolean)
      .filter((item) => item.qty > 0);
  }

  function calculate(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const fee = subtotal > 0 ? subtotal * 0.08 : 0;
    const total = subtotal + fee;

    return { subtotal, fee, total };
  }

  function bindActions() {
    document.querySelectorAll('[data-qty-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-product-id');
        const action = button.getAttribute('data-qty-action');
        const delta = action === 'inc' ? 1 : -1;
        data.addToCart(id, delta);
        render();
      });
    });
  }

  function render() {
    if (!list) {
      return;
    }

    const items = getItems();
    lastItems = items.slice();

    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-cart">
          <span class="empty-cart__icon" aria-hidden="true"></span>
          <h3 class="empty-cart__title">Your cart is empty</h3>
          <p class="empty-cart__text">Add products from the menu to start a new order.</p>
          <div class="empty-cart__actions">
            <a class="pill-btn pill-btn--primary" href="menu.html">Go to Menu</a>
          </div>
        </div>
      `;

      if (proceedButton) {
        proceedButton.disabled = true;
      }
    } else {
      list.innerHTML = items
        .map((item) => {
          const subtotal = item.qty * item.price;
          const name = escapeHtml(item.name);
          const description = escapeHtml(item.description);
          const image = escapeHtml(item.image);
          const itemId = escapeHtml(item.id);

          return `
            <article class="cart-item">
              <img
                class="cart-item__image"
                src="${image}"
                alt="${name}"
                loading="lazy"
                referrerpolicy="no-referrer"
                onerror="this.onerror=null;this.src='assets/images/logo-foodstack.png';"
              >
              <div>
                <h3 class="cart-item__title">${name}</h3>
                <p class="cart-item__description">${description}</p>
                <p class="cart-item__price">Unit: ${data.money(item.price)}</p>
              </div>
              <div class="cart-item__right">
                <div class="qty-control" role="group" aria-label="Quantity for ${name}">
                  <button type="button" data-qty-action="dec" data-product-id="${itemId}">-</button>
                  <span>${item.qty}</span>
                  <button type="button" data-qty-action="inc" data-product-id="${itemId}">+</button>
                </div>
                <p class="cart-item__subtotal">${data.money(subtotal)}</p>
              </div>
            </article>
          `;
        })
        .join('');

      bindActions();

      if (proceedButton) {
        proceedButton.disabled = false;
      }
    }

    const summary = calculate(items);
    lastSummary = summary;
    const count = items.reduce((sum, item) => sum + item.qty, 0);

    if (subtotalNode) {
      subtotalNode.textContent = data.money(summary.subtotal);
      pulseValue(subtotalNode);
    }

    if (feeNode) {
      feeNode.textContent = data.money(summary.fee);
      pulseValue(feeNode);
    }

    if (totalNode) {
      totalNode.textContent = data.money(summary.total);
      pulseValue(totalNode);
    }

    updateBadge(count);
  }

  function readCurrentUser() {
    const raw = window.localStorage.getItem('foodstack-user');

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function submitOrder() {
    if (!api) {
      showInlineMessage('Order API is not available.');
      return;
    }

    if (!lastItems.length) {
      showInlineMessage('Your cart is empty.');
      return;
    }

    const user = readCurrentUser();
    const userId = Number(user && user.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      showInlineMessage('Please log in before placing an order.');
      return;
    }

    setProceedState(true, 'Placing order...');

    try {
      await api.createOrder({
        user_id: userId,
        total: Number(lastSummary.total.toFixed(2)),
        status: 'pending'
      });

      /*
        The current backend response for /order does not return the new order id,
        so order-product rows cannot be linked safely yet from the frontend.
      */

      data.clearCart();
      render();
      showInlineMessage(
        'Order was created successfully. Product line linking awaits backend order id response.'
      );
    } catch (error) {
      showInlineMessage(
        error instanceof Error ? error.message : 'Could not submit your order.'
      );
    } finally {
      if (proceedButton) {
        proceedButton.textContent = 'Proceed to Order';
        proceedButton.disabled = lastItems.length === 0;
      }
    }
  }

  if (proceedButton) {
    proceedButton.addEventListener('click', () => {
      submitOrder();
    });
  }

  try {
    showInlineMessage('Loading cart data...');
    await data.loadCatalog();
    render();
    showInlineMessage('');
  } catch (error) {
    if (list) {
      list.innerHTML = '';
    }

    showInlineMessage(data.getCatalogError() || 'Could not load cart products from API.');
    updateBadge(0);
  }
});
