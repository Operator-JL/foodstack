document.addEventListener('DOMContentLoaded', () => {
  const api = window.FOODSTACK_ADMIN_API;
  const runtime = window.FOODSTACK_RUNTIME || {};

  const sessionUser = api && typeof api.readSession === 'function' ? api.readSession() : null;

  if (sessionUser) {
    window.location.href = 'staff-home.html';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('admin-email');
  const passwordInput = document.getElementById('admin-password');
  const submitButton = document.getElementById('admin-login-btn');
  const messageNode = document.getElementById('admin-auth-msg');
  const demoNode = document.getElementById('admin-demo-creds');
  const demoAccessButton = document.getElementById('admin-demo-access-btn');

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

  function startDemoStaffSession() {
    if (typeof runtime.startDemoStaffSession === 'function') {
      return runtime.startDemoStaffSession();
    }

    const payload = {
      id: 'demo-staff',
      name: 'FoodStack Demo Staff',
      role: 'admin',
      email: 'demo.staff@foodstack.local'
    };

    window.localStorage.setItem(
      'foodstack-admin-session',
      JSON.stringify({
        user: payload,
        signedAt: new Date().toISOString(),
        isDemo: true
      })
    );

    return payload;
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

      api.saveSession(result.user);
      showMessage('Access granted. Redirecting...', true);
      window.setTimeout(() => {
        window.location.href = 'staff-home.html';
      }, 300);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unable to sign in.';
      const hint =
        runtime.ALLOW_DEMO_AUTH || runtime.DEV_FALLBACK_MODE
          ? ' You can enter Demo Staff Mode.'
          : '';
      showMessage(`${details}${hint}`, false);
    } finally {
      submitButton.disabled = false;
    }
  });

  if (demoAccessButton) {
    demoAccessButton.addEventListener('click', () => {
      startDemoStaffSession();
      showMessage('Demo staff session started. Redirecting...', true);
      window.setTimeout(() => {
        window.location.href = 'staff-home.html';
      }, 250);
    });
  }
});
