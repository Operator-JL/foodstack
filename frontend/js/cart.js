document.addEventListener('DOMContentLoaded', async () => {
  const data = window.FOODSTACK_DATA;
  const api = window.FOODSTACK_API;
  const runtime = window.FOODSTACK_RUNTIME || {};

  if (!data) {
    return;
  }

  const list = document.getElementById('cart-items');
  const historyContent = document.getElementById('order-history-content');
  const countNodes = document.querySelectorAll('[data-cart-count]');
  const subtotalNode = document.getElementById('summary-subtotal');
  const feeNode = document.getElementById('summary-fee');
  const totalNode = document.getElementById('summary-total');
  const proceedButton = document.getElementById('proceed-order-btn');

  const LOCAL_ORDER_LOG_KEY = 'foodstack-order-log';

  let lastSummary = { subtotal: 0, fee: 0, total: 0 };
  let lastItems = [];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(value) {
    return data.money(Number(value || 0));
  }

  function formatDateTime(value) {
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

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizePositiveId(value) {
    const text = normalizeText(value);
    const parsed = Number(text);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return String(Math.trunc(parsed));
  }

  function setProceedState(loading, label) {
    if (!proceedButton) {
      return;
    }

    proceedButton.disabled = Boolean(loading);
    proceedButton.textContent = label || 'Proceed to Order';
  }

  function showInlineMessage(message) {
    if (!list) {
      return;
    }

    const existing = list.querySelector('[data-cart-inline-msg]');

    if (existing) {
      existing.textContent = message || '';
      return;
    }

    if (!message) {
      return;
    }

    const node = document.createElement('p');
    node.setAttribute('data-cart-inline-msg', '1');
    node.className = 'menu-note';
    node.textContent = message;
    list.prepend(node);
  }

  function pulseValue(node) {
    if (!node) {
      return;
    }

    node.classList.remove('is-updated');
    void node.offsetWidth;
    node.classList.add('is-updated');
    window.setTimeout(() => node.classList.remove('is-updated'), 220);
  }

  function updateBadge(count) {
    const cartTotal = typeof count === 'number' ? count : data.cartCount();

    countNodes.forEach((node) => {
      node.textContent = String(cartTotal);
    });
  }

  function getItems() {
    const cart = data.readCart();

    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = data.findProduct(id);

        if (!product) {
          return null;
        }

        return {
          ...product,
          qty: Number(qty)
        };
      })
      .filter(Boolean)
      .filter((item) => item.qty > 0);
  }

  function calculate(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const fee = subtotal > 0 ? subtotal * 0.08 : 0;
    const total = subtotal + fee;

    return { subtotal, fee, total };
  }

  function bindActions() {
    document.querySelectorAll('[data-qty-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-product-id');
        const action = button.getAttribute('data-qty-action');
        const delta = action === 'inc' ? 1 : -1;
        data.addToCart(id, delta);
        render();
      });
    });
  }

  function render() {
    if (!list) {
      return;
    }

    const items = getItems();
    lastItems = items.slice();

    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-cart">
          <span class="empty-cart__icon" aria-hidden="true"></span>
          <h3 class="empty-cart__title">Your cart is empty</h3>
          <p class="empty-cart__text">Add products from the menu to start a new order.</p>
          <div class="empty-cart__actions">
            <a class="pill-btn pill-btn--primary" href="menu.html">Go to Menu</a>
          </div>
        </div>
      `;

      if (proceedButton) {
        proceedButton.disabled = true;
      }
    } else {
      list.innerHTML = items
        .map((item) => {
          const subtotal = item.qty * item.price;
          const name = escapeHtml(item.name);
          const description = escapeHtml(item.description);
          const image = escapeHtml(item.image);
          const itemId = escapeHtml(item.id);

          return `
            <article class="cart-item">
              <img
                class="cart-item__image"
                src="${image}"
                alt="${name}"
                loading="lazy"
                referrerpolicy="no-referrer"
                onerror="this.onerror=null;this.src='assets/images/logo-foodstack.png';"
              >
              <div>
                <h3 class="cart-item__title">${name}</h3>
                <p class="cart-item__description">${description}</p>
                <p class="cart-item__price">Unit: ${formatMoney(item.price)}</p>
              </div>
              <div class="cart-item__right">
                <div class="qty-control" role="group" aria-label="Quantity for ${name}">
                  <button type="button" data-qty-action="dec" data-product-id="${itemId}">-</button>
                  <span>${item.qty}</span>
                  <button type="button" data-qty-action="inc" data-product-id="${itemId}">+</button>
                </div>
                <p class="cart-item__subtotal">${formatMoney(subtotal)}</p>
              </div>
            </article>
          `;
        })
        .join('');

      bindActions();

      if (proceedButton) {
        proceedButton.disabled = false;
      }
    }

    const summary = calculate(items);
    lastSummary = summary;
    const count = items.reduce((sum, item) => sum + item.qty, 0);

    if (subtotalNode) {
      subtotalNode.textContent = formatMoney(summary.subtotal);
      pulseValue(subtotalNode);
    }

    if (feeNode) {
      feeNode.textContent = formatMoney(summary.fee);
      pulseValue(feeNode);
    }

    if (totalNode) {
      totalNode.textContent = formatMoney(summary.total);
      pulseValue(totalNode);
    }

    updateBadge(count);
  }

  function readCurrentUser() {
    const candidates = ['foodstack-user', 'user'];

    for (const key of candidates) {
      const raw = window.localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  function readLocalOrderLog() {
    const raw = window.localStorage.getItem(LOCAL_ORDER_LOG_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalOrderLog(items) {
    window.localStorage.setItem(LOCAL_ORDER_LOG_KEY, JSON.stringify(items));
  }

  function appendLocalOrderLog(entry) {
    const current = readLocalOrderLog();
    current.unshift(entry);
    writeLocalOrderLog(current.slice(0, 50));
  }

  function normalizeStatusLabel(value) {
    const text = normalizeText(value).toLowerCase();

    if (!text) {
      return 'Unknown';
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function renderOrderHistory(items, warning) {
    if (!historyContent) {
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      historyContent.innerHTML = `
        <article class="order-history-item">
          <p class="order-history-item__id">No orders yet</p>
          <p class="order-history-item__meta">Place your first order to build history.</p>
        </article>
      `;
      return;
    }

    const warningMarkup = warning
      ? `<article class="order-history-item"><p class="order-history-item__meta">${escapeHtml(
          warning
        )}</p></article>`
      : '';

    const listMarkup = items
      .slice(0, 10)
      .map((item) => {
        const orderRef = escapeHtml(item.orderRef || item.id || 'Unknown');
        const status = escapeHtml(normalizeStatusLabel(item.status));
        const source = escapeHtml(item.source || 'api');
        const createdAt = formatDateTime(item.createdAt);
        const total = formatMoney(item.total);
        const itemCount = Number(item.itemCount || 0);
        const details = escapeHtml(item.details || '');

        return `
          <article class="order-history-item">
            <div class="order-history-item__top">
              <p class="order-history-item__id">${orderRef}</p>
              <strong>${total}</strong>
            </div>
            <p class="order-history-item__meta">${createdAt} - ${status} - source: ${source}</p>
            <p class="order-history-item__details">Items: <code>${itemCount}</code> ${details}</p>
          </article>
        `;
      })
      .join('');

    historyContent.innerHTML = `${warningMarkup}${listMarkup}`;
  }

  async function loadUserOrderHistory() {
    const user = readCurrentUser();
    const userId = normalizeText(user && user.id);

    if (!historyContent) {
      return;
    }

    if (!userId) {
      renderOrderHistory([], 'Log in to view order history.');
      return;
    }

    const localLogs = readLocalOrderLog()
      .filter((entry) => normalizeText(entry && entry.userId) === userId)
      .map((entry) => ({
        id: entry.id,
        orderRef: entry.orderRef || entry.id,
        status: entry.status,
        total: normalizeNumber(entry.total),
        itemCount: normalizeNumber(entry.itemCount),
        createdAt: entry.createdAt,
        source: entry.source || 'local',
        details: entry.details || ''
      }));

    if (!api) {
      renderOrderHistory(localLogs, 'Orders API is not available.');
      return;
    }

    const warningParts = [];
    let apiHistory = [];

    try {
      let orders = [];
      let sourceLabel = 'api';

      try {
        const userOrdersRaw = await api.getOrdersByUser(userId);
        orders = Array.isArray(userOrdersRaw) ? userOrdersRaw : [];
      } catch (userOrdersError) {
        sourceLabel = 'api-fallback';
        warningParts.push(
          userOrdersError instanceof Error
            ? `User orders endpoint failed (${userOrdersError.message}).`
            : 'User orders endpoint failed.'
        );

        const allOrdersRaw = await api.getOrders();
        const allOrders = Array.isArray(allOrdersRaw) ? allOrdersRaw : [];
        orders = allOrders.filter((order) => normalizeText(order && order.user_id) === userId);
      }

      const groupedItems = new Map();

      orders.forEach((order) => {
        const orderId = normalizeText(order && order.id);
        const nestedOrderProducts =
          (order && (order.order_products || order.orderProducts)) || [];
        const nestedItems = Array.isArray(nestedOrderProducts)
          ? nestedOrderProducts
          : [];
        const nestedCount = nestedItems.reduce((sum, row) => {
          const quantity = Math.max(
            0,
            Math.floor(normalizeNumber(row && (row.quantity || row.qty)))
          );
          return sum + quantity;
        }, 0);

        if (orderId && nestedCount > 0) {
          groupedItems.set(orderId, nestedCount);
        }
      });

      const missingOrderIds = orders
        .map((order) => normalizeText(order && order.id))
        .filter((orderId) => orderId && !groupedItems.has(orderId));

      if (missingOrderIds.length) {
        try {
          const orderProductsRaw = await api.getOrderProducts();
          const orderProducts = Array.isArray(orderProductsRaw) ? orderProductsRaw : [];

          orderProducts.forEach((row) => {
            const orderId = normalizeText(row && row.order_id);
            const quantity = Math.max(0, Math.floor(normalizeNumber(row && row.quantity)));

            if (!orderId || !missingOrderIds.includes(orderId)) {
              return;
            }

            const current = groupedItems.get(orderId) || 0;
            groupedItems.set(orderId, current + quantity);
          });
        } catch (orderProductsError) {
          warningParts.push(
            orderProductsError instanceof Error
              ? `Order line items endpoint failed (${orderProductsError.message}).`
              : 'Order line items endpoint failed.'
          );
        }
      }

      apiHistory = orders
        .map((order) => {
          const orderId = normalizeText(order && order.id);
          const createdAt = order && (order.datetime || order.created_at);
          const displayId = orderId ? `ORD-${orderId}` : 'ORD-UNKNOWN';

          return {
            id: orderId,
            orderRef: displayId,
            status: normalizeText(order && order.status) || 'pending',
            total: normalizeNumber(order && order.total),
            itemCount: groupedItems.get(orderId) || 0,
            createdAt: createdAt,
            source: sourceLabel,
            details: ''
          };
        });
    } catch (error) {
      warningParts.push(
        error instanceof Error
          ? `Could not load live order history: ${error.message}`
          : 'Could not load live order history.'
      );
    }

    const combined = apiHistory
      .concat(localLogs)
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || 0).getTime() || 0;
        return bTime - aTime;
      });

    renderOrderHistory(combined, warningParts.join(' '));
  }

  async function resolveCreatedOrderId(userId, total) {
    if (!api) {
      return null;
    }

    const ordersRaw = await api.getOrders();
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
    const now = Date.now();

    const matches = orders
      .filter((order) => normalizeText(order && order.user_id) === String(userId))
      .filter((order) => Math.abs(normalizeNumber(order && order.total) - total) < 0.011)
      .filter((order) => {
        const createdAt = new Date(order && (order.datetime || order.created_at)).getTime();
        return Number.isFinite(createdAt) ? Math.abs(now - createdAt) <= 1000 * 60 * 20 : true;
      })
      .sort((a, b) => normalizeNumber(b && b.id) - normalizeNumber(a && a.id));

    return matches.length ? normalizeText(matches[0].id) : null;
  }

  function extractCreatedOrderId(responsePayload) {
    const directCandidate = normalizePositiveId(responsePayload);

    if (directCandidate) {
      return directCandidate;
    }

    if (!responsePayload || typeof responsePayload !== 'object') {
      return null;
    }

    const layers = [responsePayload, responsePayload.data, responsePayload.order];
    const keys = ['id', 'order_id', 'orderId'];

    for (const layer of layers) {
      if (!layer || typeof layer !== 'object') {
        continue;
      }

      for (const key of keys) {
        const candidate = normalizePositiveId(layer[key]);

        if (candidate) {
          return candidate;
        }
      }
    }

    return null;
  }

  async function createOrderLines(orderId, items) {
    const outcomes = [];
    const parsedOrderId = Number(orderId);

    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      return items.map((item) => ({
        ok: false,
        itemId: item.id,
        itemName: item.name,
        error: 'Order id is invalid for line-item persistence.'
      }));
    }

    for (const item of items) {
      const productId = Number(item.id);
      const quantity = Math.max(1, Math.floor(normalizeNumber(item.qty)));
      const price = normalizeNumber(item.price);

      if (!Number.isFinite(productId) || productId <= 0) {
        outcomes.push({
          ok: false,
          itemId: item.id,
          itemName: item.name,
          error: 'Product id is invalid.'
        });
        continue;
      }

      try {
        await api.createOrderProduct({
          order_id: parsedOrderId,
          product_id: productId,
          quantity: quantity,
          price: price,
          status: 1
        });

        outcomes.push({
          ok: true,
          itemId: item.id,
          itemName: item.name
        });
      } catch (error) {
        outcomes.push({
          ok: false,
          itemId: item.id,
          itemName: item.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return outcomes;
  }

  function cartDetailsSnippet(items) {
    if (!Array.isArray(items) || !items.length) {
      return '';
    }

    return items
      .slice(0, 3)
      .map((item) => `${item.name} x${item.qty}`)
      .join(' - ');
  }

  async function submitOrder() {
    if (!api) {
      showInlineMessage('Order API is not available.');
      return;
    }

    if (!lastItems.length) {
      showInlineMessage('Your cart is empty.');
      return;
    }

    const user = readCurrentUser();
    const userId = Number(user && user.id);

    if (!Number.isFinite(userId) || userId <= 0) {
      showInlineMessage('Please log in before placing an order.');
      return;
    }

    const confirmOrder = window.confirm(
      `Confirm order for ${formatMoney(lastSummary.total)}?`
    );

    if (!confirmOrder) {
      return;
    }

    setProceedState(true, 'Placing order...');
    showInlineMessage('Creating order...');

    const nowIso = new Date().toISOString();
    const localBase = {
      id: `LOCAL-${Date.now()}`,
      userId: String(userId),
      total: Number(lastSummary.total.toFixed(2)),
      itemCount: lastItems.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      createdAt: nowIso,
      details: cartDetailsSnippet(lastItems),
      source: 'local',
      status: 'pending'
    };

    try {
      const createdOrderPayload = await api.createOrder({
        user_id: userId,
        total: Number(lastSummary.total.toFixed(2)),
        status: 'pending'
      });

      let orderId = extractCreatedOrderId(createdOrderPayload);

      if (!orderId) {
        try {
          orderId = await resolveCreatedOrderId(
            userId,
            Number(lastSummary.total.toFixed(2))
          );
        } catch (resolveError) {
          orderId = null;
        }
      }

      if (!orderId) {
        appendLocalOrderLog({
          ...localBase,
          orderRef: 'Pending id',
          status: 'created-base-unlinked',
          details:
            'Order base created but response id was missing and fallback lookup failed.'
        });

        showInlineMessage(
          'Order base created, but order id could not be resolved for line items. Cart was kept.'
        );
        await loadUserOrderHistory();
        return;
      }

      const lineResults = await createOrderLines(orderId, lastItems);
      const failedLines = lineResults.filter((item) => !item.ok);

      if (failedLines.length === 0) {
        appendLocalOrderLog({
          ...localBase,
          orderRef: `ORD-${orderId}`,
          status: 'completed',
          source: 'api',
          details: 'Order and line items persisted through API.'
        });

        data.clearCart();
        render();
        showInlineMessage(`Order ORD-${orderId} placed successfully.`);
      } else {
        appendLocalOrderLog({
          ...localBase,
          orderRef: `ORD-${orderId}`,
          status: 'partial-lines',
          source: 'api',
          details: `${failedLines.length} line item(s) could not be saved.`
        });

        const failedSummary = failedLines
          .slice(0, 2)
          .map((line) => `${line.itemName || line.itemId}: ${line.error}`)
          .join(' | ');

        showInlineMessage(
          `Order ORD-${orderId} was created, but ${failedLines.length} line item(s) failed. ${failedSummary}`
        );
      }

      await loadUserOrderHistory();
    } catch (error) {
      if (runtime.DEV_FALLBACK_MODE) {
        appendLocalOrderLog({
          ...localBase,
          status: 'local-only',
          details: 'API unavailable. Local record created for development tracking.'
        });

        showInlineMessage(
          'API unavailable. Local order log was saved, cart kept for safe retry.'
        );
        await loadUserOrderHistory();
        return;
      }

      showInlineMessage(
        error instanceof Error ? error.message : 'Could not submit your order.'
      );
    } finally {
      if (proceedButton) {
        proceedButton.textContent = 'Proceed to Order';
        proceedButton.disabled = lastItems.length === 0;
      }
    }
  }

  if (proceedButton) {
    proceedButton.addEventListener('click', () => {
      submitOrder();
    });
  }

  try {
    showInlineMessage('Loading cart data...');
    const result = await data.loadCatalog();
    render();
    showInlineMessage(result && result.source === 'demo' ? result.warning : '');
    await loadUserOrderHistory();
  } catch (error) {
    if (list) {
      list.innerHTML = '';
    }

    showInlineMessage(data.getCatalogError() || 'Could not load cart products from API.');
    updateBadge(0);
    renderOrderHistory([], 'Could not load order history.');
  }
});
