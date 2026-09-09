// jmpa.io — theme toggle + season + cart
(function () {

  var SEASONS = ['spring', 'summer', 'autumn', 'winter', 'yellow', 'grey', 'purple'];

  // ── Season ─────────────────────────────────────────────
  var SEASON_KEY = 'jmpa-season';

  function applySeason(season) {
    SEASONS.forEach(function (s) {
      document.documentElement.classList.remove(s);
    });
    if (season && SEASONS.indexOf(season) !== -1) {
      document.documentElement.classList.add(season);
    }
    document.querySelectorAll('.jmpa-season-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.season === season);
    });
  }

  function setSeason(season) {
    var current = localStorage.getItem(SEASON_KEY);
    if (current === season) {
      localStorage.removeItem(SEASON_KEY);
      applySeason(null);
    } else {
      localStorage.setItem(SEASON_KEY, season);
      applySeason(season);
    }
  }

  // apply saved season immediately (before DOMContentLoaded to avoid flash)
  applySeason(localStorage.getItem(SEASON_KEY));

  // ── Theme ──────────────────────────────────────────────
  var THEME_KEY = 'jmpa-theme';

  function setThemeIcon(theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn || !window.feather) return;
    btn.innerHTML = theme === 'light'
      ? feather.icons.moon.toSvg()
      : feather.icons.sun.toSvg();
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    setThemeIcon(theme);
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
    var count = cartLoad().length;
    var el = document.getElementById('cart-count');
    if (el) el.textContent = count;
    var hd = document.getElementById('cart-header-count');
    if (hd) hd.textContent = count;
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
    var xIcon = window.feather ? feather.icons.x.toSvg() : '✕';
    list.innerHTML = items.map(function (item) {
      var num = parseFloat((item.price || '0').replace(/[^0-9.]/g, ''));
      sum += isNaN(num) ? 0 : num;
      return '<div class="jmpa-cart-item">' +
        '<div class="jmpa-cart-item-info">' +
          '<span class="jmpa-cart-item-title">' + escHtml(item.title) + '</span>' +
          '<span class="jmpa-cart-item-price">' + escHtml(item.price) + '</span>' +
        '</div>' +
        '<button class="jmpa-cart-item-remove" onclick="cartRemove(\'' + escAttr(item.id) + '\')" aria-label="Remove">' + xIcon + '</button>' +
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

    var currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setThemeIcon(currentTheme);

    // season popup
    var seasonTrigger = document.getElementById('season-trigger');
    var seasonPopup   = document.getElementById('season-popup');

    if (seasonTrigger && seasonPopup) {
      seasonTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        seasonPopup.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!seasonPopup.contains(e.target) && e.target !== seasonTrigger) {
          seasonPopup.classList.remove('open');
        }
      });
    }

    document.querySelectorAll('.jmpa-season-btn').forEach(function (btn) {
      var s = btn.dataset.season;
      btn.classList.toggle('active', s === localStorage.getItem(SEASON_KEY));
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setSeason(s);
        if (seasonPopup) seasonPopup.classList.remove('open');
      });
    });

    if (window.feather) {
      var cartIcon = document.getElementById('cart-icon');
      if (cartIcon) cartIcon.innerHTML = feather.icons['shopping-cart'].toSvg();

      var cartHeaderIcon = document.getElementById('cart-header-icon');
      if (cartHeaderIcon) cartHeaderIcon.innerHTML = feather.icons['shopping-bag'].toSvg();

      var closeBtn = document.getElementById('cart-close-btn');
      if (closeBtn) closeBtn.innerHTML = feather.icons.x.toSvg();

      var checkoutArrow = document.getElementById('checkout-arrow-icon');
      if (checkoutArrow) checkoutArrow.innerHTML = feather.icons['arrow-right'].toSvg();
    }
  });

})();
