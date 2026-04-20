document.addEventListener('DOMContentLoaded', async () => {
  const api = window.FOODSTACK_ADMIN_API;

  if (!api) {
    return;
  }

  const sessionUser = api.readSession();

  if (!sessionUser) {
    window.location.href = 'admin-login.html';
    return;
  }

  const userChip = document.getElementById('admin-user-chip');
  const summaryGrid = document.getElementById('admin-summary-grid');
  const bestSellersList = document.getElementById('best-sellers-list');
  const ordersBody = document.getElementById('recent-orders-body');
  const ordersBoardBody = document.getElementById('admin-orders-board-body');
  const ordersStatusNote = document.getElementById('orders-status-note');
  const productsList = document.getElementById('products-list');
  const inlineMessage = document.getElementById('admin-inline-msg');

  document.querySelectorAll('[data-admin-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      api.clearSession();
      window.location.href = 'admin-login.html';
    });
  });

  if (userChip) {
    const chipStrong = userChip.querySelector('strong');

    if (chipStrong) {
      chipStrong.textContent = sessionUser.name;
    } else {
      userChip.textContent = `Staff Console: ${sessionUser.name}`;
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

  function formatMoney(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '--';
    }

    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function capitalize(value) {
    const text = String(value || '');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function renderSummary(summary) {
    if (!summaryGrid) {
      return;
    }

    const cards = [
      { label: 'Total products', value: summary.totalProducts },
      { label: 'Total orders', value: summary.totalOrders },
      { label: 'Estimated revenue', value: formatMoney(summary.estimatedRevenue) }
    ];

    summaryGrid.innerHTML = cards.map((card) => {
      return `
        <article class="metric-card">
          <p class="metric-card__label">${card.label}</p>
          <p class="metric-card__value">${card.value}</p>
        </article>
      `;
    }).join('');
  }

  function renderBestSellers(items) {
    if (!bestSellersList) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      bestSellersList.innerHTML = `
        <li class="seller-item">
          <div>
            <p class="seller-item__name">No sales data yet</p>
            <p class="seller-item__meta">Order-product records are empty.</p>
          </div>
          <strong>${formatMoney(0)}</strong>
        </li>
      `;
      return;
    }

    bestSellersList.innerHTML = items.map((item) => {
      return `
        <li class="seller-item">
          <div>
            <p class="seller-item__name">${escapeHtml(item.name)}</p>
            <p class="seller-item__meta">${Number(item.units || 0)} units sold</p>
          </div>
          <strong>${formatMoney(item.revenue)}</strong>
        </li>
      `;
    }).join('');
  }

  function renderRecentOrders(items) {
    if (!ordersBody) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      ordersBody.innerHTML = `
        <tr>
          <td colspan="5">No order records were returned by the API.</td>
        </tr>
      `;
      return;
    }

    ordersBody.innerHTML = items.map((item) => {
      const status = String(item.status || '').toLowerCase();

      return `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.customer)}</td>
          <td><span class="status-badge" data-status="${status}">${capitalize(status)}</span></td>
          <td>${formatMoney(item.total)}</td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderProducts(items) {
    if (!productsList) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      productsList.innerHTML = `
        <article class="product-row">
          <p class="product-row__name">No products available</p>
          <p class="product-row__meta">The API returned no active products.</p>
        </article>
      `;
      return;
    }

    productsList.innerHTML = items.map((item) => {
      const stockValue = Number.isFinite(Number(item.stock)) ? item.stock : 'N/A';

      return `
        <article class="product-row">
          <p class="product-row__name">${escapeHtml(item.name)}</p>
          <p class="product-row__meta">${escapeHtml(item.category)}</p>
          <p class="product-row__meta">Price: ${formatMoney(item.price)}</p>
          <p class="product-row__meta">Stock: ${stockValue}</p>
        </article>
      `;
    }).join('');
  }

  function renderOrdersBoard(items, capabilities) {
    if (!ordersBoardBody) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      ordersBoardBody.innerHTML = `
        <tr>
          <td colspan="7">No order rows available from current endpoints.</td>
        </tr>
      `;
      return;
    }

    ordersBoardBody.innerHTML = items.map((item) => {
      const status = String(item.status || '').toLowerCase() || 'unknown';
      const summary = item.productsSummary ? escapeHtml(item.productsSummary) : '--';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.orderRef)}</strong>
            <div class="product-row__meta">${escapeHtml(item.source || '')}</div>
          </td>
          <td>${escapeHtml(item.customer)}</td>
          <td title="${summary}">${Number(item.itemCount || 0)}</td>
          <td>${formatMoney(item.total)}</td>
          <td><span class="status-badge" data-status="${status}">${capitalize(status)}</span></td>
          <td>
            <select class="order-status-action" disabled>
              <option>${capabilities && capabilities.canUpdateOrderStatus ? 'Available' : 'Backend pending'}</option>
            </select>
          </td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `;
    }).join('');
  }

  try {
    if (inlineMessage) {
      inlineMessage.textContent = 'Loading dashboard from live API...';
    }

    const snapshot = await api.loadDashboardSnapshot();
    renderSummary(snapshot.summary);
    renderBestSellers(snapshot.bestSellers);
    renderRecentOrders(snapshot.recentOrders);
    renderOrdersBoard(snapshot.ordersBoard, snapshot.orderCapabilities);
    renderProducts(snapshot.products);

    if (inlineMessage) {
      const warnings = Array.isArray(snapshot.warnings)
        ? snapshot.warnings.filter(Boolean)
        : [];

      inlineMessage.textContent = warnings.length
        ? `Partial data loaded. ${warnings.join(' | ')}`
        : '';
    }

    if (ordersStatusNote) {
      const capabilities = snapshot.orderCapabilities || {};
      const notes = [];

      if (!capabilities.canReadOrders) {
        notes.push('Orders endpoint unavailable; showing partial order view.');
      }

      if (!capabilities.canReadOrderProducts) {
        notes.push('Order-products endpoint unavailable.');
      }

      if (!capabilities.canUpdateOrderStatus) {
        notes.push('Status update endpoint not available yet.');
      }

      ordersStatusNote.textContent = notes.join(' ') || 'Live orders data loaded.';
    }
  } catch (error) {
    if (inlineMessage) {
      inlineMessage.textContent =
        error instanceof Error ? error.message : 'Could not load dashboard data.';
    }
  }
});
