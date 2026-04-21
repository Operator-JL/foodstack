document.addEventListener('DOMContentLoaded', async () => {
  const api = window.FOODSTACK_ADMIN_API;

  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const submitButton = document.getElementById('admin-login-btn');
  const messageNode = document.getElementById('admin-auth-msg');
  const loginHintNode = document.getElementById('admin-login-creds');

  if (!form || !emailInput || !passwordInput || !submitButton || !messageNode) {
    return;
  }

  if (api && typeof api.verifyStaffSession === 'function') {
    const existingSession = await api.verifyStaffSession();
    if (existingSession && existingSession.ok) {
      window.location.href = 'staff-home.html';
      return;
    }
  }

  if (loginHintNode) {
    loginHintNode.textContent = 'Use your staff credentials.';
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
      if (!api || typeof api.authenticateStaff !== 'function') {
        throw new Error('Staff login API is not available.');
      }

      const result = await api.authenticateStaff({
        email: email,
        password: password
      });

      if (!result.ok) {
        showMessage(result.message || 'Unable to sign in.', false);
        return;
      }

      showMessage('Access granted. Redirecting...', true);
      window.setTimeout(() => {
        window.location.href = 'staff-home.html';
      }, 300);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unable to sign in.';
      showMessage(details, false);
    } finally {
      submitButton.disabled = false;
    }
  });

});
