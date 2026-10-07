(function () {
  /* Systems explorer (only on pages that have it) */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  if (tabs.length) {
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    var select = function (i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      var p = panels[i];
      p.classList.remove('swap');
      void p.offsetWidth;
      p.classList.add('swap');
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = null, k = e.key;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    /* Deep link: systems.html#lms opens that tab */
    var hash = location.hash.replace('#', '');
    var start = tabs.findIndex(function (t) { return t.id === 't-' + hash; });
    if (start > 0) select(start, false);
  }

  /* Reveal on scroll */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Theme toggle */
  var root = document.documentElement;
  var btn = document.getElementById('theme');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function current() { return root.dataset.theme || (mq.matches ? 'dark' : 'light'); }
  function paint() {
    var m = current();
    btn.dataset.mode = m;
    btn.setAttribute('aria-label', m === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    paint();
  });
  if (mq.addEventListener) mq.addEventListener('change', paint);
  paint();

  /* 3D: pointer tilt on cards + parallax on the hero scene (mouse only, no reduced motion) */
  var canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canTilt) {
    var MAX = { '.sys-card': 3.5, '.contact-card': 2.5, '.paper': 3, '.rows > div': 6, '.stage > .now': 8 };
    var sel = '.sys-card, .explore a, .tech-card, .paper, .rows > div, .stats li, .stage > .now, .contact-card';
    document.querySelectorAll(sel).forEach(function (el) {
      var max = 7;
      Object.keys(MAX).forEach(function (k) { if (el.matches(k)) max = MAX[k]; });
      var raf = 0, ev = null;
      function frame() {
        raf = 0;
        var r = el.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - .5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-(y - .5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      }
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { el.classList.add('is-tilting', 'will-tilt'); } });
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        ev = e;
        if (!raf) raf = requestAnimationFrame(frame);
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting', 'will-tilt');
        ['--rx', '--ry', '--mx', '--my'].forEach(function (v) { el.style.removeProperty(v); });
      });
    });

    document.querySelectorAll('.deco').forEach(function (deco) {
      var zone = deco.closest('.hero, .page-head') || document.body;
      var raf = 0, ev = null;
      zone.addEventListener('pointermove', function (e) {
        ev = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = zone.getBoundingClientRect();
          deco.style.setProperty('--px', (((ev.clientX - r.left) / r.width) - .5) * 2);
          deco.style.setProperty('--py', (((ev.clientY - r.top) / r.height) - .5) * 2);
        });
      });
      zone.addEventListener('pointerleave', function () { deco.style.setProperty('--px', 0); deco.style.setProperty('--py', 0); });
    });
  }
})();
