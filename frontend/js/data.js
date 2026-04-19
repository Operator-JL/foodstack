(function () {
  const CART_STORAGE_KEY = 'foodstack-cart';
  const FALLBACK_PRODUCT_IMAGE = 'assets/images/logo-foodstack.png';

  const state = {
    products: [],
    categories: [],
    catalogLoaded: false,
    lastError: ''
  };

  let catalogPromise = null;

  function hasApiClient() {
    return Boolean(window.FOODSTACK_API);
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = String(value || '').trim().toLowerCase();
    return normalized !== '0' && normalized !== 'false' && normalized !== 'inactive';
  }

  function normalizeCart(candidate) {
    if (!candidate || typeof candidate !== 'object') {
      return {};
    }

    const normalized = {};

    Object.entries(candidate).forEach(([id, qty]) => {
      const productId = String(id || '').trim();
      const amount = Math.floor(Number(qty));

      if (productId && amount > 0) {
        normalized[productId] = amount;
      }
    });

    return normalized;
  }

  function readCart() {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    try {
      return normalizeCart(JSON.parse(raw));
    } catch (error) {
      return {};
    }
  }

  function notifyCartChange() {
    window.dispatchEvent(new CustomEvent('foodstack:cart-updated'));
  }

  function writeCart(cart) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCart(cart)));
    notifyCartChange();
  }

  function clearCart() {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    notifyCartChange();
  }

  function addToCart(productId, amount) {
    const key = String(productId || '').trim();

    if (!key) {
      return readCart();
    }

    const cart = readCart();
    const current = Number(cart[key] || 0);
    const next = Math.max(0, current + Number(amount || 0));

    if (next === 0) {
      delete cart[key];
    } else {
      cart[key] = next;
    }

    writeCart(cart);
    return cart;
  }

  function cartCount() {
    const cart = readCart();
    return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  function findProduct(productId) {
    const key = String(productId || '').trim();
    return state.products.find((item) => String(item.id) === key) || null;
  }

  function pruneInvalidCartItems() {
    const cart = readCart();
    let changed = false;

    Object.keys(cart).forEach((id) => {
      if (!findProduct(id)) {
        delete cart[id];
        changed = true;
      }
    });

    if (changed) {
      writeCart(cart);
    }
  }

  function byCategory(category) {
    if (!category || category === 'All') {
      return state.products.slice();
    }

    return state.products.filter((item) => item.category === category);
  }

  function money(value) {
    return '$' + normalizeNumber(value).toFixed(2);
  }

  function mapCategoryName(product, categoryMap) {
    if (product && product.category && typeof product.category === 'object') {
      const embeddedName = normalizeText(product.category.name);

      if (embeddedName) {
        return embeddedName;
      }
    }

    const explicitCategory =
      product && typeof product.category === 'string' ? product.category : '';
    const explicitName = normalizeText(
      product && (product.category_name || product.categoryName || explicitCategory)
    );

    if (explicitName) {
      return explicitName;
    }

    const byId = categoryMap.get(String(product && product.category_id));

    if (byId) {
      return byId;
    }

    return 'Uncategorized';
  }

  function mapProduct(rawProduct, categoryMap) {
    const id = normalizeText(rawProduct && rawProduct.id);

    if (!id) {
      return null;
    }

    return {
      id: id,
      name: normalizeText(rawProduct && rawProduct.name) || 'Unnamed product',
      price: normalizeNumber(rawProduct && rawProduct.price),
      category: mapCategoryName(rawProduct, categoryMap),
      description:
        normalizeText(rawProduct && rawProduct.description) || 'No description available.',
      image: normalizeText(rawProduct && rawProduct.image) || FALLBACK_PRODUCT_IMAGE,
      categoryId: normalizeText(rawProduct && rawProduct.category_id),
      ingredients: Array.isArray(rawProduct && rawProduct.ingredients)
        ? rawProduct.ingredients.slice()
        : [],
      status: normalizeBoolean(rawProduct && rawProduct.status),
      raw: rawProduct
    };
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function getCategories() {
    return state.categories.slice();
  }

  function getProducts() {
    return state.products.slice();
  }

  function getCatalogError() {
    return state.lastError;
  }

  function isCatalogLoaded() {
    return state.catalogLoaded;
  }

  async function loadCatalog(forceRefresh) {
    if (!hasApiClient()) {
      const message = 'API client is not available.';
      state.catalogLoaded = false;
      state.lastError = message;
      throw new Error(message);
    }

    if (!forceRefresh && state.catalogLoaded) {
      return {
        categories: getCategories(),
        products: getProducts()
      };
    }

    if (!forceRefresh && catalogPromise) {
      return catalogPromise;
    }

    catalogPromise = (async () => {
      const api = window.FOODSTACK_API;
      const [categoriesResponse, productsResponse] = await Promise.all([
        api.getCategories(),
        api.getProducts()
      ]);

      const categories = Array.isArray(categoriesResponse) ? categoriesResponse : [];
      const products = Array.isArray(productsResponse) ? productsResponse : [];

      const normalizedCategories = categories
        .filter((item) => normalizeBoolean(item && item.status))
        .map((item) => ({
          id: normalizeText(item && item.id),
          name: normalizeText(item && item.name)
        }))
        .filter((item) => item.id && item.name);

      const categoryMap = new Map(
        normalizedCategories.map((item) => [String(item.id), item.name])
      );

      const normalizedProducts = products
        .filter((item) => normalizeBoolean(item && item.status))
        .map((item) => mapProduct(item, categoryMap))
        .filter(Boolean);

      const categoryNames = unique(
        normalizedCategories.map((item) => item.name).concat(
          normalizedProducts.map((item) => item.category)
        )
      ).filter(Boolean);

      state.categories = categoryNames;
      state.products = normalizedProducts;
      state.catalogLoaded = true;
      state.lastError = '';

      pruneInvalidCartItems();

      return {
        categories: getCategories(),
        products: getProducts()
      };
    })()
      .catch((error) => {
        state.catalogLoaded = false;
        state.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      })
      .finally(() => {
        catalogPromise = null;
      });

    return catalogPromise;
  }

  const publicApi = {
    loadCatalog: loadCatalog,
    isCatalogLoaded: isCatalogLoaded,
    getCatalogError: getCatalogError,
    getCategories: getCategories,
    getProducts: getProducts,
    byCategory: byCategory,
    findProduct: findProduct,
    readCart: readCart,
    writeCart: writeCart,
    clearCart: clearCart,
    addToCart: addToCart,
    cartCount: cartCount,
    money: money
  };

  Object.defineProperty(publicApi, 'categories', {
    enumerable: true,
    get: getCategories
  });

  Object.defineProperty(publicApi, 'products', {
    enumerable: true,
    get: getProducts
  });

  window.FOODSTACK_DATA = publicApi;
})();
