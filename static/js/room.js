// Animated pixel-art room: someone typing at a glowing screen, rain outside.
// Drawn on a 192x108 canvas, scaled up with CSS (image-rendering: pixelated).
(function () {
  var W = 192, H = 108;
  var cv = document.getElementById('room');
  if (!cv || !cv.getContext) return;
  var g = cv.getContext('2d');

  function r(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); }
  function a(alpha, fn) { g.globalAlpha = alpha; fn(); g.globalAlpha = 1; }

  // tiny seeded rng so the code on screen and the rain are stable per page load.
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  var SCREEN = { x: 62, y: 30, w: 76, h: 36 };
  var WIN = { x: 124, y: 10, w: 52, h: 46 };

  // code lines: arrays of [indent, length, colour].
  var codeColours = ['#7aa2ff', '#e8647c', '#9ece6a', '#e0af68', '#bb9af7', '#7dcfff'];
  var lines = [];
  var i, j, x;
  for (i = 0; i < 40; i++) {
    var segs = [], indent = (rnd() * 3 | 0) * 3;
    var n = 1 + (rnd() * 3 | 0);
    for (j = 0; j < n; j++) {
      var len = 3 + (rnd() * 10 | 0);
      segs.push([indent, len, codeColours[rnd() * codeColours.length | 0]]);
      indent += len + 2;
    }
    lines.push(segs);
  }

  var stars = [];
  for (i = 0; i < 14; i++) stars.push([WIN.x + 2 + (rnd() * (WIN.w - 4) | 0), WIN.y + 2 + (rnd() * 18 | 0), rnd() * 6]);

  var drops = [];
  for (i = 0; i < 26; i++) drops.push([rnd() * WIN.w, rnd() * WIN.h, 1 + rnd() * 1.5]);

  var city = [];
  for (x = 0; x < WIN.w; x += 4) city.push([x, 8 + (rnd() * 14 | 0), rnd()]);

  function wall(t) {
    r(0, 0, W, 80, '#15111f');
    r(0, 78, W, 2, '#0f0b17');
    r(0, 80, W, 28, '#1a1424');
    for (var x = 0; x < W; x += 24) r(x, 80, 1, 28, '#150f1d');

    // poster.
    r(14, 14, 22, 30, '#2a2140');
    r(16, 16, 18, 26, '#3a2b5c');
    r(21, 22, 8, 8, '#e8647c');
    r(18, 34, 14, 2, '#7aa2ff');
    r(18, 38, 9, 1, '#6a5f96');

    // shelf with a few things.
    r(14, 54, 48, 2, '#3b2a3f');
    r(18, 48, 4, 6, '#e0af68'); r(23, 46, 3, 8, '#7aa2ff'); r(27, 49, 4, 5, '#9ece6a');
    r(40, 50, 8, 4, '#2a2140'); r(41, 49, 6, 1, '#6a5f96');
    r(52, 47, 6, 7, '#bb9af7'); r(53, 45, 4, 2, '#9a7ee0');

    // window.
    r(WIN.x - 2, WIN.y - 2, WIN.w + 4, WIN.h + 4, '#2a2338');
    r(WIN.x, WIN.y, WIN.w, WIN.h, '#0c1530');
    r(WIN.x, WIN.y + 14, WIN.w, 14, '#111c3d');
    r(WIN.x, WIN.y + 28, WIN.w, WIN.h - 28, '#16254a');
    stars.forEach(function (s) {
      if (((t / 6 + s[2]) | 0) % 4 !== 0) r(s[0], s[1], 1, 1, '#cfd8ff');
    });
    r(WIN.x + 38, WIN.y + 5, 5, 5, '#f4efd2'); r(WIN.x + 39, WIN.y + 4, 3, 1, '#f4efd2'); r(WIN.x + 39, WIN.y + 10, 3, 1, '#f4efd2');
    var base = WIN.y + WIN.h;
    city.forEach(function (b) {
      r(WIN.x + b[0], base - b[1], 4, b[1], '#0a1022');
      for (var yy = base - b[1] + 2; yy < base - 2; yy += 3) {
        if (((t / 20 + b[0] + yy) | 0) % 5 !== 0) r(WIN.x + b[0] + 1, yy, 1, 1, '#e0af68');
      }
    });
    drops.forEach(function (d) {
      var px = WIN.x + ((d[0] - d[1] * 0.25 + WIN.w * 4) % WIN.w);
      var py = WIN.y + d[1];
      r(px, py, 1, 3, 'rgba(160,190,255,0.55)');
      d[1] += d[2];
      if (d[1] > WIN.h) { d[1] = -3; d[0] = rnd() * WIN.w; }
    });
    r(WIN.x + WIN.w / 2 - 1, WIN.y, 2, WIN.h, '#2a2338');
    r(WIN.x, WIN.y + WIN.h / 2 - 1, WIN.w, 2, '#2a2338');
    r(WIN.x - 4, WIN.y + WIN.h + 2, WIN.w + 8, 2, '#3b2a3f');
  }

  function desk() {
    r(16, 68, 160, 4, '#4a3550');
    r(16, 72, 160, 1, '#2a1d2e');
    r(22, 73, 4, 30, '#2f2233');
    r(166, 73, 4, 30, '#2f2233');
    r(26, 82, 140, 2, '#2a1d2e');
  }

  function monitor(t) {
    // stand + base.
    r(97, 66, 6, 3, '#2b2a38');
    r(90, 68, 20, 1, '#34334a');
    // bezel + screen.
    r(SCREEN.x - 2, SCREEN.y - 2, SCREEN.w + 4, SCREEN.h + 4, '#2b2a38');
    r(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, '#0e1a2b');
    r(SCREEN.x, SCREEN.y, SCREEN.w, 4, '#16263d');
    r(SCREEN.x + 2, SCREEN.y + 1, 2, 2, '#e8647c');
    r(SCREEN.x + 6, SCREEN.y + 1, 2, 2, '#e0af68');
    r(SCREEN.x + 10, SCREEN.y + 1, 2, 2, '#9ece6a');
    // scrolling code.
    var scroll = (t / 5) | 0;
    for (var row = 0; row < 9; row++) {
      var line = lines[(row + scroll) % lines.length];
      line.forEach(function (s) { r(SCREEN.x + 4 + s[0], SCREEN.y + 6 + row * 3.3, s[1], 1, s[2]); });
    }
    // blinking cursor at the end of the last line.
    if (((t / 4) | 0) % 2 === 0) r(SCREEN.x + 4 + ((scroll * 5) % 20), SCREEN.y + 6 + 8 * 3.3 - 1, 2, 3, '#f0eaff');
  }

  function radial(cx, cy, rad, rgb, alpha) {
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }

  function glow(t) {
    radial(100, 52, 70, '109,140,255', 0.2 + 0.03 * Math.sin(t / 3));
  }

  function keyboard() {
    r(82, 70, 36, 2, '#2b2a38');
    r(83, 69, 34, 1, '#3d3b55');
  }

  function chair() {
    r(86, 60, 28, 44, '#2a2433');
    r(88, 62, 24, 38, '#332b3f');
    r(98, 100, 4, 8, '#1e1828');
    r(88, 106, 24, 2, '#1e1828');
  }

  function person(t) {
    var typeA = ((t / 2) | 0) % 2, typeB = 1 - typeA;
    // torso.
    r(88, 70, 24, 30, '#54467f');
    r(88, 70, 24, 3, '#6a5aa0');
    r(97, 74, 6, 24, '#473b6e');
    // shoulders + hood.
    r(86, 64, 28, 8, '#5f4f90');
    r(90, 62, 20, 4, '#6a5aa0');
    // head (from behind): hair.
    r(94, 50, 12, 13, '#2b2233');
    r(95, 49, 10, 1, '#2b2233');
    r(96, 60, 8, 3, '#3a2f46');
    // headphones.
    r(93, 48, 14, 2, '#e8647c');
    r(91, 54, 3, 6, '#e8647c'); r(92, 55, 1, 4, '#ffb3c1');
    r(106, 54, 3, 6, '#e8647c'); r(107, 55, 1, 4, '#ffb3c1');
    // arms toward the keyboard.
    r(86, 72, 5, 6, '#5f4f90'); r(109, 72, 5, 6, '#5f4f90');
    r(87, 77 + typeA, 5, 3, '#54467f'); r(108, 77 + typeB, 5, 3, '#54467f');
    r(88, 79 + typeA, 3, 2, '#d9a68c'); r(109, 79 + typeB, 3, 2, '#d9a68c');
  }

  function lamp(t) {
    r(34, 68, 12, 2, '#2b2a38');
    r(39, 54, 2, 14, '#34334a');
    r(36, 51, 10, 4, '#e0af68');
    r(37, 55, 8, 1, '#ffe7b0');
    radial(41, 60, 34, '255,207,112', 0.16 + 0.02 * Math.sin(t / 5));
  }

  function mug(t) {
    r(146, 62, 8, 7, '#e8e2f4');
    r(147, 63, 6, 1, '#7a5a3c');
    r(154, 63, 2, 4, '#e8e2f4'); r(155, 64, 1, 2, '#15111f');
    for (var i = 0; i < 5; i++) {
      var sx = 149 + Math.round(Math.sin((t / 6) + i * 0.9) * 1.6);
      a(0.55 - i * 0.1, function () { r(sx, 59 - i * 2, 1, 2, '#e6e0ff'); });
    }
  }

  function plant(t) {
    r(160, 62, 9, 7, '#6a4b3a');
    r(161, 61, 7, 1, '#7d5a46');
    var sway = Math.round(Math.sin(t / 14));
    r(163, 52, 2, 9, '#2f7a4f');
    r(158 + sway, 50, 6, 3, '#3fa46a'); r(165 + sway, 48, 6, 3, '#3fa46a');
    r(160 + sway, 55, 5, 2, '#34905b'); r(165, 54, 6, 2, '#34905b');
  }

  function vignette() {
    a(0.35, function () {
      r(0, 0, W, 6, '#05030a'); r(0, H - 6, W, 6, '#05030a');
      r(0, 0, 6, H, '#05030a'); r(W - 6, 0, 6, H, '#05030a');
    });
    a(0.18, function () {
      r(0, 0, W, 12, '#05030a'); r(0, H - 12, W, 12, '#05030a');
    });
  }

  function frame(t) {
    wall(t);
    glow(t);
    desk();
    chair();
    monitor(t);
    keyboard();
    person(t);
    lamp(t);
    mug(t);
    plant(t);
    vignette();
  }

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t = 0;
  frame(t);
  if (still) return;

  // ~8fps gives it that lo-fi stutter, and keeps it light on battery.
  setInterval(function () {
    if (document.hidden) return;
    frame(++t);
  }, 125);
})();
