/* ============================================================
   QuantumBlock — landing motion v2
   - Loads Locomotive Scroll (with fallback to native scroll)
   - Wires data-scroll observers on every animated element
   - Spring-counter for live stats
   - Honors prefers-reduced-motion
   - decorate() is page-aware: hero+sections on landing,
     hero+metrics+cards+table on track-record
   ============================================================ */

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTrack = !!document.querySelector('.metrics, .dist-grid, .tbl');

  // ---------- Inject Locomotive CSS + JS ----------
  function loadLocomotive() {
    if (reduced) return Promise.resolve(null);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.css';
    document.head.appendChild(css);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.js';
      s.onload = () => resolve(window.LocomotiveScroll || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  // ---------- Decorate DOM with data-scroll attrs + data-anim ----------
  function decorate() {
    const body = document.body;
    body.setAttribute('data-scroll-container', '');

    // ===== Common: hero =====
    qAdd('.hero h1', 'fade-up');
    qAdd('.hero p, .hero .hero-meta, .hero .cta-row, .hero .kicker', 'fade-up');
    qAdd('.hero-art', 'reveal-mask');

    // Live strip — fade in & make counters animate
    qAdd('.live-strip', 'fade-in');
    document.querySelectorAll('.live-strip').forEach(el => el.setAttribute('data-stagger', ''));

    // Each <section> headline + body
    document.querySelectorAll('main > section, body > section, section.card').forEach(sec => {
      const h2 = sec.querySelector('h2');
      if (h2 && !h2.hasAttribute('data-anim')) h2.setAttribute('data-anim', 'fade-up');
      const lead = sec.querySelector('p.lead, .section-lead');
      if (lead) lead.setAttribute('data-anim', 'fade-up');
    });

    // ===== Landing-only =====
    if (!isTrack) {
      // How grid → stagger
      const howGrid = document.querySelector('.how-grid');
      if (howGrid) howGrid.setAttribute('data-stagger', '');

      // Why grid → stagger
      const whyGrid = document.querySelector('.why-grid');
      if (whyGrid) whyGrid.setAttribute('data-stagger', '');

      // Anatomy
      document.querySelectorAll('.anatomy').forEach(el => el.setAttribute('data-anim', 'fade-up'));
      const anatomyRight = document.querySelector('.anatomy-right');
      if (anatomyRight) anatomyRight.setAttribute('data-stagger', '');

      // Why-quote
      document.querySelectorAll('.why-quote').forEach(el => el.setAttribute('data-anim', 'reveal-mask'));

      // Pricing
      const pricing = document.querySelector('.pricing');
      if (pricing) pricing.setAttribute('data-stagger', '');
    }

    // ===== Track-record-only =====
    if (isTrack) {
      // metrics grid: stagger metric cards
      const metrics = document.getElementById('metrics-grid');
      if (metrics) metrics.setAttribute('data-stagger', '');

      // chain visualization card
      qAdd('.chain-viz, .chain-card', 'fade-up');

      // open+recent panels
      document.querySelectorAll('.grid-2col > section.card').forEach(el => el.setAttribute('data-anim', 'fade-up'));

      // distributions
      qAdd('.dist-grid', 'fade-up');
      const distGrid = document.querySelector('.dist-grid');
      if (distGrid) distGrid.setAttribute('data-stagger', '');

      // full history card
      document.querySelectorAll('section.card').forEach((el, i) => {
        if (!el.hasAttribute('data-anim')) el.setAttribute('data-anim', 'fade-up');
      });

      // verify card
      qAdd('.verify-card, .verify', 'reveal-mask');

      // Re-run decoration after dynamic content (metrics + table) renders.
      // track.js fills these after DOMContentLoaded; observe and reapply.
      const reapply = () => {
        const metricCards = document.querySelectorAll('#metrics-grid > *');
        if (metricCards.length && !metricCards[0].hasAttribute('data-scroll')) {
          // they were inserted after our pass — flag the parent stagger fresh
          metrics.classList.remove('is-inview');
          // ensure scroll attrs propagate
          applyScrollAttrs();
          if (window.__qbScroll && window.__qbScroll.update) window.__qbScroll.update();
        }
      };
      // Polite observer
      const mo = new MutationObserver(reapply);
      if (metrics) mo.observe(metrics, { childList: true });
      const tblBody = document.querySelector('.tbl tbody, #tbl-body');
      if (tblBody) mo.observe(tblBody, { childList: true });
    }

    applyScrollAttrs();
  }

  function applyScrollAttrs() {
    document.querySelectorAll('[data-anim], [data-stagger]').forEach(el => {
      if (!el.hasAttribute('data-scroll')) el.setAttribute('data-scroll', '');
      if (!el.hasAttribute('data-scroll-class')) el.setAttribute('data-scroll-class', 'is-inview');
      if (!el.hasAttribute('data-scroll-offset')) el.setAttribute('data-scroll-offset', '15%, 0%');
      if (!el.hasAttribute('data-scroll-repeat')) el.setAttribute('data-scroll-repeat', 'false');
    });
  }

  function qAdd(sel, anim) {
    document.querySelectorAll(sel).forEach(el => {
      if (!el.hasAttribute('data-anim')) el.setAttribute('data-anim', anim);
    });
  }

  // ---------- Fallback IntersectionObserver (if Locomotive doesn't load) ----------
  function fallbackIO() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-inview');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('[data-anim], [data-stagger]').forEach(el => io.observe(el));
  }

  // ---------- Spring counter (Framer Motion-style) ----------
  function springCounter(el, target, duration = 1400) {
    const start = performance.now();
    const decimals = (target.toString().split('.')[1] || '').length;
    const ease = t => 1 - Math.pow(1 - t, 3); // cubic-out
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const v = ease(t) * target;
      el.textContent = v.toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(step);
  }
  function wireCounters() {
    const nums = document.querySelectorAll('.counter[data-target]');
    if (!nums.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const tgt = parseFloat(el.dataset.target);
          if (!isNaN(tgt)) springCounter(el, tgt, 1400);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    nums.forEach(n => io.observe(n));
  }

  // ---------- Boot ----------
  async function boot() {
    decorate();
    wireCounters();

    if (reduced) {
      // Show everything immediately
      document.querySelectorAll('[data-anim], [data-stagger]').forEach(el => el.classList.add('is-inview'));
      return;
    }

    const Locomotive = await loadLocomotive();
    if (!Locomotive) {
      fallbackIO();
      return;
    }

    try {
      const scroll = new Locomotive({
        el: document.querySelector('[data-scroll-container]'),
        smooth: true,
        smoothMobile: false,
        lerp: 0.085,
        multiplier: 1.0,
        class: 'is-inview',
        getDirection: true,
        reloadOnContextChange: true,
      });
      window.__qbScroll = scroll;

      // Re-evaluate on layout-affecting events
      window.addEventListener('load', () => scroll.update());
      const ro = new ResizeObserver(() => scroll.update());
      ro.observe(document.body);

      // Sync background canvas mouse position correctly when smooth-scrolling
      // (Locomotive transforms body, so clientY is fine — nothing to do.)
    } catch (err) {
      console.warn('Locomotive failed, falling back to IntersectionObserver', err);
      fallbackIO();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
