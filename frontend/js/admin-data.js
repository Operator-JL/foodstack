(function () {
  const ADMIN_SESSION_KEY = 'foodstack-admin-session';

  const DEMO_STAFF = [
    {
      id: 'staff-001',
      name: 'FoodStack Manager',
      role: 'admin',
      email: 'staff@foodstack.com',
      password: 'admin1234'
    }
  ];

  const MOCK_PRODUCTS = [
    { id: 'stack-burger', name: 'Stack Burger', category: 'Burgers', price: 8.99, stock: 42 },
    { id: 'double-burger', name: 'Double Burger', category: 'Burgers', price: 10.99, stock: 31 },
    { id: 'bbq-bacon-burger', name: 'BBQ Bacon Burger', category: 'Burgers', price: 11.49, stock: 27 },
    { id: 'spicy-burger', name: 'Spicy Burger', category: 'Burgers', price: 9.99, stock: 34 },
    { id: 'burrito-stack', name: 'Burrito Stack', category: 'Burritos', price: 7.99, stock: 55 },
    { id: 'chicken-burrito', name: 'Chicken Burrito', category: 'Burritos', price: 8.49, stock: 47 },
    { id: 'veggie-burrito', name: 'Veggie Burrito', category: 'Burritos', price: 7.59, stock: 39 },
    { id: 'spicy-beef-burrito', name: 'Spicy Beef Burrito', category: 'Burritos', price: 8.99, stock: 24 },
    { id: 'taco-supreme', name: 'Taco Supreme', category: 'Tacos', price: 6.99, stock: 44 },
    { id: 'classic-taco', name: 'Classic Taco', category: 'Tacos', price: 5.99, stock: 52 },
    { id: 'chicken-taco', name: 'Chicken Taco', category: 'Tacos', price: 6.49, stock: 41 },
    { id: 'spicy-taco', name: 'Spicy Taco', category: 'Tacos', price: 6.79, stock: 36 },
    { id: 'fries', name: 'Fries', category: 'Sides', price: 3.49, stock: 90 },
    { id: 'onion-rings', name: 'Onion Rings', category: 'Sides', price: 4.29, stock: 63 },
    { id: 'nachos', name: 'Nachos', category: 'Sides', price: 4.99, stock: 58 },
    { id: 'cheese-bites', name: 'Cheese Bites', category: 'Sides', price: 4.79, stock: 50 },
    { id: 'soda', name: 'Soda', category: 'Drinks', price: 2.49, stock: 120 },
    { id: 'lemonade', name: 'Lemonade', category: 'Drinks', price: 2.99, stock: 84 },
    { id: 'iced-tea', name: 'Iced Tea', category: 'Drinks', price: 2.89, stock: 80 },
    { id: 'milkshake', name: 'Milkshake', category: 'Drinks', price: 4.99, stock: 40 }
  ];

  const MOCK_RECENT_ORDERS = [
    { id: 'ORD-3094', customer: 'Ana Ruiz', total: 29.47, status: 'completed', createdAt: '2026-04-13T09:21:00Z' },
    { id: 'ORD-3093', customer: 'Jorge M.', total: 16.97, status: 'preparing', createdAt: '2026-04-13T09:16:00Z' },
    { id: 'ORD-3092', customer: 'Mariana L.', total: 41.84, status: 'completed', createdAt: '2026-04-13T08:58:00Z' },
    { id: 'ORD-3091', customer: 'Dylan S.', total: 12.98, status: 'pending', createdAt: '2026-04-13T08:47:00Z' },
    { id: 'ORD-3090', customer: 'Paola H.', total: 22.39, status: 'completed', createdAt: '2026-04-13T08:35:00Z' },
    { id: 'ORD-3089', customer: 'Carmen T.', total: 18.78, status: 'preparing', createdAt: '2026-04-13T08:22:00Z' }
  ];

  const MOCK_BEST_SELLERS = [
    { id: 'stack-burger', name: 'Stack Burger', units: 128, revenue: 1150.72 },
    { id: 'fries', name: 'Fries', units: 201, revenue: 701.49 },
    { id: 'chicken-burrito', name: 'Chicken Burrito', units: 104, revenue: 882.96 },
    { id: 'taco-supreme', name: 'Taco Supreme', units: 96, revenue: 671.04 }
  ];

  const MOCK_RECENT_ACTIVITY = [
    { id: 'ACT-101', title: 'Inventory alert', detail: 'Spicy Beef Burrito stock is below threshold.', level: 'warning', createdAt: '2026-04-13T09:24:00Z' },
    { id: 'ACT-102', title: 'Order completed', detail: 'Order ORD-3094 was marked completed.', level: 'info', createdAt: '2026-04-13T09:22:00Z' },
    { id: 'ACT-103', title: 'Menu update pending', detail: 'Review pricing adjustments for Drinks category.', level: 'neutral', createdAt: '2026-04-13T09:10:00Z' },
    { id: 'ACT-104', title: 'Shift reminder', detail: 'Lunch shift handoff starts at 11:30 AM.', level: 'neutral', createdAt: '2026-04-13T08:55:00Z' }
  ];

  const MOCK_ANALYTICS_PREVIEW = [
    { label: 'Mon', orders: 38, revenue: 412.3 },
    { label: 'Tue', orders: 44, revenue: 509.1 },
    { label: 'Wed', orders: 41, revenue: 476.8 },
    { label: 'Thu', orders: 53, revenue: 622.4 },
    { label: 'Fri', orders: 58, revenue: 718.9 },
    { label: 'Sat', orders: 47, revenue: 541.6 },
    { label: 'Sun', orders: 35, revenue: 398.2 }
  ];

  function cloneData(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  async function authenticateStaff(credentials) {
    const email = normalizeEmail(credentials && credentials.email);
    const password = String((credentials && credentials.password) || '');

    const match = DEMO_STAFF.find((staff) => {
      return normalizeEmail(staff.email) === email && staff.password === password;
    });

    if (!match) {
      return {
        ok: false,
        message: 'Invalid staff credentials.'
      };
    }

    return {
      ok: true,
      user: {
        id: match.id,
        name: match.name,
        role: match.role,
        email: match.email
      }
    };
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
  }

  function calculateSummary(products, orders) {
    const estimatedRevenue = orders.reduce((sum, item) => sum + Number(item.total || 0), 0);

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      estimatedRevenue: estimatedRevenue
    };
  }

  async function loadDashboardSnapshot() {
    const products = cloneData(MOCK_PRODUCTS);
    const recentOrders = cloneData(MOCK_RECENT_ORDERS);
    const bestSellers = cloneData(MOCK_BEST_SELLERS);

    return {
      summary: calculateSummary(products, recentOrders),
      bestSellers: bestSellers,
      recentOrders: recentOrders,
      products: products
    };
  }

  async function loadStaffHomeSnapshot() {
    const products = cloneData(MOCK_PRODUCTS);
    const recentOrders = cloneData(MOCK_RECENT_ORDERS);
    const recentActivity = cloneData(MOCK_RECENT_ACTIVITY);
    const ordersToday = recentOrders.length;
    const pendingOrders = recentOrders.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      return status === 'pending' || status === 'preparing';
    }).length;
    const revenueToday = recentOrders.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const lowStockItems = products.filter((item) => Number(item.stock || 0) <= 30).length;

    return {
      quickStats: {
        ordersToday: ordersToday,
        pendingOrders: pendingOrders,
        revenueToday: revenueToday,
        lowStockItems: lowStockItems
      },
      quickActions: [
        { key: 'review-menu', title: 'Review menu', description: 'Verify product names, prices, and categories.', href: 'menu.html' },
        { key: 'latest-orders', title: 'Check latest orders', description: 'Open the latest order stream and status queue.', href: 'admin-dashboard.html#recent-orders-panel' },
        { key: 'manage-orders', title: 'Manage orders', description: 'Go to detailed order management and fulfillment view.', href: 'admin-dashboard.html#recent-orders-panel' }
      ],
      recentActivity: recentActivity,
      analyticsPreview: cloneData(MOCK_ANALYTICS_PREVIEW)
    };
  }

  window.FOODSTACK_ADMIN_API = {
    demoCredentials: {
      email: DEMO_STAFF[0].email,
      password: DEMO_STAFF[0].password
    },
    authenticateStaff: authenticateStaff,
    saveSession: saveSession,
    readSession: readSession,
    clearSession: clearSession,
    loadDashboardSnapshot: loadDashboardSnapshot,
    loadStaffHomeSnapshot: loadStaffHomeSnapshot
  };
})();
