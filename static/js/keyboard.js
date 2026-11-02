// On-screen keyboard behaviour. The keys are real HTML (partials/jmpa-keyboard.html): link keys are <a>, action keys are <button>, the rest are visual.
// Keys are addressed by data-key (a KeyboardEvent.code-style name). It never listens to the real keyboard.
(function () {
  'use strict';
  var de = document.documentElement;
  var dock = document.getElementById('kbd');
  var screenEl = document.getElementById('screen');
  var echo = document.getElementById('echo');
  var stPage = document.getElementById('st-page');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var keys = {};   // code -> .k element
  var counts = {}; // code -> how many things are holding it down
  if (dock) [].forEach.call(dock.querySelectorAll('.k[data-key]'), function (k) { keys[k.getAttribute('data-key')] = k; });

  function hold(code) {
    var k = keys[code];
    if (!k) return;
    counts[code] = (counts[code] || 0) + 1;
    k.classList.add('down');
  }
  function release(code) {
    var k = keys[code];
    if (!k || !counts[code]) return;
    if (--counts[code] === 0) k.classList.remove('down');
  }
  function say(t) { if (echo) echo.textContent = t; }
  function name(code) { return code.replace(/^(Key|Digit)/, ''); }

  // ── the monitor's pages ──
  var PAGES = ['about', 'links', 'help'];
  var page = 'about';
  function setPage(p) {
    page = p;
    if (screenEl) {
      screenEl.setAttribute('data-page', p);
      [].forEach.call(screenEl.querySelectorAll('.pg'), function (el) { el.hidden = el.getAttribute('data-pg') !== p; });
    }
    if (stPage) stPage.textContent = p;
  }

  // ── the budgie ──
  var fly = document.getElementById('budgie-fly');
  function sendBudgie() {
    if (!fly) return;
    if (reduce.matches) { say('reduced motion: the budgie stays put'); return; }
    if (fly.classList.contains('go')) return;
    fly.classList.add('go');
    say('budgie: take off');
  }
  if (fly) fly.addEventListener('animationend', function (e) { if (e.animationName === 'fly-go') fly.classList.remove('go'); });

  function act(a) {
    if (a === 'theme') {
      var t = document.getElementById('theme-toggle');
      if (t) t.click();
      say('theme: ' + (de.classList.contains('dark') ? 'dark' : 'light'));
    } else if (a === 'bird') sendBudgie();
    else if (a === 'page') { setPage(PAGES[(PAGES.indexOf(page) + 1) % PAGES.length]); say('page: ' + page); }
    else if (a === 'help') { setPage(page === 'help' ? 'about' : 'help'); say('page: ' + page); }
    else if (a === 'home') { setPage('about'); say('page: about'); }
  }

  // Pointer and touch only: tapping or clicking a keycap presses it; link keys then follow their link, action keys run.
  // Keyboard access is the browser default (Tab to focus, Enter/Space on a focused button or link); nothing listens for key events.
  var touched = {};
  if (dock) {
    dock.addEventListener('pointerdown', function (e) {
      var k = e.target.closest && e.target.closest('.k');
      if (!k) return;
      var code = k.getAttribute('data-key');
      touched[e.pointerId] = code;
      hold(code);
      if (k.classList.contains('link')) say('opening ' + k.getAttribute('aria-label'));
      else if (!k.classList.contains('act')) say('key: ' + name(code));
    });
    dock.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-action]');
      if (b) act(b.getAttribute('data-action'));
    });
  }
  function lift(e) {
    var code = touched[e.pointerId];
    if (!code) return;
    delete touched[e.pointerId];
    release(code);
  }
  window.addEventListener('pointerup', lift);
  window.addEventListener('pointercancel', lift);

  // Animations pause while the tab is hidden.
  document.addEventListener('visibilitychange', function () { de.classList.toggle('is-hidden', document.hidden); });

  // Show/hide, remembered.
  var toggle = document.getElementById('kb-toggle');
  function sync() { if (toggle) toggle.setAttribute('aria-pressed', de.getAttribute('data-kb') === 'off' ? 'false' : 'true'); }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var off = de.getAttribute('data-kb') !== 'off';
      if (off) de.setAttribute('data-kb', 'off'); else de.removeAttribute('data-kb');
      try { localStorage.setItem('jmpa-kb', off ? 'off' : 'on'); } catch (err) { /* storage unavailable */ }
      sync();
    });
  }
  sync();
})();
