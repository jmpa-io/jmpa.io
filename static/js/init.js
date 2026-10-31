// Page-specific palette setup (palette.js is the shared master). Kept as a file, not inline, so the CSP can forbid inline scripts.
// The default pair is navy; art.jmpa.io keeps sunset.
Palette.init({
  defaults: { primary: '#0a2a6b', secondary: '#2f7fae' },
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
