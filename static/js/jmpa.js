// jmpa.io — theme toggle + palette + cart
(function () {

  // ── Palette ────────────────────────────────────────────
  var PALETTES = ['ocean', 'forest', 'sunset', 'violet', 'yellow', 'grey', 'purple'];
  var PALETTE_KEY = 'jmpa-palette';

  function applyPalette(palette) {
    PALETTES.forEach(function (p) { document.documentElement.classList.remove(p); });
    if (palette && PALETTES.indexOf(palette) !== -1) {
      document.documentElement.classList.add(palette);
    }
    document.querySelectorAll('.jmpa-palette-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.palette === (palette || ''));
    });
  }

  function setPalette(palette) {
    var current = localStorage.getItem(PALETTE_KEY);
    if (current === palette) {
      localStorage.removeItem(PALETTE_KEY);
      applyPalette(null);
    } else {
      localStorage.setItem(PALETTE_KEY, palette);
      applyPalette(palette);
    }
  }

  applyPalette(localStorage.getItem(PALETTE_KEY));

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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setThemeIcon(theme);
  }

  function toggleTheme() {
    var isDark = document.documentElement.classList.contains('dark');
    var next = isDark ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // apply saved theme immediately (before DOMContentLoaded to avoid flash)
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');

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
    // Open each Square link sequentially — browsers block concurrent window.open() calls
    items.forEach(function (item, i) {
      setTimeout(function () { window.open(item.link, '_blank'); }, i * 300);
    });
  };

  // ── Inventory (live sold status from Lambda) ───────────
  var INVENTORY_URL = window.JMPA_INVENTORY_URL || '';

  function syncInventory() {
    if (!INVENTORY_URL) return;
    // Only run on pages that have art cards.
    if (!document.querySelector('.art-card')) return;
    fetch(INVENTORY_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var sold = data.sold || [];
        sold.forEach(function (artId) {
          // Find the card whose add-to-cart button carries this id.
          var btn = document.querySelector('.art-add-cart-btn[onclick*="\'' + artId + '\'"]');
          if (!btn) return;
          var badge = document.createElement('div');
          badge.className = 'art-sold-badge';
          badge.textContent = 'Sold';
          btn.replaceWith(badge);
        });
      })
      .catch(function () {
        // Silently ignore — static fallback (sold: true in art.yml) is still shown.
      });
  }

  // ── Cycling display fonts ──────────────────────────────
  var DISPLAY_FONTS = [
    "'Playfair Display', Georgia, serif",
    "'DM Serif Display', Georgia, serif",
    "'Cormorant Garamond', Georgia, serif",
    "'Fraunces', Georgia, serif",
  ];
  var fontIdx = 0;

  function cycleHeadingFonts() {
    fontIdx = (fontIdx + 1) % DISPLAY_FONTS.length;
    var font = DISPLAY_FONTS[fontIdx];
    document.querySelectorAll(
      '.jmpa-hero h1, .page-header h1, .about-bio h1, .art-grid-header h1'
    ).forEach(function (el) {
      el.style.fontFamily = font;
    });
  }

  setInterval(cycleHeadingFonts, 500);

  // ── Hamburger ──────────────────────────────────────────
  function initHamburger() {
    var btn  = document.getElementById('jmpa-hamburger');
    var menu = document.getElementById('jmpa-mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      menu.setAttribute('aria-hidden', !open);
    });
    // close on nav link tap
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', false);
        menu.setAttribute('aria-hidden', true);
      });
    });
  }

  // ── Init ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    syncInventory();
    cartUpdateCount();
    cartRender();

    // palette popup
    var paletteTrigger = document.getElementById('jmpa-palette-trigger');
    var palettePopup   = document.getElementById('jmpa-palette-popup');
    if (paletteTrigger && palettePopup) {
      paletteTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        palettePopup.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!palettePopup.contains(e.target) && e.target !== paletteTrigger) {
          palettePopup.classList.remove('open');
        }
      });
    }
    document.querySelectorAll('.jmpa-palette-btn').forEach(function (btn) {
      var p = btn.dataset.palette;
      btn.classList.toggle('active', (p || '') === (localStorage.getItem(PALETTE_KEY) || ''));
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setPalette(p);
        if (palettePopup) palettePopup.classList.remove('open');
      });
    });

    initHamburger();

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    var currentTheme = localStorage.getItem(THEME_KEY) || 'light';
    setThemeIcon(currentTheme);

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
