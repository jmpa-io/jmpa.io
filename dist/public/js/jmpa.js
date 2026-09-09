// jmpa.io — theme toggle + cart
(function () {

  // ── Theme ──────────────────────────────────────────────
  var THEME_KEY = 'jmpa-theme';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }

  function toggleTheme() {
    var isLight = document.documentElement.classList.contains('light');
    var next = isLight ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // apply saved theme immediately (before DOMContentLoaded to avoid flash)
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

  // ── Cart ───────────────────────────────────────────────
  var CART_KEY = 'jmpa-cart';

  function cartLoad() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }

  function cartSave(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function cartUpdateCount() {
    var el = document.getElementById('cart-count');
    if (el) el.textContent = cartLoad().length;
  }

  function cartRender() {
    var list = document.getElementById('cart-items');
    var total = document.getElementById('cart-total-amount');
    if (!list) return;
    var items = cartLoad();
    if (items.length === 0) {
      list.innerHTML = '<p class="jmpa-cart-empty">Your cart is empty.</p>';
      if (total) total.textContent = '$0.00';
      return;
    }
    var sum = 0;
    list.innerHTML = items.map(function (item) {
      var num = parseFloat((item.price || '0').replace(/[^0-9.]/g, ''));
      sum += isNaN(num) ? 0 : num;
      return '<div class="jmpa-cart-item">' +
        '<span class="jmpa-cart-item-title">' + escHtml(item.title) + '</span>' +
        '<span class="jmpa-cart-item-price">' + escHtml(item.price) + '</span>' +
        '<button class="jmpa-cart-item-remove" onclick="cartRemove(\'' + escAttr(item.id) + '\')" aria-label="Remove">✕</button>' +
        '</div>';
    }).join('');
    if (total) total.textContent = '$' + sum.toFixed(2);
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return String(s).replace(/'/g, "\\'"); }

  function cartOpen() {
    var overlay = document.getElementById('cart-overlay');
    var drawer  = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer)  drawer.classList.add('open');
  }

  function cartClose() {
    var overlay = document.getElementById('cart-overlay');
    var drawer  = document.getElementById('cart-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer)  drawer.classList.remove('open');
  }

  // ── Public API ─────────────────────────────────────────
  window.toggleTheme = toggleTheme;

  window.toggleCart = function () {
    var drawer = document.getElementById('cart-drawer');
    if (drawer && drawer.classList.contains('open')) { cartClose(); } else { cartOpen(); }
  };
  window.closeCart = cartClose;

  window.cartAdd = function (id, title, price, link) {
    var items = cartLoad();
    if (items.find(function (i) { return i.id === id; })) { cartOpen(); return; }
    items.push({ id: id, title: title, price: price, link: link });
    cartSave(items);
    cartUpdateCount();
    cartRender();
    cartOpen();
  };

  window.cartRemove = function (id) {
    cartSave(cartLoad().filter(function (i) { return i.id !== id; }));
    cartUpdateCount();
    cartRender();
  };

  window.cartCheckout = function () {
    var items = cartLoad();
    if (!items.length) return;
    items.forEach(function (item) { window.open(item.link, '_blank'); });
  };

  // ── Init ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    cartUpdateCount();
    cartRender();

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  });

})();
