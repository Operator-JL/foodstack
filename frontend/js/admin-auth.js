document.addEventListener('DOMContentLoaded', () => {
  const api = window.FOODSTACK_ADMIN_API;

  if (!api) {
    return;
  }

  if (api.readSession()) {
    window.location.href = 'staff-home.html';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const submitButton = document.getElementById('admin-login-btn');
  const messageNode = document.getElementById('admin-auth-msg');
  const demoNode = document.getElementById('admin-demo-creds');

  if (!form || !emailInput || !passwordInput || !submitButton || !messageNode) {
    return;
  }

  if (demoNode) {
    demoNode.textContent = 'Uses live API credentials.';
  }

  function showMessage(text, isSuccess) {
    messageNode.textContent = text || '';
    messageNode.classList.toggle('is-success', Boolean(isSuccess));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = String(emailInput.value || '').trim();
    const password = String(passwordInput.value || '');

    if (!email || !password) {
      showMessage('Email and password are required.', false);
      return;
    }

    submitButton.disabled = true;
    showMessage('Signing in...', true);

    try {
      const result = await api.authenticateStaff({
        email: email,
        password: password
      });

      if (!result.ok) {
        showMessage(result.message || 'Unable to sign in.', false);
        return;
      }

      api.saveSession(result.user);
      showMessage('Access granted. Redirecting...', true);
      window.setTimeout(() => {
        window.location.href = 'staff-home.html';
      }, 300);
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : 'Unable to sign in.',
        false
      );
    } finally {
      submitButton.disabled = false;
    }
  });
});
