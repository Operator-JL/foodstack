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
  const productsList = document.getElementById('products-list');
  const inlineMessage = document.getElementById('admin-inline-msg');

  document.querySelectorAll('[data-admin-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      api.clearSession();
      window.location.href = 'admin-login.html';
    });
  });

  if (userChip) {
    userChip.textContent = `Staff Console: ${sessionUser.name}`;
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

    bestSellersList.innerHTML = items.map((item) => {
      return `
        <li class="seller-item">
          <div>
            <p class="seller-item__name">${item.name}</p>
            <p class="seller-item__meta">${item.units} units sold</p>
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

    ordersBody.innerHTML = items.map((item) => {
      const status = String(item.status || '').toLowerCase();

      return `
        <tr>
          <td>${item.id}</td>
          <td>${item.customer}</td>
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

    productsList.innerHTML = items.map((item) => {
      return `
        <article class="product-row">
          <p class="product-row__name">${item.name}</p>
          <p class="product-row__meta">${item.category}</p>
          <p class="product-row__meta">Price: ${formatMoney(item.price)}</p>
          <p class="product-row__meta">Stock: ${item.stock}</p>
        </article>
      `;
    }).join('');
  }

  try {
    const snapshot = await api.loadDashboardSnapshot();
    renderSummary(snapshot.summary);
    renderBestSellers(snapshot.bestSellers);
    renderRecentOrders(snapshot.recentOrders);
    renderProducts(snapshot.products);
  } catch (error) {
    if (inlineMessage) {
      inlineMessage.textContent = 'Could not load dashboard data.';
    }
  }
});
