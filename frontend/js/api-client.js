(function () {
  const BASE_URL =
    'https://foodstack-api-jl-bjcrd6dfe3avgef2.westus3-01.azurewebsites.net/api';

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

  async function request(path, options) {
    const config = options || {};
    const method = String(config.method || 'GET').toUpperCase();
    const url = joinUrl(BASE_URL, path);
    const headers = {
      Accept: 'application/json',
      ...(config.headers || {})
    };

    if (config.body != null && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: method,
      headers: headers,
      credentials: 'include',
      body: config.body != null ? JSON.stringify(config.body) : undefined
    });

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw new Error(
        toErrorMessage(payload, `API request failed (${response.status}).`)
      );
    }

    if (payload && typeof payload === 'object' && Object.hasOwn(payload, 'status')) {
      if (Number(payload.status) !== 0) {
        throw new Error(toErrorMessage(payload, 'API returned an error response.'));
      }

      return Object.hasOwn(payload, 'data') ? payload.data : payload;
    }

    return payload;
  }

  async function requestFirst(paths, options) {
    const attempts = Array.isArray(paths) ? paths : [paths];
    let lastError = null;

    for (const path of attempts) {
      try {
        return await request(path, options);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No API route was available for this request.');
  }

  const api = {
    request: request,
    getUsers() {
      return request('/users');
    },
    getUserById(userId) {
      return requestFirst([`/users/${userId}`, `/user/${userId}`]);
    },
    createUser(payload) {
      return request('/user', { method: 'POST', body: payload });
    },
    updateUser(userId, payload) {
      return request(`/user/${userId}`, { method: 'PUT', body: payload });
    },
    login(payload) {
      return request('/login', { method: 'POST', body: payload });
    },
    getCategories() {
      return request('/categories');
    },
    getCategoryById(categoryId) {
      return requestFirst([`/categories/${categoryId}`, `/category/${categoryId}`]);
    },
    getProducts() {
      return request('/products');
    },
    getProductById(productId) {
      return requestFirst([`/products/${productId}`, `/product/${productId}`]);
    },
    createProduct(payload) {
      return request('/product', { method: 'POST', body: payload });
    },
    getIngredients() {
      return request('/ingredients');
    },
    getIngredientById(ingredientId) {
      return requestFirst([`/ingredients/${ingredientId}`, `/ingredient/${ingredientId}`]);
    },
    getProductIngredients() {
      return request('/product-ingredients');
    },
    getProductIngredientById(recordId) {
      return requestFirst([
        `/product-ingredients/${recordId}`,
        `/product-ingredient/${recordId}`
      ]);
    },
    getOrders() {
      return request('/orders');
    },
    getOrderById(orderId) {
      return requestFirst([`/orders/${orderId}`, `/order/${orderId}`]);
    },
    createOrder(payload) {
      return request('/order', { method: 'POST', body: payload });
    },
    getOrderProducts() {
      return request('/order-products');
    },
    getOrderProductById(recordId) {
      return requestFirst([`/order-products/${recordId}`, `/order-product/${recordId}`]);
    },
    createOrderProduct(payload) {
      return request('/order-product', { method: 'POST', body: payload });
    },
    getOrderProductIngredients() {
      return request('/order-product-ingredients');
    },
    getOrderProductIngredientById(recordId) {
      return requestFirst([
        `/order-product-ingredients/${recordId}`,
        `/order-product-ingredient/${recordId}`
      ]);
    }
  };

  window.FOODSTACK_API = api;
})();
