// Page-specific palette setup (palette.js is the shared master). Kept as a file, not inline, so the CSP can forbid inline scripts.
// The theme variant (html[data-variant], from config.yml params.variant; ?v=1|2|3 previews another) picks the default pair; dark is the default scheme.
(function () {
  var root = document.documentElement;
  var DEFAULTS = {
    '1': { primary: '#4f8cff', secondary: '#22d3ee' },
    '2': { primary: '#7cc4ff', secondary: '#6ee7b7' },
    '3': { primary: '#4da3ff', secondary: '#ffb454' }
  };
  var m = /[?&]v=([123])(?:&|$)/.exec(location.search);
  if (m) root.setAttribute('data-variant', m[1]);
  var variant = DEFAULTS[root.getAttribute('data-variant')] ? root.getAttribute('data-variant') : '1';
  root.setAttribute('data-variant', variant);

  // Dark unless the visitor has chosen a scheme. Remove once the palette.js mirror has the master's defaultScheme option (which this also passes).
  Palette.scheme = function () {
    try { var v = localStorage.getItem('scheme'); if (v === 'dark' || v === 'light') return v; } catch (e) { /* storage unavailable */ }
    return 'dark';
  };
  // The variant's own tokens apply only while the picker holds the default pair.
  Palette.onChange(function (p) { root.toggleAttribute('data-custom', p.custom); });

  Palette.init({
    defaultScheme: 'dark',
    defaults: DEFAULTS[variant],
    triggerId: 'jmpa-palette-trigger',
    popupId: 'jmpa-palette-popup',
    customIds: { primary: 'jmpa-custom-primary', secondary: 'jmpa-custom-secondary', reset: 'jmpa-custom-reset', note: 'jmpa-custom-note' },
    toggleId: 'theme-toggle',
    onScheme: function (scheme, toggle) {
      if (!toggle) return;
      var a = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 12 12" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">';
      toggle.innerHTML = scheme === 'light'
        ? a + '<rect x="3" y="1" width="4" height="1"/><rect x="2" y="2" width="3" height="1"/><rect x="1" y="3" width="3" height="6"/><rect x="2" y="9" width="8" height="1"/><rect x="3" y="10" width="7" height="1"/><rect x="9" y="8" width="2" height="1"/></svg>'
        : a + '<rect x="3" y="3" width="6" height="6"/><rect x="4" y="2" width="4" height="8"/><rect x="2" y="4" width="8" height="4"/><rect x="5" y="0" width="2" height="1"/><rect x="5" y="11" width="2" height="1"/><rect x="0" y="5" width="1" height="2"/><rect x="11" y="5" width="1" height="2"/></svg>';
    }
  });
})();
