(function () {
  const AUTH_TOKEN_KEY = 'foodstack-auth-token';
  const API_BASE_STORAGE_KEY = 'foodstack-api-base-url';
  const DEMO_MODE_STORAGE_KEY = 'foodstack-demo-mode';

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') {
      return value;
    }

    const text = normalizeText(value).toLowerCase();
    if (!text) {
      return Boolean(fallback);
    }

    if (['1', 'true', 'yes', 'on'].includes(text)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(text)) {
      return false;
    }

    return Boolean(fallback);
  }

  function normalizeCredentials(value, fallback) {
    const allowed = ['omit', 'same-origin', 'include'];
    const candidate = normalizeText(value || fallback || 'same-origin').toLowerCase();
    return allowed.includes(candidate) ? candidate : 'same-origin';
  }

  function normalizeBaseUrl(value) {
    const text = normalizeText(value);
    if (!text) {
      return '';
    }
    return text.replace(/\/+$/, '');
  }

  function parseDemoModeFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const flag = params.get('demo');
    if (flag == null) {
      return null;
    }

    const enabled = normalizeBoolean(flag, false);
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, enabled ? '1' : '0');
    return enabled;
  }

  function readStoredDemoMode() {
    const fromUrl = parseDemoModeFromUrl();
    if (typeof fromUrl === 'boolean') {
      return fromUrl;
    }

    return normalizeBoolean(window.localStorage.getItem(DEMO_MODE_STORAGE_KEY), false);
  }

  function resolveApiBaseUrl(runtimeOverride) {
    const overrideBase = normalizeBaseUrl(runtimeOverride.API_BASE_URL);
    if (overrideBase) {
      return overrideBase;
    }

    const storedBase = normalizeBaseUrl(window.localStorage.getItem(API_BASE_STORAGE_KEY));
    if (storedBase) {
      return storedBase;
    }

    const protocol = normalizeText(window.location.protocol).toLowerCase();
    const hostname = normalizeText(window.location.hostname).toLowerCase();
    const port = normalizeText(window.location.port);
    const origin = normalizeText(window.location.origin);

    if (!origin || protocol === 'file:') {
      return 'http://127.0.0.1:5000/api';
    }

    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocalHost && port && port !== '5000') {
      return 'http://127.0.0.1:5000/api';
    }

    return `${origin}/api`;
  }

  function joinUrl(base, path) {
    const safeBase = String(base || '').replace(/\/+$/, '');
    const safePath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    return `${safeBase}${safePath}`;
  }

  function toErrorMessage(payload, fallback) {
    if (payload && typeof payload === 'object') {
      if (payload.errorMessage) {
        return String(payload.errorMessage);
      }
      if (payload.message) {
        return String(payload.message);
      }
    }
    return fallback;
  }

  function readAuthToken() {
    return normalizeText(window.localStorage.getItem(AUTH_TOKEN_KEY));
  }

  function saveAuthToken(token) {
    const normalized = normalizeText(token);
    if (!normalized) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      return '';
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, normalized);
    return normalized;
  }

  function clearAuthToken() {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async function parseJsonSafe(response) {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  const RUNTIME_OVERRIDE = window.FOODSTACK_RUNTIME_OVERRIDES || {};
  const DEMO_MODE = readStoredDemoMode();

  const RUNTIME_CONFIG = {
    API_BASE_URL: resolveApiBaseUrl(RUNTIME_OVERRIDE),
    DEV_FALLBACK_MODE: Object.hasOwn(RUNTIME_OVERRIDE, 'DEV_FALLBACK_MODE')
      ? normalizeBoolean(RUNTIME_OVERRIDE.DEV_FALLBACK_MODE, false)
      : DEMO_MODE,
    ALLOW_DEMO_AUTH: Object.hasOwn(RUNTIME_OVERRIDE, 'ALLOW_DEMO_AUTH')
      ? normalizeBoolean(RUNTIME_OVERRIDE.ALLOW_DEMO_AUTH, false)
      : DEMO_MODE,
    REQUEST_CREDENTIALS: normalizeCredentials(
      RUNTIME_OVERRIDE.REQUEST_CREDENTIALS,
      'same-origin'
    )
  };

  async function request(path, options) {
    const config = options || {};
    const method = normalizeText(config.method || 'GET').toUpperCase();
    const url = joinUrl(RUNTIME_CONFIG.API_BASE_URL, path);
    const headers = {
      Accept: 'application/json',
      ...(config.headers || {})
    };

    if (config.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const requestCredentials = normalizeCredentials(
      config.credentials,
      RUNTIME_CONFIG.REQUEST_CREDENTIALS
    );

    if (config.auth !== false) {
      const token = readAuthToken();
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response;
    try {
      response = await fetch(url, {
        method: method,
        headers: headers,
        credentials: requestCredentials,
        body: config.body != null ? JSON.stringify(config.body) : undefined
      });
    } catch (error) {
      const networkError = new Error('API is unreachable (network/CORS/offline).');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      const httpError = new Error(
        toErrorMessage(payload, `API request failed (${response.status}).`)
      );
      httpError.code = `HTTP_${response.status}`;
      httpError.httpStatus = response.status;
      throw httpError;
    }

    if (payload && typeof payload === 'object' && Object.hasOwn(payload, 'status')) {
      if (Number(payload.status) !== 0) {
        const apiError = new Error(
          toErrorMessage(payload, 'API returned an error response.')
        );
        apiError.code = 'API_STATUS_ERROR';
        apiError.apiStatus = Number(payload.status);
        throw apiError;
      }
      return Object.hasOwn(payload, 'data') ? payload.data : payload;
    }

    return payload;
  }

  function runtimeEnabled(flagName) {
    return Boolean(RUNTIME_CONFIG[flagName]);
  }

  function setDemoMode(enabled) {
    const value = normalizeBoolean(enabled, false);
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, value ? '1' : '0');
    return value;
  }

  function startDemoCustomerSession(overrides) {
    const payload = {
      id: 'demo-customer',
      name: 'Demo',
      lastname: 'User',
      email: 'demo.customer@foodstack.local',
      role: 'customer',
      ...(overrides && typeof overrides === 'object' ? overrides : {})
    };

    window.localStorage.setItem('foodstack-user', JSON.stringify(payload));
    window.localStorage.setItem('user', JSON.stringify(payload));
    window.localStorage.removeItem('foodstack-admin-session');
    clearAuthToken();
    setDemoMode(true);
    return payload;
  }

  function startDemoStaffSession(overrides) {
    const user = {
      id: 'demo-staff',
      name: 'FoodStack Demo Staff',
      email: 'demo.staff@foodstack.local',
      role: 'admin',
      ...(overrides && typeof overrides === 'object' ? overrides : {})
    };

    window.localStorage.setItem(
      'foodstack-admin-session',
      JSON.stringify({
        user: user,
        signedAt: new Date().toISOString(),
        isDemo: true
      })
    );
    clearAuthToken();
    setDemoMode(true);
    return user;
  }

  const api = {
    request: request,
    getUsers() {
      return request('/users');
    },
    getUserById(userId) {
      return request(`/users/${userId}`);
    },
    createUser(payload) {
      return request('/users', { method: 'POST', body: payload });
    },
    updateUser(userId, payload) {
      return request(`/users/${userId}`, { method: 'PUT', body: payload });
    },
    async login(payload) {
      const response = await request('/login', { method: 'POST', body: payload, auth: false });
      if (response && typeof response === 'object' && response.token) {
        saveAuthToken(response.token);
      }
      return response;
    },
    async logout() {
      try {
        await request('/logout', { method: 'POST' });
      } finally {
        clearAuthToken();
      }
    },
    getSession() {
      return request('/session');
    },
    getCategories() {
      return request('/categories');
    },
    getCategoryById(categoryId) {
      return request(`/categories/${categoryId}`);
    },
    getProducts() {
      return request('/products');
    },
    getProductById(productId) {
      return request(`/products/${productId}`);
    },
    createProduct(payload) {
      return request('/products', { method: 'POST', body: payload });
    },
    getIngredients() {
      return request('/ingredients');
    },
    getIngredientById(ingredientId) {
      return request(`/ingredients/${ingredientId}`);
    },
    getProductIngredients() {
      return request('/product-ingredients');
    },
    getProductIngredientById(recordId) {
      return request(`/product-ingredients/${recordId}`);
    },
    getOrders() {
      return request('/orders');
    },
    getOrdersByUser(userId) {
      return request(`/orders/user/${userId}`);
    },
    getOrderById(orderId) {
      return request(`/orders/${orderId}`);
    },
    updateOrder(orderId, payload) {
      return request(`/orders/${orderId}`, { method: 'PUT', body: payload });
    },
    createOrder(payload) {
      return request('/orders', { method: 'POST', body: payload });
    },
    getOrderProducts() {
      return request('/order-products');
    },
    getOrderProductsByOrder(orderId) {
      return request(`/order-products/order/${orderId}`);
    },
    getOrderProductById(recordId) {
      return request(`/order-products/${recordId}`);
    },
    createOrderProduct(payload) {
      return request('/order-products', { method: 'POST', body: payload });
    },
    createOrderProductIngredient(payload) {
      return request('/order-product-ingredients', { method: 'POST', body: payload });
    },
    getOrderProductIngredients() {
      return request('/order-product-ingredients');
    },
    getOrderProductIngredientById(recordId) {
      return request(`/order-product-ingredients/${recordId}`);
    }
  };

  window.FOODSTACK_API = api;
  window.FOODSTACK_RUNTIME = {
    ...RUNTIME_CONFIG,
    isEnabled: runtimeEnabled,
    setDemoMode: setDemoMode,
    startDemoCustomerSession: startDemoCustomerSession,
    startDemoStaffSession: startDemoStaffSession,
    readAuthToken: readAuthToken,
    clearAuthToken: clearAuthToken,
    saveAuthToken: saveAuthToken
  };
})();
