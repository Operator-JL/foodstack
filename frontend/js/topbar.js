document.addEventListener('DOMContentLoaded', () => {
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-5h4v5h5V9.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.2 10.2h11.1L20.2 8H7.1"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M10 12h10"/><path d="m16 8 4 4-4 4"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="4.5" rx="1.2"/><rect x="13" y="10.5" width="7" height="9.5" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/></svg>',
    staff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v6c0 4.2 2.8 7.5 7 9 4.2-1.5 7-4.8 7-9V6l-7-3z"/><path d="M9.3 12.2 11.2 14l3.6-3.6"/></svg>'
  };

  function parseJsonSafe(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readCustomerName() {
    const knownKeys = ['foodstack-user', 'user'];

    for (const key of knownKeys) {
      const raw = window.localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      const parsed = parseJsonSafe(raw);

      if (parsed && typeof parsed === 'object') {
        if (parsed.name) return parsed.name;
        if (parsed.username) return parsed.username;
        if (parsed.email) return parsed.email;
      }

      if (typeof parsed === 'string' && parsed.trim()) {
        return parsed.trim();
      }

      if (typeof raw === 'string' && raw.trim()) {
        return raw.trim();
      }
    }

    return 'Guest';
  }

  function readStaffName() {
    const raw = window.localStorage.getItem('foodstack-admin-session');

    if (!raw) {
      return 'Staff';
    }

    const parsed = parseJsonSafe(raw);
    const name = parsed && parsed.user && parsed.user.name;

    return name || 'Staff';
  }

  function hasStaffSession() {
    const raw = window.localStorage.getItem('foodstack-admin-session');

    if (!raw) {
      return false;
    }

    const parsed = parseJsonSafe(raw);
    return Boolean(parsed && parsed.user);
  }

  function renderIcon(name) {
    const icon = ICONS[name] || ICONS.menu;
    return `<span class="nav-icon" aria-hidden="true">${icon}</span>`;
  }

  function renderActionLabel(item) {
    return `
      <span class="pill-btn__inner">
        ${renderIcon(item.icon)}
        <span class="nav-label">${item.label}</span>
      </span>
    `;
  }

  function buildUserLinks(context) {
    const links = [
      { key: 'home', label: 'Home', href: 'home.html', variant: 'pill-btn--ghost', icon: 'home' },
      { key: 'menu', label: 'Menu', href: 'menu.html', variant: 'pill-btn--ghost', icon: 'menu' },
      { key: 'cart', label: 'Cart', href: 'cart.html', variant: 'pill-btn--soft', withCount: true, icon: 'cart' }
    ];

    const navLinks = links.map((item) => {
      const activeClass = item.key === context ? ' pill-btn--active' : '';
      const countMarkup = item.withCount ? ' <span class="badge-count" data-cart-count>0</span>' : '';
      return `
        <a class="pill-btn ${item.variant}${activeClass}" href="${item.href}">
          ${renderActionLabel(item)}${countMarkup}
        </a>
      `;
    }).join('');

    return `${navLinks}
      <a class="pill-btn pill-btn--ghost" href="login.html" data-logout>${renderActionLabel({ label: 'Logout', icon: 'logout' })}</a>`;
  }

  function buildAdminLinks(context) {
    const links = [
      { key: 'staff-home', label: 'Staff Home', href: 'staff-home.html', variant: 'pill-btn--soft', icon: 'staff' },
      { key: 'dashboard', label: 'Dashboard', href: 'admin-dashboard.html', variant: 'pill-btn--ghost', icon: 'dashboard' },
      { key: 'menu', label: 'Menu', href: 'menu.html', variant: 'pill-btn--ghost', icon: 'menu' }
    ];

    const navLinks = links.map((item) => {
      const activeClass = item.key === context ? ' pill-btn--active' : '';
      return `<a class="pill-btn ${item.variant}${activeClass}" href="${item.href}">${renderActionLabel(item)}</a>`;
    }).join('');

    return `${navLinks}
      <button class="pill-btn pill-btn--ghost" type="button" data-admin-logout>${renderActionLabel({ label: 'Logout', icon: 'logout' })}</button>`;
  }

  function renderTopbar(node) {
    const requestedMode = node.getAttribute('data-topbar-mode') || 'user';
    const mode = requestedMode === 'auto' && hasStaffSession() ? 'admin' : requestedMode;
    const context = node.getAttribute('data-topbar-context') || '';

    if (mode === 'admin') {
      const staffName = escapeHtml(readStaffName());

      node.innerHTML = `
        <a class="brand-link" href="staff-home.html" aria-label="FoodStack staff home">
          <img src="assets/images/logo-foodstack.png" alt="FoodStack logo">
        </a>
        <div id="admin-user-chip" class="user-chip user-chip--admin">
          <strong>${staffName}</strong>
        </div>
        <nav class="nav-actions" aria-label="Admin navigation">
          ${buildAdminLinks(context)}
        </nav>
      `;

      return;
    }

    const customerName = escapeHtml(readCustomerName());

    node.innerHTML = `
      <a class="brand-link" href="home.html" aria-label="FoodStack home">
        <img src="assets/images/logo-foodstack.png" alt="FoodStack logo">
      </a>
      <div class="user-chip">
        <span class="chip-role">User</span>
        <strong>${customerName}</strong>
      </div>
      <nav class="nav-actions" aria-label="Primary navigation">
        ${buildUserLinks(context)}
      </nav>
    `;
  }

  document.querySelectorAll('[data-topbar]').forEach((node) => {
    renderTopbar(node);
  });

  document.querySelectorAll('[data-admin-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      const api = window.FOODSTACK_API;
      const finish = () => {
        window.localStorage.removeItem('foodstack-admin-session');
        window.location.href = 'admin-login.html';
      };

      if (api && typeof api.logout === 'function') {
        api.logout().catch(() => null).finally(finish);
        return;
      }

      finish();
    });
  });
});
