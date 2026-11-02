// jmpa.io - hamburger menu (palette + day/night are handled by palette.js). Trimmed from art.jmpa.io.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('jmpa-hamburger');
    var menu = document.getElementById('jmpa-mobile-menu');
    if (!btn || !menu) return;
    var setOpen = function (open) {
      menu.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    };
    btn.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  });
})();
