/* MASTER COPY (jmpa.io/static/js/crt.js) - mirrored byte-identically into portfolio.jcleal.me/public/crt.js; do not edit per-repo.
 *
 * Real barrel-distortion CRT curvature + power-on/off for the Win98 desktops.
 *
 * Structure (see crt.css):  .screen > .glass > ( .crt-content , .crt )
 *   .crt-content  everything the user sees and clicks (gets the SVG filter)
 *   .crt          pure-CSS overlay (scanlines, mask, vignette, grain, rolling band)
 * The strength is read from the `--crt` custom property on .screen (0..1), so the site's own toggle/slider
 * just sets that property; a MutationObserver picks it up.
 *
 * Decision (measured, see README "CRT"): an SVG filter (feDisplacementMap fed by a generated radial map, one
 * pass per colour channel so the fringe grows toward the edges like the chatroom shader) gives true barrel
 * curvature and keeps text legible; CSS 3D can only fake a tilted plane. Filters do not change hit-testing,
 * so pointer events are re-targeted through the same displacement function (click, dblclick, drag).
 * Curvature is off below 900px wide, on touch pointers, and whenever --crt is 0.
 */
(function () {
  'use strict';

  var K_MAX = 0.085; // displacement at full strength, as a fraction of half the screen size.
  var CHROMA = 0.04; // red/blue displacement differ from green by this fraction.
  var MIN_WIDTH = 900;
  var NS = 'http://www.w3.org/2000/svg';
  var MAP_W = 192;

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function mapDataUrl(w, h) {
    var mh = Math.max(8, Math.round((MAP_W * h) / w));
    var c = document.createElement('canvas');
    c.width = MAP_W;
    c.height = mh;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(MAP_W, mh);
    for (var y = 0; y < mh; y++) {
      for (var x = 0; x < MAP_W; x++) {
        var u = ((x + 0.5) / MAP_W) * 2 - 1;
        var v = ((y + 0.5) / mh) * 2 - 1;
        var f = u * u + v * v - 1;
        var i = (y * MAP_W + x) * 4;
        img.data[i] = Math.round(255 * (0.5 + 0.5 * u * f));
        img.data[i + 1] = Math.round(255 * (0.5 + 0.5 * v * f * (h / w))); // one scale serves both axes.
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  function attach(opts) {
    var screen = opts.screen;
    var glass = opts.glass;
    var content = opts.content;
    var overlay = opts.overlay;
    var uid = 'crt-curve';
    var k = 0;
    var mapKey = '';

    // overlay layers that need real elements (pseudo-elements are used up by scanlines + band).
    ['crt-grain', 'crt-flicker', 'crt-flash'].forEach(function (c) {
      var i = document.createElement('i');
      i.className = c;
      overlay.appendChild(i);
    });

    var standby = document.createElement('button');
    standby.type = 'button';
    standby.className = 'crt-standby';
    standby.hidden = true;
    standby.innerHTML = '<span class="crt-dot" aria-hidden="true"></span><span>click to power on</span>';
    glass.appendChild(standby);

    // ---- SVG filter ----
    var svg = el('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    var filter = el('filter', { id: uid, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
    var image = el('feImage', { result: 'map', preserveAspectRatio: 'none' });
    filter.appendChild(image);
    var disp = {};
    [['r', 1 + CHROMA, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
     ['g', 1, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
     ['b', 1 - CHROMA, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']].forEach(function (ch) {
      disp[ch[0]] = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + ch[0] });
      disp[ch[0]].dataset.mul = String(ch[1]);
      filter.appendChild(disp[ch[0]]);
      filter.appendChild(el('feColorMatrix', { in: 'd' + ch[0], type: 'matrix', values: ch[2], result: 'c' + ch[0] }));
    });
    filter.appendChild(el('feComposite', { in: 'cr', in2: 'cg', operator: 'arithmetic', k1: '0', k2: '1', k3: '1', k4: '0', result: 'rg' }));
    filter.appendChild(el('feComposite', { in: 'rg', in2: 'cb', operator: 'arithmetic', k1: '0', k2: '1', k3: '1', k4: '0' }));
    svg.appendChild(filter);
    document.body.appendChild(svg);

    function strength() {
      var v = parseFloat(getComputedStyle(screen).getPropertyValue('--crt'));
      return isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
    }

    function coarse() {
      return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    }

    function update() {
      var w = content.clientWidth;
      var h = content.clientHeight;
      k = strength() * K_MAX;
      if (!w || !h || k <= 0 || window.innerWidth < MIN_WIDTH || coarse()) {
        k = 0;
        if (content.style.filter) content.style.filter = '';
        if (screen.classList.contains('crt-curved')) screen.classList.remove('crt-curved');
        return;
      }
      var key = w + 'x' + h;
      if (key !== mapKey) {
        mapKey = key;
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', String(w));
        filter.setAttribute('height', String(h));
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        image.setAttribute('width', String(w));
        image.setAttribute('height', String(h));
        image.setAttribute('href', mapDataUrl(w, h));
      }
      Object.keys(disp).forEach(function (c) {
        disp[c].setAttribute('scale', String(k * w * parseFloat(disp[c].dataset.mul)));
      });
      var f = 'url(#' + uid + ')';
      if (content.style.filter !== f) content.style.filter = f;
      if (!screen.classList.contains('crt-curved')) screen.classList.add('crt-curved');
    }

    // Visible point -> the point of the (undistorted) layout that is drawn there.
    function toSource(x, y) {
      var r = content.getBoundingClientRect();
      var u = ((x - r.left) / r.width) * 2 - 1;
      var v = ((y - r.top) / r.height) * 2 - 1;
      var f = k * (u * u + v * v - 1);
      return {
        x: Math.min(r.right - 1, Math.max(r.left, x + (u * f * r.width) / 2)),
        y: Math.min(r.bottom - 1, Math.max(r.top, y + (v * f * r.height) / 2)),
      };
    }

    var FORM = 'input,textarea,select';
    function retarget(e) {
      if (!k || e.__crt || e.pointerType === 'touch') return;
      var t = e.target;
      if (!(t instanceof Element) || !content.contains(t) || t.closest(FORM)) return;
      var captured = typeof t.hasPointerCapture === 'function' && e.pointerId !== undefined && t.hasPointerCapture(e.pointerId);
      if (e.type === 'pointermove' && !captured) return;
      var q = toSource(e.clientX, e.clientY);
      var dest = captured ? t : document.elementFromPoint(q.x, q.y);
      if (!dest) return;
      var init = {
        bubbles: true, cancelable: true, composed: true, view: window, detail: e.detail,
        clientX: q.x, clientY: q.y, screenX: e.screenX, screenY: e.screenY,
        button: e.button, buttons: e.buttons, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
        pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
      };
      var copy = e.type.indexOf('pointer') === 0 ? new PointerEvent(e.type, init) : new MouseEvent(e.type, init);
      copy.__crt = true;
      e.stopImmediatePropagation();
      dest.dispatchEvent(copy);
    }
    ['pointerdown', 'pointermove', 'pointerup', 'click', 'dblclick'].forEach(function (t) {
      document.addEventListener(t, retarget, true);
    });

    new MutationObserver(update).observe(screen, { attributes: true, attributeFilter: ['style', 'class'] });
    if (window.ResizeObserver) new ResizeObserver(update).observe(content);
    window.addEventListener('resize', update);
    update();

    // ---- power on / off ----
    function power(on) {
      screen.classList.remove('crt-poweron');
      if (on) {
        screen.classList.remove('crt-off');
        standby.hidden = true;
        void screen.offsetWidth; // restart the animation.
        screen.classList.add('crt-poweron');
        setTimeout(function () { screen.classList.remove('crt-poweron'); }, 700);
      } else {
        screen.classList.add('crt-off');
        standby.hidden = false;
      }
      screen.dispatchEvent(new CustomEvent('crt:power', { detail: { on: on } }));
    }
    standby.addEventListener('click', function () { power(true); });

    // Inverse of toSource: where a layout point is drawn (fixed-point iteration; k is small).
    function toVisual(x, y) {
      var p = { x: x, y: y };
      for (var i = 0; i < 8; i++) {
        var s = toSource(p.x, p.y);
        p = { x: p.x + (x - s.x), y: p.y + (y - s.y) };
      }
      return p;
    }

    return {
      update: update,
      power: power,
      curvature: function () { return k; },
      toSource: toSource,
      toVisual: toVisual,
    };
  }

  window.Crt = { attach: attach, K_MAX: K_MAX };
})();
