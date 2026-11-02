// Page setup for the shared palette (palette.js is the shared master). A file, not inline, so the CSP can forbid inline scripts.
// Day with a soft pastel pair is the default; the visitor's pick (two colours, day or night) is remembered by palette.js.
(function () {
  var SUN = '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM5.6 19.8l-1.4-1.4 2.1-2.1 1.4 1.4zM17.7 7.7l-1.4-1.4 2.1-2.1 1.4 1.4z"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>';

  // Clicking the logo steps through: the desktop scene (the gif), then each of the icon versions shown big. Until the visitor clicks, the icon follows day / night.
  var LOGOS = ['meadow-day', 'dusk', 'night', 'autumn', 'sunrise', 'mist'];
  var VIEWS = ['desktop'].concat(LOGOS);
  var LOGO_KEY = 'jmpa-logo';

  function storedView() {
    try { var v = localStorage.getItem(LOGO_KEY); return VIEWS.indexOf(v) >= 0 ? v : null; } catch (e) { return null; }
  }
  function currentView() { return storedView() || 'desktop'; }
  function iconFor(view) {
    if (view !== 'desktop') return view;
    return document.documentElement.classList.contains('dark') ? 'night' : 'meadow-day';
  }
  function show(view) {
    var name = iconFor(view);
    document.documentElement.setAttribute('data-view', view === 'desktop' ? 'desktop' : 'icon');
    var img = document.getElementById('logo');
    if (img) img.src = '/logos/' + name + '-192.png';
    var big = document.getElementById('hero-icon');
    if (big) big.src = '/logos/' + name + '-192.png';
    [['link[rel="icon"][type="image/png"][sizes="16x16"]', 16], ['link[rel="icon"][type="image/png"][sizes="32x32"]', 32], ['link[rel="apple-touch-icon"]', 180]].forEach(function (x) {
      var l = document.querySelector(x[0]);
      if (l) l.href = '/logos/' + name + '-' + x[1] + '.png';
    });
  }

  Palette.init({
    defaultScheme: 'light',
    defaults: { primary: '#d6407f', secondary: '#7b6cff' },
    triggerId: 'jmpa-palette-trigger',
    popupId: 'jmpa-palette-popup',
    customIds: { primary: 'jmpa-custom-primary', secondary: 'jmpa-custom-secondary', reset: 'jmpa-custom-reset', note: 'jmpa-custom-note' },
    toggleId: 'theme-toggle',
    // the symbol shown is the mode you would switch to
    onScheme: function (scheme, toggle) {
      if (toggle) toggle.innerHTML = scheme === 'light' ? MOON : SUN;
      show(currentView());
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    show(currentView());
    var btn = document.getElementById('logo-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = VIEWS[(VIEWS.indexOf(currentView()) + 1) % VIEWS.length];
      try { localStorage.setItem(LOGO_KEY, next); } catch (e) { /* storage unavailable */ }
      show(next);
    });
  });
})();
