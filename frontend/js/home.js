document.addEventListener('DOMContentLoaded', () => {
  const data = window.FOODSTACK_DATA;

  if (!data) {
    return;
  }

  const grid = document.getElementById('home-featured-grid');
  const info = document.getElementById('home-inline-msg');

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

  function randomSelection(items, count) {
    const shuffled = items.slice();

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[swapIndex];
      shuffled[swapIndex] = tmp;
    }

    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  function cardTemplate(product) {
    return `
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
    `;
  }

  function bindAddButtons() {
    const addButtons = document.querySelectorAll('[data-add-id]');

    addButtons.forEach((button) => {
      button.addEventListener('click', () => {
        data.addToCart(button.getAttribute('data-add-id'), 1);
        showAddFeedback(button);

        if (info) {
          info.textContent = 'Added to cart.';
        }
      });
    });
  }

  function renderProducts() {
    if (!grid) {
      return;
    }

    const items = randomSelection(data.products, 6);
    grid.innerHTML = items.map(cardTemplate).join('');
    bindAddButtons();
  }

  renderProducts();
});
