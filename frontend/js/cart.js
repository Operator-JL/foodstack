document.addEventListener('DOMContentLoaded', () => {
  const data = window.FOODSTACK_DATA;

  if (!data) {
    return;
  }

  const list = document.getElementById('cart-items');
  const countNodes = document.querySelectorAll('[data-cart-count]');
  const subtotalNode = document.getElementById('summary-subtotal');
  const feeNode = document.getElementById('summary-fee');
  const totalNode = document.getElementById('summary-total');
  const proceedButton = document.getElementById('proceed-order-btn');

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
      list.innerHTML = items.map((item) => {
        const subtotal = item.qty * item.price;

        return `
          <article class="cart-item">
            <img class="cart-item__image" src="${item.image}" alt="${item.name}">
            <div>
              <h3 class="cart-item__title">${item.name}</h3>
              <p class="cart-item__description">${item.description}</p>
              <p class="cart-item__price">Unit: ${data.money(item.price)}</p>
            </div>
            <div class="cart-item__right">
              <div class="qty-control" role="group" aria-label="Quantity for ${item.name}">
                <button type="button" data-qty-action="dec" data-product-id="${item.id}">-</button>
                <span>${item.qty}</span>
                <button type="button" data-qty-action="inc" data-product-id="${item.id}">+</button>
              </div>
              <p class="cart-item__subtotal">${data.money(subtotal)}</p>
            </div>
          </article>
        `;
      }).join('');

      bindActions();

      if (proceedButton) {
        proceedButton.disabled = false;
      }
    }

    const summary = calculate(items);
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

  render();
});
