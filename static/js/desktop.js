// jmpa.io desktop: pixel-art icons, a Start menu, and one in-page window (room.exe).
(function () {
  var PALETTE = {
    k: '#000000', w: '#ffffff', g: '#c0c0c0', d: '#808080', y: '#ffff80', o: '#e0a020',
    b: '#000080', s: '#80c8ff', l: '#00a800', r: '#c80000', n: '#804000'
  };

  // 16x16 icon maps (exactly 16 chars per row), same style as the chatroom desktop.
  var MAPS = {
    document: [
      '................', '...kkkkkkk......', '...kwwwwwkk.....', '...kwwwwwkgk....',
      '...kwwwwwkkkk...', '...kwwwwwwwwk...', '...kwkkkkkkwk...', '...kwwwwwwwwk...',
      '...kwkkkkkkwk...', '...kwwwwwwwwk...', '...kwkkkkkkwk...', '...kwwwwwwwwk...',
      '...kwkkkkkwwk...', '...kwwwwwwwwk...', '...kkkkkkkkkk...', '................'
    ],
    briefcase: [
      '................', '.....kkkkkk.....', '.....k....k.....', '.....k....k.....',
      '..kkkkkkkkkkkk..', '..koooooooooook.', '..koooooooooook.', '..kkkkkkkkkkkk..',
      '..kooooyyoooook.', '..koooykkyooook.', '..kooooyyoooook.', '..koooooooooook.',
      '..knnnnnnnnnnnk.', '..kkkkkkkkkkkk..', '................', '................'
    ],
    folder: [
      '................', '................', '.kkkkkk.........', '.kyyyyyk........',
      '.kyyyyyykkkkkkk.', '.kwwwwwwwwwwwyk.', '.kwyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.',
      '.kyyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.', '.kyyyyyyyyyyyyk.', '.koooooooooooook',
      '.kkkkkkkkkkkkkk.', '................', '................', '................'
    ],
    globe: [
      '................', '................', '....kkkkkkkk....', '..kkssslllsskk..',
      '.kssssslllllssk.', '.ksssllllllllsk.', '.kssllllllssssk.', '.ksssllllsssssk.',
      '.kssssllssslllk.', '.kssssssssslllk.', '.ksssssslllsssk.', '..kkssssllsskk..',
      '....kkkkkkkk....', '................', '................', '................'
    ],
    monitor: [
      '................', '.kkkkkkkkkkkkkk.', '.kggggggggggggk.', '.kgkkkkkkkkkkgk.',
      '.kgkwwssssssskgk', '.kgkwsssssssskgk', '.kgkssssssssskgk', '.kgkssssssssskgk',
      '.kgkkkkkkkkkkgk.', '.kggggggggglggk.', '.kkkkkkkkkkkkkk.', '......kddk......',
      '...kkkkkkkkkk...', '...kggggggddk...', '...kkkkkkkkkk...', '................'
    ],
    palette: [
      '................', '................', '....kkkkkkkk....', '..kkoooooooookk.',
      '.koooorroollooo.', '.koooorroollooo.', '.kooooooooooook.', '.kobbooooooooook',
      '.kobbooooyyooook', '.koooooooookkook', '.koooooooookkook', '..kkoooooooookk.',
      '....kkkkkkkk....', '................', '................', '................'
    ]
  };

  function svg(name, size) {
    var map = MAPS[name];
    if (!map) return '';
    var out = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">';
    for (var y = 0; y < 16; y++) {
      var row = (map[y] || '').slice(0, 16);
      for (var x = 0; x < row.length; x++) {
        var c = PALETTE[row.charAt(x)];
        if (c) out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + c + '"/>';
      }
    }
    return out + '</svg>';
  }

  document.querySelectorAll('[data-icon]').forEach(function (el) {
    var target = el.classList.contains('icon-img') ? el : el.querySelector('.icon-img');
    if (target) target.innerHTML = svg(el.dataset.icon, +el.dataset.size || 32);
  });

  var screen = document.getElementById('screen');
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  // ---- desktop icons: click selects, double-click (or tap) opens ----
  var icons = Array.prototype.slice.call(document.querySelectorAll('.icons .icon'));
  var lastClick = { el: null, t: 0 };

  function select(el) {
    icons.forEach(function (i) { i.classList.toggle('selected', i === el); });
  }

  icons.forEach(function (el) {
    el.addEventListener('click', function (e) {
      var now = Date.now();
      var second = lastClick.el === el && now - lastClick.t < 450;
      lastClick = { el: el, t: now };
      select(el);
      var open = coarse || second || e.detail === 0; // detail 0 = keyboard activation.
      if (!open) {
        e.preventDefault();
        return;
      }
      if (el.dataset.window) openWindow(el.dataset.window);
    });
    // Space doesn't activate links natively.
    el.addEventListener('keydown', function (e) {
      if (e.key === ' ' && el.tagName === 'A') {
        e.preventDefault();
        el.click();
      }
    });
  });
  document.getElementById('desktop').addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.icon')) select(null);
  });

  // ---- windows ----
  var zTop = 10;
  var tasks = document.getElementById('tasks');
  var wins = {};

  function focusWin(name) {
    Object.keys(wins).forEach(function (n) {
      var w = wins[n];
      w.el.classList.toggle('focused', n === name);
      w.task.classList.toggle('down', n === name && !w.el.hidden);
    });
    if (wins[name]) wins[name].el.style.zIndex = ++zTop;
  }

  function setupWindow(name) {
    var el = document.getElementById('win-' + name);
    if (!el) return null;
    var task = document.createElement('button');
    task.type = 'button';
    task.className = 'bevel task';
    task.hidden = true;
    task.innerHTML = '<span class="icon-img"></span><span>' + name + '.exe</span>';
    task.firstChild.innerHTML = svg(el.querySelector('[data-icon]').dataset.icon, 16);
    tasks.appendChild(task);
    wins[name] = { el: el, task: task };

    el.addEventListener('pointerdown', function () { focusWin(name); });
    el.querySelector('[data-close]').addEventListener('click', function () {
      el.hidden = true;
      task.hidden = true;
      focusWin(null);
    });
    el.querySelector('[data-min]').addEventListener('click', function () {
      el.hidden = true;
      focusWin(null);
    });
    task.addEventListener('click', function () {
      if (el.hidden || !el.classList.contains('focused')) {
        el.hidden = false;
        focusWin(name);
      } else {
        el.hidden = true;
        focusWin(null);
      }
    });

    var drag = null;
    var bar = el.querySelector('[data-drag]');
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || el.classList.contains('max')) return;
      drag = { dx: e.clientX - el.offsetLeft, dy: e.clientY - el.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var d = document.getElementById('desktop');
      el.style.left = Math.max(0, Math.min(d.clientWidth - el.offsetWidth, e.clientX - drag.dx)) + 'px';
      el.style.top = Math.max(0, Math.min(d.clientHeight - el.offsetHeight, e.clientY - drag.dy)) + 'px';
    });
    bar.addEventListener('pointerup', function () { drag = null; saveGeom(); });

    // ---- maximise / restore (restore returns to the last size and position) ----
    function toggleMax() {
      el.classList.toggle('max');
      var m = el.classList.contains('max');
      var b = el.querySelector('[data-max]');
      if (b) b.setAttribute('aria-label', m ? 'Restore' : 'Maximise');
      saveGeom();
    }
    var maxBtn = el.querySelector('[data-max]');
    if (maxBtn) maxBtn.addEventListener('click', toggleMax);
    bar.addEventListener('dblclick', function (e) {
      if (!e.target.closest('button')) toggleMax();
    });

    // ---- resize: 8 handles, pointer events + capture, min size, clamped to the desktop ----
    var MIN_W = 220;
    var MIN_H = 120;
    var DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    DIRS.forEach(function (dir) {
      var h = document.createElement('i');
      h.className = 'rz rz-' + dir;
      h.dataset.dir = dir;
      h.setAttribute('aria-hidden', 'true');
      el.appendChild(h);
      var st = null;
      h.addEventListener('pointerdown', function (e) {
        if (el.classList.contains('max') || e.button > 0) return;
        e.preventDefault();
        st = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        h.setPointerCapture(e.pointerId);
      });
      h.addEventListener('pointermove', function (e) {
        if (!st) return;
        var d = document.getElementById('desktop');
        var dx = e.clientX - st.x;
        var dy = e.clientY - st.y;
        var l = st.l, t = st.t, w = st.w, hh = st.h;
        if (dir.indexOf('e') >= 0) w = Math.max(MIN_W, Math.min(st.w + dx, d.clientWidth - st.l));
        if (dir.indexOf('s') >= 0) hh = Math.max(MIN_H, Math.min(st.h + dy, d.clientHeight - st.t));
        if (dir.indexOf('w') >= 0) {
          w = Math.max(MIN_W, Math.min(st.w - dx, st.l + st.w));
          l = st.l + st.w - w;
        }
        if (dir.indexOf('n') >= 0) {
          hh = Math.max(MIN_H, Math.min(st.h - dy, st.t + st.h));
          t = st.t + st.h - hh;
        }
        el.style.left = l + 'px';
        el.style.top = t + 'px';
        el.style.width = w + 'px';
        el.style.height = hh + 'px';
      });
      var end = function () { if (st) { st = null; saveGeom(); } };
      h.addEventListener('pointerup', end);
      h.addEventListener('pointercancel', end);
    });

    // ---- remember geometry for this tab ----
    var GKEY = 'jmpa.win.' + name;
    function saveGeom() {
      try {
        sessionStorage.setItem(GKEY, JSON.stringify({
          l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, max: el.classList.contains('max'),
        }));
      } catch (err) { /* storage unavailable */ }
    }
    try {
      var g = JSON.parse(sessionStorage.getItem(GKEY));
      if (g && typeof g.w === 'number' && typeof g.h === 'number') {
        el.style.left = g.l + 'px';
        el.style.top = g.t + 'px';
        el.style.width = Math.max(MIN_W, g.w) + 'px';
        el.style.height = Math.max(MIN_H, g.h) + 'px';
        if (g.max) el.classList.add('max');
      }    } catch (err) { /* ignore invalid storage */ }

    // ---- keep a pixel canvas crisp: integer scale when it fits, otherwise fit-to-box ----
    var body = el.querySelector('.win-body');
    var cv = body && body.querySelector('canvas');
    if (cv && window.ResizeObserver) {
      var fit = function () {
        var aw = body.clientWidth - 4;
        var ah = matchMedia('(max-width: 720px)').matches ? 1e9 : body.clientHeight - 4; // small screens size by width.
        if (aw <= 0 || ah <= 0) return;
        var s = Math.min(aw / cv.width, ah / cv.height);
        if (s >= 1) s = Math.floor(s);
        cv.style.width = Math.floor(cv.width * s) + 'px';
        cv.style.height = Math.floor(cv.height * s) + 'px';
      };
      new ResizeObserver(fit).observe(body);
    }
    return wins[name];
  }

  function openWindow(name) {
    var w = wins[name] || setupWindow(name);
    if (!w) return;
    w.el.hidden = false;
    w.task.hidden = false;
    focusWin(name);
  }

  // ---- start menu ----
  var startBtn = document.getElementById('start-btn');
  var startMenu = document.getElementById('start-menu');
  var backdrop = document.getElementById('start-backdrop');
  var items = Array.prototype.slice.call(startMenu.querySelectorAll('.start-items > *'));

  function setStart(open, refocus) {
    startMenu.hidden = !open;
    backdrop.hidden = !open;
    startBtn.classList.toggle('down', open);
    startBtn.setAttribute('aria-expanded', String(open));
    if (open && items[0]) items[0].focus();
    if (!open && refocus) startBtn.focus();
  }
  startBtn.addEventListener('click', function () { setStart(startMenu.hidden); });
  backdrop.addEventListener('pointerdown', function () { setStart(false); });
  startMenu.addEventListener('focusout', function (e) {
    if (!startMenu.hidden && e.relatedTarget && !startMenu.contains(e.relatedTarget) && e.relatedTarget !== startBtn) setStart(false);
  });
  items.forEach(function (el) {
    el.addEventListener('click', function () {
      setStart(false);
      if (el.dataset.window) openWindow(el.dataset.window);
    });
    el.addEventListener('keydown', function (e) {
      var i = items.indexOf(el);
      if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus();
      else if (e.key === 'ArrowUp') items[(i + items.length - 1) % items.length].focus();
      else if (e.key === ' ' && el.tagName === 'A') el.click();
      else return;
      e.preventDefault();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !startMenu.hidden) setStart(false, true);
  });

  // ---- CRT toggle (remembered) ----
  var crtBtn = document.getElementById('crt-btn');
  var CRT_KEY = 'jmpa.crt';
  function setCrt(on) {
    screen.style.setProperty('--crt', on ? '0.6' : '0');
    crtBtn.setAttribute('aria-pressed', String(on));
  }
  var stored = null;
  try { stored = localStorage.getItem(CRT_KEY); } catch (e) { /* storage unavailable */ }
  setCrt(stored !== 'off');
  crtBtn.addEventListener('click', function () {
    var on = crtBtn.getAttribute('aria-pressed') !== 'true';
    setCrt(on);
    try { localStorage.setItem(CRT_KEY, on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
  });

  // ---- curvature, power ----
  var crt = window.Crt && window.Crt.attach({
    screen: screen,
    glass: document.getElementById('glass'),
    content: document.getElementById('crt-content'),
    overlay: document.getElementById('crt')
  });
  if (crt) {
    window.jmpaCrt = crt;
    document.getElementById('shutdown').addEventListener('click', function () {
      setStart(false);
      crt.power(false);
    });
    crt.update();
  }

  // ---- clock ----
  var clock = document.getElementById('clock');
  function tick() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 15000);
})();
