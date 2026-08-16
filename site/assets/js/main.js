/*!
 * BANGWING IN — site behaviour, v5 "Angan"
 * Vanilla JS, no dependencies, no build step. One file, read top to bottom:
 *   1. helpers & feature checks     7. cursor glow field        13. lite-youtube facade
 *   2. year stamp                  8. magnetic primary CTA     14. back-to-top (injected)
 *   3. header scroll state         9. accordion                17. pointer tilt for cards (v5)
 *   4. nav toggle / mobile menu    10. reveal-on-scroll
 *   5. marquee/review looping      11. discord live stats
 *   6. count-up numbers            12. copy-to-clipboard chip (+ v5 celebration burst)
 *                                  16. scroll-progress thread (v5, folded into §3's loop)
 *
 * Every effect here is progressive enhancement: markup and content are
 * fully meaningful with this file absent. Everything motion-related is
 * gated behind prefers-reduced-motion, and every listener that runs on
 * scroll/pointermove is rAF-throttled.
 */
'use strict';

(() => {
  const doc = document;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $  = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));

  /* ----------------------------------------------------------------- */
  /* 2. YEAR STAMP                                                      */
  /* ----------------------------------------------------------------- */
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ----------------------------------------------------------------- */
  /* 3+15+16. ONE SCROLL LOOP — header state, back-to-top, hero drift,  */
  /*          scroll-progress thread (v5, lives on header::after)      */
  /* ----------------------------------------------------------------- */
  const header = $('.site-header');
  const heroLine = $('.hero-bg-line');
  let backToTopBtn = null; // assigned once created, see section 14
  let scrollTicking = false;
  const docEl = doc.documentElement;

  function onScrollFrame() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (backToTopBtn) backToTopBtn.classList.toggle('is-visible', y > 640);
    if (heroLine && !reduceMotion) {
      heroLine.style.transform = `translateY(${Math.min(36, y * 0.07)}px)`;
    }
    if (header) {
      const trackH = docEl.scrollHeight - docEl.clientHeight;
      const pct = trackH > 0 ? Math.min(1, Math.max(0, y / trackH)) : 0;
      header.style.setProperty('--p', pct.toFixed(4));
    }
    scrollTicking = false;
  }
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScrollFrame();

  /* ----------------------------------------------------------------- */
  /* 4. NAV TOGGLE / MOBILE MENU                                        */
  /* ----------------------------------------------------------------- */
  const navToggle = $('[data-nav-toggle]');
  const mobileMenu = doc.getElementById('mobile-menu');
  if (navToggle && mobileMenu) {
    doc.body.appendChild(mobileMenu);

    const focusSel = 'a[href], button:not([disabled])';
    let lastFocused = null;

    const openMenu = () => {
      lastFocused = doc.activeElement;
      navToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.setAttribute('data-open', 'true');
      doc.body.style.overflow = 'hidden';
      const first = $(focusSel, mobileMenu);
      if (first) first.focus({ preventScroll: true });
    };
    const closeMenu = (restoreFocus) => {
      navToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('data-open', 'false');
      doc.body.style.overflow = '';
      if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      }
    };

    navToggle.addEventListener('click', () => {
      navToggle.getAttribute('aria-expanded') === 'true' ? closeMenu(true) : openMenu();
    });
    mobileMenu.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeMenu(false);
    });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    mobileMenu.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || navToggle.getAttribute('aria-expanded') !== 'true') return;
      const items = $$(focusSel, mobileMenu);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth >= 1130 && navToggle.getAttribute('aria-expanded') === 'true') closeMenu(false);
      }, 120);
    });
  }

  /* ----------------------------------------------------------------- */
  /* 5. SEAMLESS MARQUEE / REVIEW-WALL LOOPING                          */
  /* ----------------------------------------------------------------- */
  if (!reduceMotion) {
    $$('.marquee-track, .review-track').forEach(track => {
      const originals = Array.from(track.children);
      originals.forEach(child => {
        const clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
    });
  }

  /* ----------------------------------------------------------------- */
  /* 6. COUNT-UP NUMBERS                                                */
  /* ----------------------------------------------------------------- */
  const numberFmt = new Intl.NumberFormat('en-IN');
  function runCountUp(el) {
    if (!el || el.dataset.counted === 'true') return;
    const target = parseFloat(el.dataset.countTo);
    if (Number.isNaN(target)) return;
    el.dataset.counted = 'true';
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';

    if (reduceMotion) {
      el.textContent = prefix + numberFmt.format(target) + suffix;
      return;
    }
    const duration = 1500;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + numberFmt.format(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------------- */
  /* 10. REVEAL-ON-SCROLL (drives 6 and the signature/toran dividers)   */
  /* ----------------------------------------------------------------- */
  $$('.reveal-group').forEach(group => {
    Array.from(group.children).forEach(child => child.classList.add('reveal-child'));
  });

  const revealTargets = $$('.reveal, .reveal-group, svg.signature-divider, svg.toran-divider');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => {
      el.classList.add('is-visible');
      if (el.matches('[data-count-to]')) runCountUp(el);
      $$('[data-count-to]', el).forEach(runCountUp);
    });
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.matches('[data-count-to]')) runCountUp(entry.target);
        $$('[data-count-to]', entry.target).forEach(runCountUp);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(el => io.observe(el));
  }

  /* ----------------------------------------------------------------- */
  /* 7. CURSOR-REACTIVE GLOW FIELD (hero, fine pointers only)           */
  /* ----------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$('.glow-field').forEach(field => {
      let raf = null;
      field.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = field.getBoundingClientRect();
          field.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
          field.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
          field.classList.add('is-active');
          raf = null;
        });
      });
      field.addEventListener('pointerleave', () => field.classList.remove('is-active'));
    });
  }

  /* ----------------------------------------------------------------- */
  /* 8. MAGNETIC PRIMARY BUTTON                                         */
  /* ----------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    $$('.btn-primary').forEach(btn => {
      let raf = null;
      btn.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = btn.getBoundingClientRect();
          const relX = e.clientX - r.left - r.width / 2;
          const relY = e.clientY - r.top - r.height / 2;
          btn.style.transform = `translate(${relX * 0.14}px, ${relY * 0.3 - 2}px)`;
          raf = null;
        });
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ----------------------------------------------------------------- */
  /* 9. ACCORDION                                                       */
  /* ----------------------------------------------------------------- */
  $$('[data-accordion]').forEach(group => {
    const exclusive = group.hasAttribute('data-exclusive');
    const triggers = $$('.accordion-trigger', group);
    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
        if (exclusive) triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
    });
  });

  /* ----------------------------------------------------------------- */
  /* 11. LIVE DISCORD STATS                                             */
  /* ----------------------------------------------------------------- */
  $$('[data-discord-stat]').forEach(async (pill) => {
    const code = pill.dataset.inviteCode;
    if (!code) return;
    const textEl = $('[data-discord-stat-text]', pill);
    const dot = $('.dot', pill);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=false`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) throw new Error('discord widget unavailable');
      const data = await res.json();
      const total = data.approximate_member_count;
      const online = data.approximate_presence_count;
      if (typeof total === 'number' && textEl) {
        const bits = [`${numberFmt.format(total)} members`];
        if (typeof online === 'number') bits.push(`${numberFmt.format(online)} online`);
        textEl.textContent = bits.join(' · ');
        if (dot) dot.classList.remove('is-offline');
      }
    } catch (err) {
      /* keep the static fallback that already lives in the markup */
    }
  });

  /* ----------------------------------------------------------------- */
  /* 12. COPY-TO-CLIPBOARD CHIP                                         */
  /* ----------------------------------------------------------------- */
  const PETAL_COLORS = ['var(--marigold)', 'var(--rani)', 'var(--gold)', 'var(--terracotta)'];
  function celebrateCopy(btn) {
    if (reduceMotion) return;
    for (let i = 0; i < 5; i++) {
      const petal = doc.createElement('span');
      petal.className = 'cc-petal';
      const angle = (Math.random() * 140) - 70;
      const dist = 16 + Math.random() * 14;
      petal.style.setProperty('--petal-color', PETAL_COLORS[i % PETAL_COLORS.length]);
      petal.style.setProperty('--petal-rot', `${Math.random() * 360}deg`);
      petal.style.setProperty('--petal-x', `${Math.cos(angle * Math.PI / 180) * dist}px`);
      petal.style.setProperty('--petal-y', `${-Math.abs(Math.sin(angle * Math.PI / 180) * dist) - 6}px`);
      petal.style.animationDelay = `${i * 30}ms`;
      btn.appendChild(petal);
      petal.addEventListener('animationend', () => petal.remove(), { once: true });
    }
  }
  $$('[data-copy-trigger]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copyValue || '';
      const label = $('[data-copy-label]', btn);
      const original = label ? label.textContent : '';
      const reset = () => { btn.removeAttribute('data-copied'); if (label) label.textContent = original; };
      try {
        await navigator.clipboard.writeText(value);
        btn.setAttribute('data-copied', 'true');
        if (label) label.textContent = 'Copied!';
        celebrateCopy(btn);
      } catch (err) {
        if (label) label.textContent = 'Copy failed';
      } finally {
        setTimeout(reset, 1800);
      }
    });
  });

  /* ----------------------------------------------------------------- */
  /* 13. LITE-YOUTUBE FACADE                                            */
  /* ----------------------------------------------------------------- */
  $$('[data-lite-youtube]').forEach(wrap => {
    const activate = () => {
      const id = wrap.dataset.liteYoutube;
      const title = wrap.dataset.videoTitle || 'Video';
      const iframe = doc.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      wrap.innerHTML = '';
      wrap.appendChild(iframe);
      wrap.removeAttribute('role');
      wrap.removeAttribute('tabindex');
    };
    wrap.addEventListener('click', activate);
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });

  /* ----------------------------------------------------------------- */
  /* 14. BACK-TO-TOP (injected — no HTML edits needed on any page)      */
  /* ----------------------------------------------------------------- */
  backToTopBtn = doc.createElement('button');
  backToTopBtn.type = 'button';
  backToTopBtn.className = 'back-to-top';
  backToTopBtn.setAttribute('aria-label', 'Back to top');
  backToTopBtn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6"/></svg>';
  doc.body.appendChild(backToTopBtn);
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ----------------------------------------------------------------- */
  /* 17. POINTER TILT FOR CARDS (v5, fine pointers only)                */
  /* ----------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const TILT_MAX = 6;
    $$('.card, .milestone, .event-card, .proof-badge').forEach(el => {
      let raf = null;
      el.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.setProperty('--tilt-ry', `${((px - 0.5) * TILT_MAX * 2).toFixed(2)}deg`);
          el.style.setProperty('--tilt-rx', `${((0.5 - py) * TILT_MAX * 2).toFixed(2)}deg`);
          raf = null;
        });
      });
      el.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        el.style.setProperty('--tilt-rx', '0deg');
        el.style.setProperty('--tilt-ry', '0deg');
      });
    });
  }
})();
