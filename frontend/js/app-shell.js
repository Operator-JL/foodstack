document.addEventListener('DOMContentLoaded', () => {
  const data = window.FOODSTACK_DATA;

  if (!data) {
    return;
  }

  function updateCartCounters() {
    const count = data.cartCount();

    document.querySelectorAll('[data-cart-count]').forEach((node) => {
      node.textContent = String(count);
    });
  }

  function logout() {
    const knownKeys = ['foodstack-cart', 'foodstack-user', 'user'];

    knownKeys.forEach((key) => window.localStorage.removeItem(key));

    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('foodstack-')) {
        window.localStorage.removeItem(key);
      }
    });

    updateCartCounters();
    window.location.href = 'login.html';
  }

  document.querySelectorAll('[data-logout]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  });

  window.addEventListener('foodstack:cart-updated', updateCartCounters);
  updateCartCounters();
});
