(function () {
  const AUTH_TOKEN_KEY = 'foodstack-auth-token';
  const API_BASE_STORAGE_KEY = 'foodstack-api-base-url';

  function normalizeText(value) {
    return String(value || '').trim();
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

  function readJsonStorage(key) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
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

  const RUNTIME_CONFIG = {
    API_BASE_URL: resolveApiBaseUrl(RUNTIME_OVERRIDE),
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

  function isMissingEndpointError(error) {
    if (!(error instanceof Error)) {
      return false;
    }
    return error.code === 'HTTP_404' || error.code === 'HTTP_405';
  }

  async function requestWithFallback(paths, options) {
    const routeList = Array.isArray(paths) ? paths.filter(Boolean) : [];
    if (!routeList.length) {
      throw new Error('No API routes were provided.');
    }

    let lastError = null;
    for (let index = 0; index < routeList.length; index += 1) {
      const path = routeList[index];
      try {
        return await request(path, options);
      } catch (error) {
        lastError = error;
        const canRetry = index < routeList.length - 1 && isMissingEndpointError(error);
        if (!canRetry) {
          throw error;
        }
      }
    }

    throw lastError || new Error('API request failed.');
  }

  async function resolveSessionFromStorageFallback() {
    const adminSession = readJsonStorage('foodstack-admin-session');
    const adminUser =
      adminSession && typeof adminSession === 'object' ? adminSession.user : null;
    const customerUser =
      readJsonStorage('foodstack-user') || readJsonStorage('user');

    const storedUser =
      adminUser && typeof adminUser === 'object'
        ? adminUser
        : customerUser && typeof customerUser === 'object'
          ? customerUser
          : null;

    if (!storedUser) {
      return null;
    }

    const userId = normalizeText(storedUser.id);
    if (!userId) {
      return storedUser;
    }

    try {
      const userDetails = await requestWithFallback(
        [`/users/${userId}`, `/user/${userId}`],
        { auth: false }
      );

      if (!userDetails || typeof userDetails !== 'object') {
        return storedUser;
      }

      return {
        ...storedUser,
        ...userDetails,
        role: normalizeText(userDetails.role) || normalizeText(storedUser.role),
        email: normalizeText(userDetails.email) || normalizeText(storedUser.email)
      };
    } catch (error) {
      return storedUser;
    }
  }

  const api = {
    request: request,
    getUsers() {
      return request('/users');
    },
    getUserById(userId) {
      return requestWithFallback([`/users/${userId}`, `/user/${userId}`]);
    },
    createUser(payload) {
      return requestWithFallback(['/users', '/user'], { method: 'POST', body: payload });
    },
    updateUser(userId, payload) {
      return requestWithFallback([`/users/${userId}`, `/user/${userId}`], {
        method: 'PUT',
        body: payload
      });
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
    async getSession() {
      try {
        return await request('/session');
      } catch (error) {
        if (!isMissingEndpointError(error)) {
          throw error;
        }

        const fallback = await resolveSessionFromStorageFallback();
        if (fallback) {
          return fallback;
        }

        throw error;
      }
    },
    getCategories() {
      return request('/categories');
    },
    getCategoryById(categoryId) {
      return requestWithFallback([`/categories/${categoryId}`, `/category/${categoryId}`]);
    },
    getProducts() {
      return request('/products');
    },
    getProductById(productId) {
      return requestWithFallback([`/products/${productId}`, `/product/${productId}`]);
    },
    createProduct(payload) {
      return requestWithFallback(['/products', '/product'], { method: 'POST', body: payload });
    },
    updateProduct(productId, payload) {
      return requestWithFallback([`/products/${productId}`, `/product/${productId}`], {
        method: 'PUT',
        body: payload
      });
    },
    getIngredients() {
      return request('/ingredients');
    },
    getIngredientById(ingredientId) {
      return requestWithFallback([`/ingredients/${ingredientId}`, `/ingredient/${ingredientId}`]);
    },
    getProductIngredients() {
      return request('/product-ingredients');
    },
    getProductIngredientById(recordId) {
      return requestWithFallback([`/product-ingredients/${recordId}`, `/product-ingredient/${recordId}`]);
    },
    createProductIngredient(payload) {
      return requestWithFallback(['/product-ingredients', '/product-ingredient'], {
        method: 'POST',
        body: payload
      });
    },
    updateProductIngredient(recordId, payload) {
      return requestWithFallback([`/product-ingredients/${recordId}`, `/product-ingredient/${recordId}`], {
        method: 'PUT',
        body: payload
      });
    },
    getOrders() {
      return request('/orders');
    },
    getOrdersByUser(userId) {
      return request(`/orders/user/${userId}`);
    },
    getOrderById(orderId) {
      return requestWithFallback([`/orders/${orderId}`, `/order/${orderId}`]);
    },
    updateOrder(orderId, payload) {
      return requestWithFallback([`/orders/${orderId}`, `/order/${orderId}`], {
        method: 'PUT',
        body: payload
      });
    },
    createOrder(payload) {
      return requestWithFallback(['/orders', '/order'], { method: 'POST', body: payload });
    },
    getOrderProducts() {
      return request('/order-products');
    },
    getOrderProductsByOrder(orderId) {
      return request(`/order-products/order/${orderId}`);
    },
    getOrderProductById(recordId) {
      return requestWithFallback([`/order-products/${recordId}`, `/order-product/${recordId}`]);
    },
    createOrderProduct(payload) {
      return requestWithFallback(['/order-products', '/order-product'], {
        method: 'POST',
        body: payload
      });
    },
    updateOrderProduct(recordId, payload) {
      return requestWithFallback([`/order-products/${recordId}`, `/order-product/${recordId}`], {
        method: 'PUT',
        body: payload
      });
    },
    createOrderProductIngredient(payload) {
      return requestWithFallback(['/order-product-ingredients', '/order-product-ingredient'], {
        method: 'POST',
        body: payload
      });
    },
    getOrderProductIngredients() {
      return request('/order-product-ingredients');
    },
    getOrderProductIngredientById(recordId) {
      return requestWithFallback([`/order-product-ingredients/${recordId}`, `/order-product-ingredient/${recordId}`]);
    }
  };

  window.FOODSTACK_API = api;
  window.FOODSTACK_RUNTIME = {
    ...RUNTIME_CONFIG,
    readAuthToken: readAuthToken,
    clearAuthToken: clearAuthToken,
    saveAuthToken: saveAuthToken
  };
})();
