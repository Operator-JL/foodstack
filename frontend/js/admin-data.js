(function () {
  const ADMIN_SESSION_KEY = 'foodstack-admin-session';
  const KNOWN_STAFF_ROLES = new Set(['admin', 'staff', 'manager']);
  const REAL_CATALOG_CATEGORY_MAP = {
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

    const normalized = normalizeText(value).toLowerCase();
    return normalized !== '0' && normalized !== 'false' && normalized !== 'inactive';
  }

  function normalizeOrderStatus(value) {
    const status = normalizeText(value).toLowerCase();
    return status || 'pending';
  }

  function parseDateSafe(value) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function toIsoSafe(value) {
    const parsed = parseDateSafe(value);
    return parsed ? parsed.toISOString() : null;
  }

  function roleIsStaff(role) {
    return KNOWN_STAFF_ROLES.has(normalizeText(role).toLowerCase());
  }

  function normalizeCatalogCategoryName(value) {
    const normalized = normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const compact = normalized.replace(/[^a-z0-9]+/g, '');
    return (
      REAL_CATALOG_CATEGORY_MAP[compact] ||
      REAL_CATALOG_CATEGORY_MAP[normalized] ||
      ''
    );
  }

  function saveSession(user) {
    const payload = {
      user: user,
      signedAt: new Date().toISOString()
    };

    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
  }

  function readSession() {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && parsed.user ? parsed.user : null;
    } catch (error) {
      return null;
    }
  }

  function clearSession() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    const runtime = window.FOODSTACK_RUNTIME || {};
    if (typeof runtime.clearAuthToken === 'function') {
      runtime.clearAuthToken();
    }
  }

  function userDisplayName(user) {
    const first = normalizeText(user && user.name);
    const last = normalizeText(user && user.lastname);
    const full = `${first} ${last}`.trim();

    return full || normalizeText(user && user.email) || 'Unknown customer';
  }

  function normalizeCategory(item) {
    const name = normalizeCatalogCategoryName(item && item.name);
    return {
      id: normalizeText(item && item.id),
      name: name,
      status: normalizeBoolean(item && item.status)
    };
  }

  function normalizeProduct(item, categoryMap) {
    const categoryId = normalizeText(item && item.category_id);
    const apiCategoryName = normalizeText(item && item.category_name);
    const embeddedCategoryName =
      item && item.category && typeof item.category === 'object'
        ? normalizeText(item.category.name)
        : '';
    const fallbackCategoryName = normalizeCatalogCategoryName(categoryMap.get(categoryId));
    const categoryName =
      normalizeCatalogCategoryName(apiCategoryName) ||
      normalizeCatalogCategoryName(embeddedCategoryName) ||
      normalizeCatalogCategoryName(
        normalizeText(item && (item.category_name || item.categoryName || item.category))
      ) ||
      fallbackCategoryName ||
      'Uncategorized';

    const rawStock = item && item.stock;
    const stockParsed = Number(rawStock);
    const stock =
      Number.isFinite(stockParsed) && String(rawStock).trim() !== ''
        ? stockParsed
        : null;

    return {
      id: normalizeText(item && item.id),
      name: normalizeText(item && item.name) || 'Unnamed product',
      category: categoryName,
      categoryId: categoryId,
      price: normalizeNumber(item && item.price),
      stock: stock,
      image: normalizeText(item && item.image),
      description: normalizeText(item && item.description),
      status: normalizeBoolean(item && item.status),
      createdAt: toIsoSafe(item && item.created_at),
      raw: item
    };
  }

  function normalizeUser(item) {
    return {
      id: normalizeText(item && item.id),
      name: normalizeText(item && item.name),
      lastname: normalizeText(item && item.lastname),
      email: normalizeText(item && item.email),
      phoneNumber: normalizeText(item && item.phoneNumber),
      role: normalizeText(item && item.role),
      status: normalizeBoolean(item && item.status),
      createdAt: toIsoSafe(item && item.created_at),
      raw: item
    };
  }

  function normalizeOrder(item) {
    const idText = normalizeText(item && item.id);
    const idNumber = Number(idText);
    const normalizedId = Number.isFinite(idNumber) ? String(idNumber) : idText;

    return {
      id: normalizedId,
      displayId: normalizedId ? `ORD-${normalizedId}` : 'ORD-UNKNOWN',
      userId: normalizeText(item && item.user_id),
      total: normalizeNumber(item && item.total),
      status: normalizeOrderStatus(item && item.status),
      createdAt: toIsoSafe(item && (item.datetime || item.created_at)),
      raw: item
    };
  }

  function normalizeStaffUser(item) {
    return {
      id: normalizeText(item && item.id),
      name: userDisplayName(item),
      role: normalizeText(item && item.role).toLowerCase(),
      email: normalizeText(item && item.email)
    };
  }

  function normalizeOrderProduct(item) {
    return {
      id: normalizeText(item && item.id),
      orderId: normalizeText(item && item.order_id),
      productId: normalizeText(item && item.product_id),
      quantity: Math.max(0, Math.floor(normalizeNumber(item && item.quantity))),
      price: normalizeNumber(item && item.price),
      status: normalizeBoolean(item && item.status),
      createdAt: toIsoSafe(item && item.created_at),
      raw: item
    };
  }

  function normalizeIngredient(item) {
    return {
      id: normalizeText(item && item.id),
      name: normalizeText(item && item.name),
      extraPrice: normalizeNumber(item && item.extra_price),
      status: normalizeBoolean(item && item.status)
    };
  }

  function normalizeProductIngredient(item) {
    return {
      id: normalizeText(item && item.id),
      productId: normalizeText(item && item.product_id),
      ingredientId: normalizeText(item && item.ingredient_id),
      maxIngredients: normalizeNumber(item && item.max_ingredients),
      defaultIngredients: normalizeBoolean(item && item.default_ingredients),
      status: normalizeBoolean(item && item.status)
    };
  }

  function sortByNewest(items) {
    return items.slice().sort((a, b) => {
      const dateA = parseDateSafe(a && a.createdAt);
      const dateB = parseDateSafe(b && b.createdAt);
      const scoreA = dateA ? dateA.getTime() : 0;
      const scoreB = dateB ? dateB.getTime() : 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return normalizeText(b && b.id).localeCompare(normalizeText(a && a.id));
    });
  }

  function calculateSummary(products, orders) {
    const estimatedRevenue = orders.reduce(
      (sum, item) => sum + normalizeNumber(item && item.total),
      0
    );

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      estimatedRevenue: estimatedRevenue
    };
  }

  function buildBestSellers(orderProducts, productMap) {
    const aggregate = new Map();

    orderProducts.forEach((item) => {
      if (!item.status) {
        return;
      }

      const key = normalizeText(item.productId);

      if (!key) {
        return;
      }

      const quantity = Math.max(0, normalizeNumber(item.quantity));
      const lineRevenue = quantity * normalizeNumber(item.price);
      const current = aggregate.get(key) || {
        productId: key,
        units: 0,
        revenue: 0
      };

      current.units += quantity;
      current.revenue += lineRevenue;
      aggregate.set(key, current);
    });

    return Array.from(aggregate.values())
      .sort((a, b) => {
        if (a.units !== b.units) {
          return b.units - a.units;
        }

        return b.revenue - a.revenue;
      })
      .slice(0, 6)
      .map((item) => {
        const product = productMap.get(item.productId);

        return {
          id: item.productId,
          name: product ? product.name : `Product #${item.productId}`,
          units: item.units,
          revenue: item.revenue
        };
      });
  }

  function buildRecentOrders(orders, userMap) {
    return sortByNewest(orders)
      .slice(0, 8)
      .map((item) => {
        const user = userMap.get(item.userId);

        return {
          id: item.displayId,
          customer: user ? userDisplayName(user) : `User #${item.userId || 'N/A'}`,
          total: item.total,
          status: item.status,
          createdAt: item.createdAt
        };
      });
  }

  function buildOrdersBoard(orders, orderProducts, userMap, productMap, options) {
    const config = options || {};
    const ordersEndpointHealthy = Boolean(config.ordersEndpointHealthy);
    const groupedLines = new Map();

    orderProducts.forEach((line) => {
      const orderId = normalizeText(line && line.orderId);

      if (!orderId) {
        return;
      }

      const current = groupedLines.get(orderId) || [];
      current.push(line);
      groupedLines.set(orderId, current);
    });

    if (ordersEndpointHealthy && Array.isArray(orders) && orders.length) {
      return sortByNewest(orders).slice(0, 30).map((order) => {
        const lines = groupedLines.get(order.id) || [];
        const itemCount = lines.reduce((sum, line) => sum + normalizeNumber(line.quantity), 0);
        const productNames = lines
          .slice(0, 3)
          .map((line) => {
            const product = productMap.get(line.productId);
            return product ? product.name : `Product #${line.productId}`;
          })
          .join(', ');
        const customer = userMap.get(order.userId);

        return {
          orderRef: order.displayId,
          orderId: order.id,
          customer: customer ? userDisplayName(customer) : `User #${order.userId || 'N/A'}`,
          status: order.status || 'pending',
          total: order.total,
          itemCount: itemCount,
          productsSummary: productNames || 'No line items found',
          createdAt: order.createdAt,
          source: 'orders+order-products'
        };
      });
    }

    return Array.from(groupedLines.entries())
      .map(([orderId, lines]) => {
        const itemCount = lines.reduce((sum, line) => sum + normalizeNumber(line.quantity), 0);
        const total = lines.reduce(
          (sum, line) => sum + normalizeNumber(line.price) * normalizeNumber(line.quantity),
          0
        );
        const createdAt = lines
          .map((line) => parseDateSafe(line.createdAt))
          .filter(Boolean)
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const productNames = lines
          .slice(0, 3)
          .map((line) => {
            const product = productMap.get(line.productId);
            return product ? product.name : `Product #${line.productId}`;
          })
          .join(', ');

        return {
          orderRef: `ORD-${orderId}`,
          orderId: orderId,
          customer: 'Unknown (orders endpoint unavailable)',
          status: 'unknown',
          total: total,
          itemCount: itemCount,
          productsSummary: productNames || 'No products listed',
          createdAt: createdAt ? createdAt.toISOString() : null,
          source: 'order-products-only'
        };
      })
      .sort((a, b) => {
        const aTime = parseDateSafe(a.createdAt);
        const bTime = parseDateSafe(b.createdAt);
        const aScore = aTime ? aTime.getTime() : 0;
        const bScore = bTime ? bTime.getTime() : 0;
        return bScore - aScore;
      })
      .slice(0, 30);
  }

  function buildProductsForDashboard(products) {
    return products.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      stock: item.stock
    }));
  }

  function buildQuickStats(orders, products) {
    const now = new Date();
    const sameDay = (value) => {
      const parsed = parseDateSafe(value);

      if (!parsed) {
        return false;
      }

      return (
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate()
      );
    };

    const todayOrders = orders.filter((order) => sameDay(order.createdAt));
    const pendingOrders = orders.filter((order) => {
      return order.status === 'pending' || order.status === 'preparing';
    });

    const hasStockInApi = products.some((item) => Number.isFinite(Number(item.stock)));
    const lowStockItems = hasStockInApi
      ? products.filter((item) => Number(item.stock) <= 30).length
      : 'N/A';

    return {
      ordersToday: todayOrders.length,
      pendingOrders: pendingOrders.length,
      revenueToday: todayOrders.reduce((sum, order) => sum + order.total, 0),
      lowStockItems: lowStockItems
    };
  }

  function buildAnalyticsPreview(orders) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const buckets = [];

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      buckets.push({
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: 0,
        revenue: 0
      });
    }

    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    orders.forEach((order) => {
      const parsed = parseDateSafe(order.createdAt);

      if (!parsed) {
        return;
      }

      const key = parsed.toISOString().slice(0, 10);
      const bucket = byKey.get(key);

      if (!bucket) {
        return;
      }

      bucket.orders += 1;
      bucket.revenue += order.total;
    });

    return buckets;
  }

  function buildRecentActivity(orders, products, ingredients, productIngredients) {
    const activities = [];

    sortByNewest(orders)
      .slice(0, 4)
      .forEach((order) => {
        const status = order.status || 'pending';
        activities.push({
          id: `ORDER-${order.id}`,
          title: `Order ${order.displayId}`,
          detail: `Status: ${status}. Total: $${order.total.toFixed(2)}.`,
          level: status === 'completed' ? 'info' : status === 'pending' ? 'warning' : 'neutral',
          createdAt: order.createdAt
        });
      });

    activities.push({
      id: 'CATALOG-SUMMARY',
      title: 'Catalog sync',
      detail: `${products.length} products and ${ingredients.length} ingredients loaded from API.`,
      level: 'info',
      createdAt: new Date().toISOString()
    });

    activities.push({
      id: 'REL-SUMMARY',
      title: 'Product-ingredient links',
      detail: `${productIngredients.length} product-ingredient relations available.`,
      level: 'neutral',
      createdAt: new Date().toISOString()
    });

    return activities.slice(0, 8);
  }

  async function fetchListWithFallback(loader, label) {
    try {
      const raw = await loader();

      return {
        items: Array.isArray(raw) ? raw : [],
        warning: null
      };
    } catch (error) {
      return {
        items: [],
        warning: `${label}: ${
          error instanceof Error ? error.message : 'Unexpected API error.'
        }`
      };
    }
  }

  async function loadBaseData() {
    const api = window.FOODSTACK_API;

    const fallbackResult = {
      items: [],
      warning: 'API client is not available.'
    };

    const [
      categoriesResult,
      productsResult,
      usersResult,
      ordersResult,
      orderProductsResult,
      ingredientsResult,
      productIngredientsResult
    ] = api
      ? await Promise.all([
          fetchListWithFallback(() => api.getCategories(), 'Categories endpoint failed'),
          fetchListWithFallback(() => api.getProducts(), 'Products endpoint failed'),
          fetchListWithFallback(() => api.getUsers(), 'Users endpoint failed'),
          fetchListWithFallback(() => api.getOrders(), 'Orders endpoint failed'),
          fetchListWithFallback(
            () => api.getOrderProducts(),
            'Order-products endpoint failed'
          ),
          fetchListWithFallback(() => api.getIngredients(), 'Ingredients endpoint failed'),
          fetchListWithFallback(
            () => api.getProductIngredients(),
            'Product-ingredients endpoint failed'
          )
        ])
      : [
          fallbackResult,
          fallbackResult,
          fallbackResult,
          fallbackResult,
          fallbackResult,
          fallbackResult,
          fallbackResult
        ];

    const endpointStatus = {
      orders: !ordersResult.warning,
      orderProducts: !orderProductsResult.warning
    };

    const warnings = [
      categoriesResult.warning,
      productsResult.warning,
      usersResult.warning,
      ordersResult.warning,
      orderProductsResult.warning,
      ingredientsResult.warning,
      productIngredientsResult.warning
    ].filter(Boolean);
    const dedupedWarnings = Array.from(new Set(warnings));

    const seenCategoryNames = new Set();
    let categories = categoriesResult.items
      .map(normalizeCategory)
      .filter((item) => item.status && item.name)
      .filter((item) => {
        if (seenCategoryNames.has(item.name)) {
          return false;
        }
        seenCategoryNames.add(item.name);
        return true;
      });

    const categoryMap = new Map(categories.map((item) => [item.id, item.name]));

    let products = productsResult.items
      .map((item) => normalizeProduct(item, categoryMap))
      .filter((item) => item.status);

    const uncategorizedCount = products.filter(
      (item) => normalizeText(item.category).toLowerCase() === 'uncategorized'
    ).length;
    if (uncategorizedCount > 0) {
      warnings.push(
        `${uncategorizedCount} active product(s) use invalid or missing catalog categories.`
      );
    }

    let users = usersResult.items
      .map(normalizeUser)
      .filter((item) => item.status);

    let orders = ordersResult.items
      .map(normalizeOrder)
      .filter((item) => item.id);

    let orderProducts = orderProductsResult.items
      .map(normalizeOrderProduct)
      .filter((item) => item.id);

    let ingredients = ingredientsResult.items
      .map(normalizeIngredient)
      .filter((item) => item.status);

    let productIngredients = productIngredientsResult.items
      .map(normalizeProductIngredient)
      .filter((item) => item.status);

    return {
      categories: categories,
      products: products,
      users: users,
      orders: orders,
      orderProducts: orderProducts,
      ingredients: ingredients,
      productIngredients: productIngredients,
      warnings: Array.from(new Set(dedupedWarnings.concat(warnings))),
      endpointStatus: endpointStatus
    };
  }

  async function authenticateStaff(credentials) {
    const api = window.FOODSTACK_API;

    if (!api) {
      return {
        ok: false,
        message: 'API client is not available.'
      };
    }

    const email = normalizeText(credentials && credentials.email).toLowerCase();
    const password = normalizeText(credentials && credentials.password);

    if (!email || !password) {
      return {
        ok: false,
        message: 'Email and password are required.'
      };
    }

    try {
      const response = await api.login({
        email: email,
        password: password
      });

      const user =
        response && typeof response === 'object'
          ? response.user || response.data || null
          : null;

      if (!user || typeof user !== 'object') {
        return {
          ok: false,
          message: 'Login response did not include user data.'
        };
      }

      if (!roleIsStaff(user.role)) {
        return {
          ok: false,
          message: 'This account does not have staff access.'
        };
      }

      const normalizedStaff = normalizeStaffUser(user);
      saveSession(normalizedStaff);

      return {
        ok: true,
        user: normalizedStaff
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unable to sign in.'
      };
    }
  }

  async function verifyStaffSession() {
    const api = window.FOODSTACK_API;
    if (!api || typeof api.getSession !== 'function') {
      clearSession();
      return {
        ok: false,
        message: 'Session API is not available.'
      };
    }

    try {
      const user = await api.getSession();
      if (!user || typeof user !== 'object') {
        clearSession();
        return {
          ok: false,
          message: 'Session did not return user data.'
        };
      }

      if (!roleIsStaff(user.role)) {
        clearSession();
        return {
          ok: false,
          message: 'This account does not have staff access.'
        };
      }

      const normalizedStaff = normalizeStaffUser(user);
      saveSession(normalizedStaff);
      return {
        ok: true,
        user: normalizedStaff
      };
    } catch (error) {
      clearSession();
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Session validation failed.'
      };
    }
  }

  async function loadDashboardSnapshot() {
    const base = await loadBaseData();
    const productMap = new Map(base.products.map((item) => [item.id, item]));
    const userMap = new Map(base.users.map((item) => [item.id, item]));
    const ordersBoard = buildOrdersBoard(
      base.orders,
      base.orderProducts,
      userMap,
      productMap,
      {
        ordersEndpointHealthy: base.endpointStatus && base.endpointStatus.orders
      }
    );

    return {
      summary: calculateSummary(base.products, base.orders),
      bestSellers: buildBestSellers(base.orderProducts, productMap),
      recentOrders: buildRecentOrders(base.orders, userMap),
      products: buildProductsForDashboard(base.products),
      warnings: base.warnings,
      ordersBoard: ordersBoard,
      orderCapabilities: {
        canReadOrders: Boolean(base.endpointStatus && base.endpointStatus.orders),
        canReadOrderProducts: Boolean(
          base.endpointStatus && base.endpointStatus.orderProducts
        ),
        canUpdateOrderStatus: Boolean(
          window.FOODSTACK_API &&
            typeof window.FOODSTACK_API.updateOrder === 'function' &&
            base.endpointStatus &&
            base.endpointStatus.orders
        )
      }
    };
  }

  async function updateOrderStatus(orderId, status) {
    const api = window.FOODSTACK_API;
    const normalizedOrderId = normalizeText(orderId);
    const normalizedStatus = normalizeOrderStatus(status);

    if (!api || typeof api.updateOrder !== 'function') {
      return {
        ok: false,
        message: 'Order status endpoint is not available.'
      };
    }

    if (!normalizedOrderId) {
      return {
        ok: false,
        message: 'Order id is required to update status.'
      };
    }

    try {
      await api.updateOrder(normalizedOrderId, {
        status: normalizedStatus
      });

      return {
        ok: true,
        status: normalizedStatus
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not update order status.'
      };
    }
  }

  async function loadStaffHomeSnapshot() {
    const base = await loadBaseData();

    return {
      quickStats: buildQuickStats(base.orders, base.products),
      quickActions: [
        {
          key: 'review-menu',
          title: 'Review menu',
          description: 'Verify product names, prices, and categories.',
          href: 'menu.html'
        },
        {
          key: 'latest-orders',
          title: 'Check latest orders',
          description: 'Open the latest order stream and status queue.',
          href: 'admin-dashboard.html#recent-orders-panel'
        },
        {
          key: 'manage-orders',
          title: 'Manage orders',
          description: 'Go to detailed order management and fulfillment view.',
          href: 'admin-dashboard.html#recent-orders-panel'
        }
      ],
      recentActivity: buildRecentActivity(
        base.orders,
        base.products,
        base.ingredients,
        base.productIngredients
      ),
      analyticsPreview: buildAnalyticsPreview(base.orders),
      warnings: base.warnings
    };
  }

  window.FOODSTACK_ADMIN_API = {
    authenticateStaff: authenticateStaff,
    verifyStaffSession: verifyStaffSession,
    saveSession: saveSession,
    readSession: readSession,
    clearSession: clearSession,
    loadDashboardSnapshot: loadDashboardSnapshot,
    loadStaffHomeSnapshot: loadStaffHomeSnapshot,
    updateOrderStatus: updateOrderStatus
  };
})();
