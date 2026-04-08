document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('[data-static-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const target = form.getAttribute('data-auth-target');

      if (target) {
        window.location.href = target;
      }
    });
  });
});
