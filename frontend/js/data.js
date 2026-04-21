(function () {
  const CART_STORAGE_KEY = 'foodstack-cart';
  const FALLBACK_PRODUCT_IMAGE = 'assets/images/logo-foodstack.png';
  const REAL_CATALOG_ORDER = ['Burgers', 'Tacos', 'Burritos', 'Drinks', 'Sides'];
  const PRODUCT_IMAGE_EXTENSIONS = ['svg', 'png', 'jpg'];
  const CATEGORY_IMAGE_EXTENSIONS = ['png', 'jpg', 'svg'];
  const PRODUCT_SLUG_ALIASES = {
    'double-stack-burger': ['double-burger'],
    'double-burger': ['double-stack-burger'],
    'stack-burger': ['double-burger'],
    'curly-fries': ['fries'],
    fries: ['curly-fries'],
    'taco-supreme': ['taco-classic'],
    'chicken-taco': ['taco-chicken'],
    'classic-taco': ['taco-classic'],
    'spicy-taco': ['taco-spicy'],
    'beef-burrito': ['spicy-beef-burrito'],
    'spicy-beef-burrito': ['beef-burrito']
  };

  const state = {
    products: [],
    categories: [],
    catalogLoaded: false,
    lastError: '',
    lastWarning: '',
    catalogSource: 'none'
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

  function normalizeSlug(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function normalizeCategoryName(value) {
    const slug = normalizeSlug(value);
    const mapping = {
      burger: 'Burgers',
      burgers: 'Burgers',
      taco: 'Tacos',
      tacos: 'Tacos',
      burrito: 'Burritos',
      burritos: 'Burritos',
      drink: 'Drinks',
      drinks: 'Drinks',
      side: 'Sides',
      sides: 'Sides'
    };
    return mapping[slug] || '';
  }

  function categoryToFolder(value) {
    const canonical = normalizeCategoryName(value);
    if (!canonical) {
      return '';
    }
    return canonical.toLowerCase();
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
    const apiCategoryName = normalizeCategoryName(product && product.category_name);
    if (apiCategoryName) {
      return apiCategoryName;
    }

    if (product && product.category && typeof product.category === 'object') {
      const embeddedName = normalizeCategoryName(product.category.name);
      if (embeddedName) {
        return embeddedName;
      }
    }

    const explicitCategory =
      product && typeof product.category === 'string' ? product.category : '';
    const explicitName = normalizeCategoryName(
      product && (product.category_name || product.categoryName || explicitCategory)
    );

    if (explicitName) {
      return explicitName;
    }

    const byId = normalizeCategoryName(categoryMap.get(String(product && product.category_id)));
    if (byId) {
      return byId;
    }

    return 'Uncategorized';
  }

  function pushUnique(list, value) {
    const item = normalizeText(value);
    if (!item) {
      return;
    }
    if (!list.includes(item)) {
      list.push(item);
    }
  }

  function buildSlugCandidates(product) {
    const candidates = [];
    const primarySlug = normalizeSlug(product && product.name);
    pushUnique(candidates, primarySlug);

    const aliases = PRODUCT_SLUG_ALIASES[primarySlug] || [];
    aliases.forEach((alias) => pushUnique(candidates, normalizeSlug(alias)));

    const imageValue = normalizeText(product && product.image);
    if (imageValue) {
      const maybeFile = imageValue.split('/').pop() || '';
      const fromImage = normalizeSlug(maybeFile.replace(/\.[A-Za-z0-9]+$/, ''));
      pushUnique(candidates, fromImage);
    }

    return candidates;
  }

  function buildImageCandidates(product) {
    const candidates = [];
    const imageFromApi = normalizeText(product && product.image);
    if (imageFromApi) {
      pushUnique(candidates, imageFromApi);
    }

    const slugCandidates = buildSlugCandidates(product);
    const categoryFolder = categoryToFolder(
      product && (product.category || product.category_name)
    );

    slugCandidates.forEach((slug) => {
      PRODUCT_IMAGE_EXTENSIONS.forEach((ext) => {
        pushUnique(candidates, `assets/images/products/${slug}.${ext}`);
      });
    });

    if (categoryFolder) {
      slugCandidates.forEach((slug) => {
        CATEGORY_IMAGE_EXTENSIONS.forEach((ext) => {
          pushUnique(candidates, `assets/images/${categoryFolder}/${slug}.${ext}`);
        });
      });
    }

    pushUnique(candidates, FALLBACK_PRODUCT_IMAGE);
    return candidates;
  }

  function resolveProductImage(product) {
    const candidates = buildImageCandidates(product);
    return {
      src: candidates[0] || FALLBACK_PRODUCT_IMAGE,
      candidates: candidates
    };
  }

  function bindProductImage(imageNode, product) {
    if (!imageNode) {
      return;
    }

    const resolved = resolveProductImage(product);
    const candidates = resolved.candidates.slice();
    let index = 0;

    imageNode.src = candidates[index] || FALLBACK_PRODUCT_IMAGE;

    imageNode.onerror = () => {
      index += 1;
      if (index >= candidates.length) {
        imageNode.onerror = null;
        imageNode.src = FALLBACK_PRODUCT_IMAGE;
        return;
      }
      imageNode.src = candidates[index];
    };
  }

  function mapProduct(rawProduct, categoryMap) {
    const id = normalizeText(rawProduct && rawProduct.id);

    if (!id) {
      return null;
    }

    const category = mapCategoryName(rawProduct, categoryMap);
    const normalized = {
      id: id,
      name: normalizeText(rawProduct && rawProduct.name) || 'Unnamed product',
      price: normalizeNumber(rawProduct && rawProduct.price),
      category: category,
      description:
        normalizeText(rawProduct && rawProduct.description) || 'No description available.',
      image: normalizeText(rawProduct && rawProduct.image),
      categoryId: normalizeText(rawProduct && rawProduct.category_id),
      ingredientLinks: Math.max(0, Math.floor(normalizeNumber(rawProduct && rawProduct.ingredient_links))),
      ingredients: Array.isArray(rawProduct && rawProduct.ingredients)
        ? rawProduct.ingredients.slice()
        : [],
      status: normalizeBoolean(rawProduct && rawProduct.status),
      raw: rawProduct
    };

    normalized.resolvedImage = resolveProductImage(normalized).src;
    return normalized;
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

  function getCatalogWarning() {
    return state.lastWarning;
  }

  function getCatalogSource() {
    return state.catalogSource;
  }

  function isCatalogLoaded() {
    return state.catalogLoaded;
  }

  async function loadCatalog(forceRefresh) {
    if (!forceRefresh && state.catalogLoaded) {
      return {
        categories: getCategories(),
        products: getProducts(),
        source: state.catalogSource,
        warning: state.lastWarning
      };
    }

    if (!forceRefresh && catalogPromise) {
      return catalogPromise;
    }

    catalogPromise = (async () => {
      if (!hasApiClient()) {
        throw new Error('API client is not available.');
      }

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
          name: normalizeCategoryName(item && item.name)
        }))
        .filter((item) => item.id && item.name);

      const categoryMap = new Map(
        normalizedCategories.map((item) => [String(item.id), item.name])
      );

      const normalizedProducts = products
        .filter((item) => normalizeBoolean(item && item.status))
        .map((item) => mapProduct(item, categoryMap))
        .filter(Boolean);

      const detectedCategoryNames = unique(
        normalizedCategories
          .map((item) => item.name)
          .concat(normalizedProducts.map((item) => item.category))
          .map(normalizeCategoryName)
          .filter(Boolean)
      );
      const categorySet = new Set(detectedCategoryNames);
      const categoryNames = REAL_CATALOG_ORDER.slice();
      const missingCategories = REAL_CATALOG_ORDER.filter((name) => !categorySet.has(name));

      state.categories = categoryNames;
      state.products = normalizedProducts;
      state.catalogLoaded = true;
      state.lastError = '';
      state.lastWarning = missingCategories.length
        ? `API is missing active catalog categories: ${missingCategories.join(', ')}.`
        : '';
      state.catalogSource = 'api';

      pruneInvalidCartItems();

      return {
        categories: getCategories(),
        products: getProducts(),
        source: 'api',
        warning: state.lastWarning
      };
    })()
      .catch((error) => {
        state.catalogLoaded = false;
        state.lastError = error instanceof Error ? error.message : String(error);
        state.lastWarning = '';
        state.catalogSource = 'none';
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
    getCatalogWarning: getCatalogWarning,
    getCatalogSource: getCatalogSource,
    getCategories: getCategories,
    getProducts: getProducts,
    byCategory: byCategory,
    findProduct: findProduct,
    readCart: readCart,
    writeCart: writeCart,
    clearCart: clearCart,
    addToCart: addToCart,
    cartCount: cartCount,
    money: money,
    resolveProductImage: resolveProductImage,
    bindProductImage: bindProductImage
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
