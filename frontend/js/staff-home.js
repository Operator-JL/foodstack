document.addEventListener('DOMContentLoaded', async () => {
  const api = window.FOODSTACK_ADMIN_API;

  if (!api) {
    return;
  }

  const sessionResult =
    typeof api.verifyStaffSession === 'function'
      ? await api.verifyStaffSession()
      : { ok: false };

  if (!sessionResult || !sessionResult.ok || !sessionResult.user) {
    window.location.href = 'admin-login.html';
    return;
  }

  const sessionUser = sessionResult.user;

  const heroTitle = document.getElementById('staff-hero-title');
  const statsGrid = document.getElementById('staff-stats-grid');
  const actionsGrid = document.getElementById('staff-actions-grid');
  const activityList = document.getElementById('staff-activity-list');
  const analyticsChart = document.getElementById('staff-analytics-chart');
  const inlineMessage = document.getElementById('staff-home-msg');

  document.querySelectorAll('[data-admin-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      api.clearSession();
      window.location.href = 'admin-login.html';
    });
  });

  if (heroTitle) {
    heroTitle.textContent = `Welcome back, ${sessionUser.name}`;
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

  function renderStats(stats) {
    if (!statsGrid) {
      return;
    }

    const cards = [
      { label: 'Orders today', value: stats.ordersToday },
      { label: 'Pending orders', value: stats.pendingOrders },
      { label: 'Revenue today', value: formatMoney(stats.revenueToday) },
      { label: 'Low stock items', value: stats.lowStockItems }
    ];

    statsGrid.innerHTML = cards.map((item) => {
      return `
        <article class="staff-stat-card">
          <p class="staff-stat-label">${item.label}</p>
          <p class="staff-stat-value">${item.value}</p>
        </article>
      `;
    }).join('');
  }

  function renderActions(actions) {
    if (!actionsGrid) {
      return;
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      actionsGrid.innerHTML = `
        <article class="staff-action-card">
          <h3>No quick actions</h3>
          <p>Actions will appear when API modules are ready.</p>
        </article>
      `;
      return;
    }

    actionsGrid.innerHTML = actions.map((item) => {
      return `
        <article class="staff-action-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <a class="pill-btn pill-btn--ghost" href="${escapeHtml(item.href)}">Open</a>
        </article>
      `;
    }).join('');
  }

  function renderActivity(activity) {
    if (!activityList) {
      return;
    }

    if (!Array.isArray(activity) || activity.length === 0) {
      activityList.innerHTML = `
        <li class="staff-activity-item">
          <h3>No recent activity</h3>
          <p>The API returned no activity yet.</p>
        </li>
      `;
      return;
    }

    activityList.innerHTML = activity.map((item) => {
      return `
        <li class="staff-activity-item">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.detail)}</p>
          <span class="staff-activity-meta">
            <span class="staff-activity-dot" data-level="${escapeHtml(item.level)}"></span>
            ${formatDate(item.createdAt)}
          </span>
        </li>
      `;
    }).join('');
  }

  function renderAnalytics(series) {
    if (!analyticsChart) {
      return;
    }

    if (!Array.isArray(series) || series.length === 0) {
      analyticsChart.innerHTML = '';
      return;
    }

    const maxOrders = series.reduce((max, item) => {
      return Math.max(max, Number(item.orders || 0));
    }, 1);

    analyticsChart.innerHTML = series.map((point) => {
      const orders = Number(point.orders || 0);
      const height = Math.max(10, Math.round((orders / maxOrders) * 118));

      return `
        <article class="staff-chart-bar">
          <p class="staff-chart-value">${orders}</p>
          <div class="staff-chart-column" style="height:${height}px" title="${point.label}: ${orders} orders"></div>
          <p class="staff-chart-label">${point.label}</p>
        </article>
      `;
    }).join('');
  }

  try {
    if (inlineMessage) {
      inlineMessage.textContent = 'Loading staff snapshot from live API...';
    }

    const snapshot = await api.loadStaffHomeSnapshot();
    renderStats(snapshot.quickStats);
    renderActions(snapshot.quickActions);
    renderActivity(snapshot.recentActivity);
    renderAnalytics(snapshot.analyticsPreview);

    if (inlineMessage) {
      const warnings = Array.isArray(snapshot.warnings)
        ? snapshot.warnings.filter(Boolean)
        : [];

      inlineMessage.textContent = warnings.length
        ? `Partial data loaded. ${warnings.join(' | ')}`
        : '';
    }
  } catch (error) {
    if (inlineMessage) {
      inlineMessage.textContent =
        error instanceof Error ? error.message : 'Could not load staff home data.';
    }
  }
});
