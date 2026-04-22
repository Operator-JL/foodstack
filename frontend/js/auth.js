document.addEventListener('DOMContentLoaded', () => {
  const api = window.FOODSTACK_API;

  const loginForm = document.getElementById('customer-login-form');
  const signupForm = document.getElementById('customer-signup-form');
  const authMessage = document.getElementById('auth-inline-msg');

  function showMessage(text, isSuccess) {
    if (!authMessage) {
      return;
    }

    authMessage.textContent = text || '';
    authMessage.classList.toggle('is-success', Boolean(isSuccess));
  }

  function describeAuthError(error, actionLabel) {
    const fallback = actionLabel || 'Unable to complete request.';

    if (!(error instanceof Error)) {
      return fallback;
    }

    if (error.code === 'NETWORK_ERROR') {
      return 'Cannot reach API (backend offline/CORS/network).';
    }

    if (error.code === 'HTTP_400') {
      return `${actionLabel} failed: invalid payload sent to API.`;
    }

    if (error.code === 'HTTP_401') {
      return 'Invalid credentials.';
    }

    if (error.code === 'HTTP_404') {
      return `${actionLabel} failed: endpoint not found.`;
    }

    if (error.code === 'HTTP_405') {
      return `${actionLabel} failed: method not allowed in API route.`;
    }

    return error.message || fallback;
  }

  function setSubmitting(button, submitting, loadingLabel) {
    if (!button) {
      return;
    }

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = button.textContent || '';
    }

    button.disabled = Boolean(submitting);
    button.textContent = submitting
      ? loadingLabel
      : button.dataset.defaultLabel || 'Submit';
  }

  function saveCustomerSession(user) {
    window.localStorage.setItem('foodstack-user', JSON.stringify(user));
    window.localStorage.setItem('user', JSON.stringify(user));
    window.localStorage.removeItem('foodstack-admin-session');
  }

  function parseNameParts(fullName) {
    const clean = String(fullName || '').trim().replace(/\s+/g, ' ');

    if (!clean) {
      return { name: '', lastname: '' };
    }

    const parts = clean.split(' ');

    if (parts.length === 1) {
      return { name: parts[0], lastname: '' };
    }

    return {
      name: parts[0],
      lastname: parts.slice(1).join(' ')
    };
  }

  async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const email = String(emailInput && emailInput.value).trim();
    const password = String(passwordInput && passwordInput.value);

    if (!email || !password) {
      showMessage('Email and password are required.', false);
      return;
    }

    setSubmitting(submitButton, true, 'Signing in...');
    showMessage('Validating credentials...', true);

    try {
      if (!api) {
        throw new Error('Login API is not available in this environment.');
      }

      const response = await api.login({
        email: email,
        password: password
      });

      const user =
        response && typeof response === 'object'
          ? response.user || response.data || null
          : null;

      if (!user || typeof user !== 'object') {
        throw new Error('Login response did not include user data.');
      }

      const normalizedUser = {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        role: user.role
      };

      const role = String(user.role || '').toLowerCase();

      if (role === 'admin' || role === 'staff' || role === 'manager') {
        window.localStorage.setItem(
          'foodstack-admin-session',
          JSON.stringify({
            user: {
              id: user.id,
              name: `${user.name || ''} ${user.lastname || ''}`.trim() || user.email,
              role: user.role,
              email: user.email
            },
            signedAt: new Date().toISOString()
          })
        );

        showMessage('Staff account detected. Redirecting to staff home...', true);
        window.setTimeout(() => {
          window.location.href = 'staff-home.html';
        }, 350);
        return;
      }

      saveCustomerSession(normalizedUser);
      showMessage('Signed in. Redirecting...', true);

      window.setTimeout(() => {
        window.location.href = 'home.html';
      }, 300);
    } catch (error) {
      const details = describeAuthError(error, 'Login');
      showMessage(details, false);
    } finally {
      setSubmitting(submitButton, false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const fullNameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const phoneInput = document.getElementById('signup-phone');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');

    const fullName = String(fullNameInput && fullNameInput.value).trim();
    const email = String(emailInput && emailInput.value).trim();
    const phoneNumber = String(phoneInput && phoneInput.value).trim();
    const password = String(passwordInput && passwordInput.value);
    const confirmPassword = String(confirmPasswordInput && confirmPasswordInput.value);

    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      showMessage('All fields are required.', false);
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', false);
      return;
    }

    const nameParts = parseNameParts(fullName);

    if (!nameParts.name || !nameParts.lastname) {
      showMessage('Please provide a valid full name.', false);
      return;
    }

    setSubmitting(submitButton, true, 'Creating account...');
    showMessage('Sending registration to API...', true);

    try {
      if (!api) {
        throw new Error('Signup API is not available in this environment.');
      }

      await api.createUser({
        name: nameParts.name,
        lastname: nameParts.lastname,
        phoneNumber: phoneNumber,
        email: email,
        password: password,
        role: 'customer'
      });

      showMessage('Account created. Redirecting to login...', true);
      form.reset();

      window.setTimeout(() => {
        window.location.href = 'login.html';
      }, 550);
    } catch (error) {
      const details = describeAuthError(error, 'Signup');
      showMessage(details, false);
    } finally {
      setSubmitting(submitButton, false);
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
});
