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

  /* 3D: smooth pointer tilt on cards + parallax on the hero scene (mouse only, no reduced motion) */
  var canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canTilt) {
    /* Let the entrance animation release its hold on `transform` so tilt can take over. */
    document.querySelectorAll('[data-rise]').forEach(function (el) {
      el.addEventListener('animationend', function () { el.classList.add('risen'); });
    });

    var MAX = { '.sys-card': 3.5, '.place': 5, '.contact-card': 2.5, '.paper': 3, '.rows > div': 6, '.stage > .now': 8 };
    var sel = '.sys-card, .place, .explore a, .tech-card, .paper, .rows > div, .stats li, .stage > .now, .contact-card';
    var EASE = 0.14;           /* fraction of the remaining distance covered each frame */
    var active = [];           /* cards currently hovered or settling */

    function lerp(a, b, k) { return a + (b - a) * k; }

    document.querySelectorAll(sel).forEach(function (el) {
      var max = 7;
      Object.keys(MAX).forEach(function (k) { if (el.matches(k)) max = MAX[k]; });
      var glow = document.createElement('span'), blob = document.createElement('i');
      glow.className = 'tilt-glow'; glow.setAttribute('aria-hidden', 'true'); glow.appendChild(blob); el.appendChild(glow);
      var st = { rx: 0, ry: 0, mx: 50, my: 50, lift: 0, trx: 0, try_: 0, tmx: 50, tmy: 50, tlift: 0, hover: false, raf: 0, box: null };

      function measure() {
        /* Flat (untransformed) footprint in page coordinates, so tilting never moves the hit area. */
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2 + window.pageXOffset, cy = r.top + r.height / 2 + window.pageYOffset;
        var w = el.offsetWidth, h = el.offsetHeight;
        st.box = { l: cx - w / 2, t: cy - h / 2, w: w, h: h };
      }
      function paint() {
        el.style.transform = 'perspective(900px) rotateX(' + st.rx.toFixed(3) + 'deg) rotateY(' + st.ry.toFixed(3) + 'deg) translateY(' + (-st.lift).toFixed(2) + 'px)';
        if (st.box) blob.style.transform = 'translate3d(' + (st.mx / 100 * st.box.w - 192).toFixed(1) + 'px,' + (st.my / 100 * st.box.h - 192).toFixed(1) + 'px,0)';
      }
      function tick() {
        st.raf = 0;
        st.rx = lerp(st.rx, st.trx, EASE); st.ry = lerp(st.ry, st.try_, EASE);
        st.mx = lerp(st.mx, st.tmx, EASE); st.my = lerp(st.my, st.tmy, EASE);
        st.lift = lerp(st.lift, st.tlift, EASE);
        paint();
        var settled = Math.abs(st.rx - st.trx) < .01 && Math.abs(st.ry - st.try_) < .01 && Math.abs(st.lift - st.tlift) < .05;
        if (!st.hover && settled) {
          el.classList.remove('is-tilting');
          el.style.removeProperty('transform');
          active.splice(active.indexOf(st), 1);
          return;
        }
        st.raf = requestAnimationFrame(tick);
      }
      function kick() { if (!st.raf) st.raf = requestAnimationFrame(tick); }

      st.enter = function (e) {
        if (st.hover) return;
        if (el.hasAttribute('data-rise')) el.classList.add('risen');   /* ensure the entrance animation isn't holding `transform` */
        measure(); st.hover = true; st.tlift = 4;
        el.classList.add('is-tilting');
        if (active.indexOf(st) < 0) active.push(st);
        st.move(e); kick();
      };
      st.move = function (e) {
        var b = st.box, x = ((e.clientX + window.pageXOffset) - b.l) / b.w, y = ((e.clientY + window.pageYOffset) - b.t) / b.h;
        st.try_ = (x - .5) * 2 * max; st.trx = -(y - .5) * 2 * max;
        st.tmx = Math.max(0, Math.min(100, x * 100)); st.tmy = Math.max(0, Math.min(100, y * 100));
      };
      st.leave = function () { st.hover = false; st.trx = 0; st.try_ = 0; st.tlift = 0; st.tmx = 50; st.tmy = 50; kick(); };
      st.inside = function (e) {
        var b = st.box, m = 2;
        return (e.clientX + window.pageXOffset) >= b.l - m && (e.clientX + window.pageXOffset) <= b.l + b.w + m && (e.clientY + window.pageYOffset) >= b.t - m && (e.clientY + window.pageYOffset) <= b.t + b.h + m;
      };
      st.el = el;
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') st.enter(e); });
      el._tilt = st;
    });

    /* One shared listener: decides enter/leave from the flat footprint, so the card never flickers while it moves. */
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      for (var i = 0; i < active.length; i++) {
        var st = active[i];
        if (!st.hover) continue;
        if (st.inside(e)) st.move(e); else st.leave();
      }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      active.slice().forEach(function (st) { if (st.hover) st.leave(); });
    });
    window.addEventListener('blur', function () {
      active.slice().forEach(function (st) { if (st.hover) st.leave(); });
    });

    /* Hero scene parallax, eased the same way. */
    document.querySelectorAll('.deco').forEach(function (deco) {
      var zone = deco.closest('.hero, .page-head') || document.body;
      var cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
      function step() {
        raf = 0; cx = lerp(cx, tx, .08); cy = lerp(cy, ty, .08);
        deco.style.setProperty('--px', cx.toFixed(4)); deco.style.setProperty('--py', cy.toFixed(4));
        if (Math.abs(cx - tx) > .001 || Math.abs(cy - ty) > .001) raf = requestAnimationFrame(step);
      }
      zone.addEventListener('pointermove', function (e) {
        var r = zone.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2;
        if (!raf) raf = requestAnimationFrame(step);
      }, { passive: true });
      zone.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    });
  }
})();
