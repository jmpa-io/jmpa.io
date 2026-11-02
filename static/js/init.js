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
  try { if (localStorage.getItem('jmpa-kb') === 'off') root.setAttribute('data-kb', 'off'); } catch (e) { /* storage unavailable */ }
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
      var a = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
      toggle.innerHTML = scheme === 'light'
        ? a + '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>'
        : a + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    }
  });
})();
