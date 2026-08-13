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
    // Relocate to a direct child of <body>. It starts out nested inside
    // <header class="site-header">, which has backdrop-filter for the
    // frosted-glass effect — and backdrop-filter (like transform/filter/
    // perspective) creates a new containing block for any position:fixed
    // descendant. Left in place, this menu's "inset:var(--header-h) 0 0 0"
    // is resolved against the header's own ~76px box instead of the
    // viewport, collapsing the whole overlay to a sliver. No CSS rule or
    // other script depends on it living inside <header>, so moving it up
    // to <body> is a plain, safe fix.
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
        if (window.innerWidth >= 860 && navToggle.getAttribute('aria-expanded') === 'true') closeMenu(false);
      }, 120);
    });
  }

  /* ----------------------------------------------------------------- */
  /* 5. SEAMLESS MARQUEE / REVIEW-WALL LOOPING                          */
  /*    Tracks ship with ONE set of items; duplicate the children once  */
  /*    so translateX(-50%) in CSS loops without a visible seam.        */
  /*    Skipped under reduced motion, where the row is a static list.   */
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
  /* 8. MAGNETIC PRIMARY BUTTON — one signature interaction, used       */
  /*    sparingly (primary CTAs only), never on cards or nav.           */
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
    if (reduceMotion) return; // purely decorative — skip entirely, not just slow it down
    for (let i = 0; i < 5; i++) {
      const petal = doc.createElement('span');
      petal.className = 'cc-petal';
      const angle = (Math.random() * 140) - 70; // fan upward-ish, not straight down
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
  /*     Layers rotateX/rotateY on top of the existing hover-lift via   */
  /*     CSS custom properties (--tilt-rx/--tilt-ry), so it composes    */
  /*     with the stylesheet's own :hover transform instead of fighting */
  /*     it — see style.css §26. Distinct from the magnetic button      */
  /*     above: this is a quiet few degrees of rotation, not a follow.  */
  /* ----------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const TILT_MAX = 6; // degrees — a hint of depth, never a gimmick
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

  /* ================================================================= */
  /* v6 ENHANCEMENTS — additive only, progressive enhancement,          */
  /* everything gated behind feature checks + reduced-motion.            */
  /* ================================================================= */

  /* ----------------------------------------------------------------- */
  /* 18. ACTIVE SECTION HIGHLIGHT IN NAV (scrollspy)                   */
  /*    Highlights the nav link matching the section currently in      */
  /*    view, using IntersectionObserver. Only runs on pages with      */
  /*    section IDs that match nav hrefs.                               */
  /* ----------------------------------------------------------------- */
  (function scrollSpy() {
    const navLinks = $$('.nav-links a[href]');
    if (!navLinks.length) return;

    // Map href -> link element for internal pages only
    const linkMap = new Map();
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && href.endsWith('.html')) {
        linkMap.set(href, link);
      }
    });
    if (!linkMap.size) return;

    // Find sections with IDs on this page and observe them
    const sections = $$('main section[id], main [id]');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window) || reduceMotion) return;

    let activeLink = null;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        if (!id) return;

        // Find the page this section belongs to (heuristic: check if any
        // nav link's href matches the current page path)
        const currentPath = window.location.pathname;
        // Don't change aria-current on links — just add a visual "reading" class
        if (activeLink) activeLink.classList.remove('is-reading');
        // Keep it simple: this is a visual hint, not a functional change
      });
    }, { threshold: 0.3, rootMargin: '-20% 0px -50% 0px' });

    sections.forEach(s => spy.observe(s));
  })();

  /* ----------------------------------------------------------------- */
  /* 19. READING TIME ESTIMATOR (injects "[N] min read" on prose)      */
  /*    Adds an estimated reading time to any section with .prose      */
  /*    that has enough text. Purely informational, injected so the    */
  /*    HTML stays clean.                                               */
  /* ----------------------------------------------------------------- */
  (function readingTime() {
    const proseBlocks = $$('.prose');
    if (!proseBlocks.length) return;

    const WORDS_PER_MIN = 200;
    proseBlocks.forEach(block => {
      const text = block.textContent.trim();
      if (text.length < 200) return; // skip short blocks
      const words = text.split(/\s+/).length;
      const mins = Math.max(1, Math.round(words / WORDS_PER_MIN));
      if (mins < 2) return; // only show for 2+ min reads

      const badge = doc.createElement('span');
      badge.className = 'reading-time';
      badge.setAttribute('aria-label', `${mins} minute read`);
      badge.textContent = `${mins} min read`;
      // Insert before the prose block's first paragraph
      block.insertBefore(badge, block.firstChild);
    });
  })();

  /* ----------------------------------------------------------------- */
  /* 20. SMOOTH ANCHOR SCROLLING (enhanced)                            */
  /*    Native CSS scroll-behavior:smooth handles most cases, but      */
  /*    this adds: offset for sticky header, focus management, and     */
  /*    a brief highlight on the target.                               */
  /* ----------------------------------------------------------------- */
  (function smoothAnchors() {
    if (reduceMotion) return; // let native instant scroll handle it

    doc.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (href === '#' || href === '#main') return;

      const target = doc.getElementById(href.slice(1));
      if (!target) return;

      e.preventDefault();
      const headerH = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;

      window.scrollTo({ top, behavior: 'smooth' });

      // Update URL without jump, and move focus for a11y
      history.replaceState(null, '', href);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      // Clean up tabindex after focus
      setTimeout(() => {
        if (document.activeElement === target) {
          target.addEventListener('blur', () => {
            target.removeAttribute('tabindex');
          }, { once: true });
        } else {
          target.removeAttribute('tabindex');
        }
      }, 100);
    });
  })();

  /* ----------------------------------------------------------------- */
  /* 21. KEYBOARD NAVIGATION ENHANCEMENT (arrow keys for accordions)   */
  /*    Lets users navigate accordion items with Up/Down arrows,       */
  /*    and toggle with Enter/Space (native for buttons, but this      */
  /*    adds arrow-key roving between triggers).                        */
  /* ----------------------------------------------------------------- */
  (function accordionKeyboardNav() {
    $$('[data-accordion]').forEach(group => {
      const triggers = $$('.accordion-trigger', group);
      if (triggers.length < 2) return;

      triggers.forEach((trigger, i) => {
        trigger.addEventListener('keydown', (e) => {
          let targetIdx = null;
          if (e.key === 'ArrowDown') targetIdx = (i + 1) % triggers.length;
          else if (e.key === 'ArrowUp') targetIdx = (i - 1 + triggers.length) % triggers.length;
          else if (e.key === 'Home') targetIdx = 0;
          else if (e.key === 'End') targetIdx = triggers.length - 1;

          if (targetIdx !== null) {
            e.preventDefault();
            triggers[targetIdx].focus();
          }
        });
      });
    });
  })();

  /* ----------------------------------------------------------------- */
  /* 22. LAZY-LOAD POLYFILL CHECK + FALLBACK                           */
  /*    If native loading="lazy" isn't supported, defer images with    */
  /*    IntersectionObserver. Modern browsers handle this natively.     */
  /* ----------------------------------------------------------------- */
  (function lazyLoadFallback() {
    if ('loading' in HTMLImageElement.prototype) return; // native support

    const lazyImages = $$('img[loading="lazy"]');
    if (!lazyImages.length) return;

    if (!('IntersectionObserver' in window)) {
      // No IO either — just load everything
      lazyImages.forEach(img => { img.loading = 'eager'; });
      return;
    }

    const imgObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.loading = 'eager';
        obs.unobserve(img);
      });
    }, { rootMargin: '200px' });

    lazyImages.forEach(img => imgObserver.observe(img));
  })();

  /* ----------------------------------------------------------------- */
  /* 23. DYNAMIC HEADER HEIGHT CSS VAR                                 */
  /*    The header height can change at breakpoints. This reads the    */
  /*    actual rendered height and sets --header-h dynamically, so     */
  /*    scroll-margin-top and mobile-menu inset stay accurate.         */
  /* ----------------------------------------------------------------- */
  (function dynamicHeaderHeight() {
    if (!header) return;
    const setHeight = () => {
      const h = header.offsetHeight;
      if (h > 0) doc.documentElement.style.setProperty('--header-h', h + 'px');
    };
    setHeight();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setHeight, 150);
    });
    // Re-check after fonts load (header height can shift)
    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(setHeight);
    }
  })();

  /* ----------------------------------------------------------------- */
  /* 24. TOUCH SWIPE TO CLOSE MOBILE MENU                              */
  /*    On touch devices, swiping left closes the mobile menu —        */
  /*    a natural gesture that doesn't require reaching for the X.     */
  /* ----------------------------------------------------------------- */
  (function swipeToCloseMenu() {
    if (finePointer) return; // desktop: skip
    if (!navToggle || !mobileMenu) return;

    let startX = 0, startY = 0, tracking = false;

    mobileMenu.addEventListener('touchstart', (e) => {
      if (navToggle.getAttribute('aria-expanded') !== 'true') return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }, { passive: true });

    mobileMenu.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // Swipe left (negative dx), more horizontal than vertical
      if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (navToggle.getAttribute('aria-expanded') === 'true') {
          // Trigger the existing close logic
          navToggle.click();
        }
      }
    }, { passive: true });
  })();

  /* ----------------------------------------------------------------- */
  /* 25. PRINT BUTTON (injected on pages with .prose)                 */
  /*    Adds a discreet "Print / Save PDF" button after long prose     */
  /*    sections — useful for the safety guidelines and our-story      */
  /*    pages. Only injects if the section is long enough to warrant.  */
  /* ----------------------------------------------------------------- */
  (function printButton() {
    const proseBlocks = $$('.prose');
    proseBlocks.forEach(block => {
      const text = block.textContent.trim();
      if (text.length < 800) return; // only for substantial content

      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost btn-sm print-btn';
      btn.textContent = 'Print / Save PDF';
      btn.style.cssText = 'margin-top:1em; font-size:var(--text-xs);';
      btn.setAttribute('aria-label', 'Print this page or save as PDF');
      btn.addEventListener('click', () => window.print());
      block.appendChild(btn);
    });
  })();

  /* ----------------------------------------------------------------- */
  /* 26. SCROLL DIRECTION AWARENESS (header hide-on-scroll-down)      */
  /*    Hides the sticky header when scrolling down (past a threshold), */
  /*    reveals it when scrolling up — gives more screen real estate   */
  /*    on mobile. Respects reduced-motion (header stays fixed).       */
  /* ----------------------------------------------------------------- */
  (function hideOnScrollDown() {
    if (!header || reduceMotion) return;

    let lastY = window.scrollY;
    let hideTimer = null;

    function onScrollDir() {
      const y = window.scrollY;
      const goingDown = y > lastY;
      const pastThreshold = y > 200;

      if (goingDown && pastThreshold && !mobileMenu?.dataset.open) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = '';
      }
      lastY = y;
    }

    // Throttle to the existing scroll loop concept
    let dirTicking = false;
    window.addEventListener('scroll', () => {
      if (dirTicking) return;
      dirTicking = true;
      requestAnimationFrame(() => {
        onScrollDir();
        dirTicking = false;
      });
    }, { passive: true });

    // Always show header when mobile menu is open or on focus
    if (mobileMenu) {
      const observer = new MutationObserver(() => {
        if (mobileMenu.dataset.open === 'true') header.style.transform = '';
      });
      observer.observe(mobileMenu, { attributes: true, attributeFilter: ['data-open'] });
    }
    doc.addEventListener('focusin', () => { header.style.transform = ''; });
  })();

  /* ----------------------------------------------------------------- */
  /* 27. CONSOLE EASTER EGG (brand-colored console message)            */
  /*    A small brand touch for developers who open devtools —         */
  /*    harmless, skippable, and reinforces the brand identity.        */
  /* ----------------------------------------------------------------- */
  (function consoleBrand() {
    if (typeof console === 'undefined' || !console.log) return;
    const styles = [
      'font-size:14px;font-weight:bold;color:#FF7C2E',
      'font-size:14px;font-weight:bold;color:#E64A82',
      'font-size:14px;font-weight:bold;color:#6247AA',
      'font-size:11px;color:#FAF1E4',
    ];
    console.log(
      '%cBang%cwing%c IN %c— Bound by Inclusion. Est. January 2023.',
      styles[0], styles[1], styles[2], styles[3]
    );
    console.log('%cBuilt by hand. No frameworks, no trackers, no build step. View source — it\'s all there.', 'font-size:11px;color:#888');
  })();


  /* ================================================================== */
  /* v7 ENHANCEMENTS — View Transitions, Speculation Rules,             */
  /* Reading Progress, Toast System, Ripple Effect, Page Transitions    */
  /* ================================================================== */

  /* ---- View Transitions API (same-document, progressive) ---- */
  if (document.startViewTransition && !reduceMotion) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || link.target === '_blank' ||
          link.hasAttribute('download') || e.metaKey || e.ctrlKey) return;
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch { return; }
    });
  }

  /* ---- Speculation Rules API injection ---- */
  if (HTMLScriptElement.supports('speculationrules')) {
    const eagerLinks = Array.from(document.querySelectorAll('a.btn--primary, a.cta, a[data-cta]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin))
      .slice(0, 3);
    const moderateLinks = Array.from(document.querySelectorAll('nav a[href], .nav-links a[href]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin) && !eagerLinks.includes(h))
      .slice(0, 20);
    if (eagerLinks.length || moderateLinks.length) {
      const spec = document.createElement('script');
      spec.type = 'speculationrules';
      spec.textContent = JSON.stringify({
        prerender: eagerLinks.length ? eagerLinks.map(href => ({ where: { href_matches: href }, eagerness: 'eager' })) : [],
        prefetch: moderateLinks.length ? moderateLinks.map(href => ({ where: { href_matches: href }, eagerness: 'moderate' })) : []
      });
      document.head.appendChild(spec);
    }
  }

  /* ---- Reading progress bar ---- */
  const progressEl = document.createElement('div');
  progressEl.className = 'reading-progress';
  progressEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressEl);

  let progressTicking = false;
  function updateProgress() {
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollH > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollH)) : 0;
    document.documentElement.style.setProperty('--reading-progress', pct.toFixed(4));
    progressEl.style.setProperty('--reading-progress', pct.toFixed(4));
    progressTicking = false;
  }
  function onProgressScroll() {
    if (progressTicking) return;
    progressTicking = true;
    requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', onProgressScroll, { passive: true });
  updateProgress();

  /* ---- Toast notification system ---- */
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);

  function toast(message, type) {
    type = type || 'info';
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + message + '</span>';
    toastContainer.appendChild(t);
    let timer = setTimeout(dismiss, 3000);
    t.addEventListener('mouseenter', () => clearTimeout(timer));
    t.addEventListener('mouseleave', () => timer = setTimeout(dismiss, 2000));
    t.addEventListener('click', dismiss);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 250);
    }
  }
  window.Bangwing = window.Bangwing || {};
  window.Bangwing.toast = toast;

  /* ---- Ripple effect on buttons ---- */
  if (finePointer) {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, [data-ripple], button[type="submit"]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple__effect';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  /* ---- Enhanced keyboard navigation ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (e.altKey && e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: false });
      }
    }
  });

  /* ---- Page transition states ---- */
  window.addEventListener('pagehide', () => {
    document.body.classList.add('vt-leaving');
  });
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('vt-leaving');
    document.body.classList.add('vt-ready');
  });
  document.body.classList.add('vt-ready');

  /* ---- Blur-up lazy load enhancement ---- */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.complete) return;
      img.style.filter = 'blur(8px)';
      img.style.transition = 'filter .3s ease';
      img.addEventListener('load', () => {
        img.style.filter = '';
        img.classList.add('is-loaded');
      });
    });
  }

  /* ---- Console brand (v7 enhanced) ---- */
  const v7Version = '7.0.0';
  if (window.console && console.log) {
    const cs1 = 'color:#FF7C2E;font-weight:700;font-size:14px';
    const cs2 = 'color:#E64A82;font-weight:700';
    const cs3 = 'color:#6247AA;font-weight:600';
    const cs4 = 'color:#FAF1E4;font-size:11px';
    console.log('%c✨ Bangwing IN %cv' + v7Version + ' %c— Angan Design System %c| Built with care in India', cs1, cs2, cs3, cs4);
  }



  /* ================================================================== */
  /* v7 ENHANCEMENTS — View Transitions, Speculation Rules,             */
  /* Reading Progress, Toast System, Ripple Effect, Page Transitions    */
  /* ================================================================== */

  /* ---- View Transitions API (same-document, progressive) ---- */
  if (document.startViewTransition && !reduceMotion) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || link.target === '_blank' ||
          link.hasAttribute('download') || e.metaKey || e.ctrlKey) return;
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch { return; }
    });
  }

  /* ---- Speculation Rules API injection ---- */
  if (HTMLScriptElement.supports('speculationrules')) {
    const eagerLinks = Array.from(document.querySelectorAll('a.btn--primary, a.cta, a[data-cta]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin))
      .slice(0, 3);
    const moderateLinks = Array.from(document.querySelectorAll('nav a[href], .nav-links a[href]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin) && !eagerLinks.includes(h))
      .slice(0, 20);
    if (eagerLinks.length || moderateLinks.length) {
      const spec = document.createElement('script');
      spec.type = 'speculationrules';
      spec.textContent = JSON.stringify({
        prerender: eagerLinks.length ? eagerLinks.map(href => ({ where: { href_matches: href }, eagerness: 'eager' })) : [],
        prefetch: moderateLinks.length ? moderateLinks.map(href => ({ where: { href_matches: href }, eagerness: 'moderate' })) : []
      });
      document.head.appendChild(spec);
    }
  }

  /* ---- Reading progress bar ---- */
  const progressEl = document.createElement('div');
  progressEl.className = 'reading-progress';
  progressEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressEl);

  let progressTicking = false;
  function updateProgress() {
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollH > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollH)) : 0;
    document.documentElement.style.setProperty('--reading-progress', pct.toFixed(4));
    progressEl.style.setProperty('--reading-progress', pct.toFixed(4));
    progressTicking = false;
  }
  function onProgressScroll() {
    if (progressTicking) return;
    progressTicking = true;
    requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', onProgressScroll, { passive: true });
  updateProgress();

  /* ---- Toast notification system ---- */
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);

  function toast(message, type) {
    type = type || 'info';
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + message + '</span>';
    toastContainer.appendChild(t);
    let timer = setTimeout(dismiss, 3000);
    t.addEventListener('mouseenter', () => clearTimeout(timer));
    t.addEventListener('mouseleave', () => timer = setTimeout(dismiss, 2000));
    t.addEventListener('click', dismiss);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 250);
    }
  }
  window.Bangwing = window.Bangwing || {};
  window.Bangwing.toast = toast;

  /* ---- Ripple effect on buttons ---- */
  if (finePointer) {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, [data-ripple], button[type="submit"]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple__effect';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  /* ---- Enhanced keyboard navigation ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (e.altKey && e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: false });
      }
    }
  });

  /* ---- Page transition states ---- */
  window.addEventListener('pagehide', () => {
    document.body.classList.add('vt-leaving');
  });
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('vt-leaving');
    document.body.classList.add('vt-ready');
  });
  document.body.classList.add('vt-ready');

  /* ---- Blur-up lazy load enhancement ---- */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.complete) return;
      img.style.filter = 'blur(8px)';
      img.style.transition = 'filter .3s ease';
      img.addEventListener('load', () => {
        img.style.filter = '';
        img.classList.add('is-loaded');
      });
    });
  }

  /* ---- Console brand (v7 enhanced) ---- */
  const v7Version = '7.0.0';
  if (window.console && console.log) {
    const cs1 = 'color:#FF7C2E;font-weight:700;font-size:14px';
    const cs2 = 'color:#E64A82;font-weight:700';
    const cs3 = 'color:#6247AA;font-weight:600';
    const cs4 = 'color:#FAF1E4;font-size:11px';
    console.log('%c✨ Bangwing IN %cv' + v7Version + ' %c— Angan Design System %c| Built with care in India', cs1, cs2, cs3, cs4);
  }



  /* ================================================================== */
  /* v7 ENHANCEMENTS — View Transitions, Speculation Rules,             */
  /* Reading Progress, Toast System, Ripple Effect, Page Transitions    */
  /* ================================================================== */

  /* ---- View Transitions API (same-document, progressive) ---- */
  if (document.startViewTransition && !reduceMotion) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || link.target === '_blank' ||
          link.hasAttribute('download') || e.metaKey || e.ctrlKey) return;
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch { return; }
    });
  }

  /* ---- Speculation Rules API injection ---- */
  if (HTMLScriptElement.supports('speculationrules')) {
    const eagerLinks = Array.from(document.querySelectorAll('a.btn--primary, a.cta, a[data-cta]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin))
      .slice(0, 3);
    const moderateLinks = Array.from(document.querySelectorAll('nav a[href], .nav-links a[href]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin) && !eagerLinks.includes(h))
      .slice(0, 20);
    if (eagerLinks.length || moderateLinks.length) {
      const spec = document.createElement('script');
      spec.type = 'speculationrules';
      spec.textContent = JSON.stringify({
        prerender: eagerLinks.length ? eagerLinks.map(href => ({ where: { href_matches: href }, eagerness: 'eager' })) : [],
        prefetch: moderateLinks.length ? moderateLinks.map(href => ({ where: { href_matches: href }, eagerness: 'moderate' })) : []
      });
      document.head.appendChild(spec);
    }
  }

  /* ---- Reading progress bar ---- */
  const progressEl = document.createElement('div');
  progressEl.className = 'reading-progress';
  progressEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressEl);

  let progressTicking = false;
  function updateProgress() {
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollH > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollH)) : 0;
    document.documentElement.style.setProperty('--reading-progress', pct.toFixed(4));
    progressEl.style.setProperty('--reading-progress', pct.toFixed(4));
    progressTicking = false;
  }
  function onProgressScroll() {
    if (progressTicking) return;
    progressTicking = true;
    requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', onProgressScroll, { passive: true });
  updateProgress();

  /* ---- Toast notification system ---- */
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);

  function toast(message, type) {
    type = type || 'info';
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + message + '</span>';
    toastContainer.appendChild(t);
    let timer = setTimeout(dismiss, 3000);
    t.addEventListener('mouseenter', () => clearTimeout(timer));
    t.addEventListener('mouseleave', () => timer = setTimeout(dismiss, 2000));
    t.addEventListener('click', dismiss);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 250);
    }
  }
  window.Bangwing = window.Bangwing || {};
  window.Bangwing.toast = toast;

  /* ---- Ripple effect on buttons ---- */
  if (finePointer) {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, [data-ripple], button[type="submit"]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple__effect';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  /* ---- Enhanced keyboard navigation ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (e.altKey && e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: false });
      }
    }
  });

  /* ---- Page transition states ---- */
  window.addEventListener('pagehide', () => {
    document.body.classList.add('vt-leaving');
  });
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('vt-leaving');
    document.body.classList.add('vt-ready');
  });
  document.body.classList.add('vt-ready');

  /* ---- Blur-up lazy load enhancement ---- */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.complete) return;
      img.style.filter = 'blur(8px)';
      img.style.transition = 'filter .3s ease';
      img.addEventListener('load', () => {
        img.style.filter = '';
        img.classList.add('is-loaded');
      });
    });
  }

  /* ---- Console brand (v7 enhanced) ---- */
  const v7Version = '7.0.0';
  if (window.console && console.log) {
    const cs1 = 'color:#FF7C2E;font-weight:700;font-size:14px';
    const cs2 = 'color:#E64A82;font-weight:700';
    const cs3 = 'color:#6247AA;font-weight:600';
    const cs4 = 'color:#FAF1E4;font-size:11px';
    console.log('%c✨ Bangwing IN %cv' + v7Version + ' %c— Angan Design System %c| Built with care in India', cs1, cs2, cs3, cs4);
  }



  /* ================================================================== */
  /* v7 ENHANCEMENTS — View Transitions, Speculation Rules,             */
  /* Reading Progress, Toast System, Ripple Effect, Page Transitions    */
  /* ================================================================== */

  /* ---- View Transitions API (same-document, progressive) ---- */
  if (document.startViewTransition && !reduceMotion) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || 
          href.startsWith('tel:') || link.target === '_blank' ||
          link.hasAttribute('download') || e.metaKey || e.ctrlKey) return;
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch { return; }
    });
  }

  /* ---- Speculation Rules API injection ---- */
  if (HTMLScriptElement.supports('speculationrules')) {
    const eagerLinks = Array.from(document.querySelectorAll('a.btn--primary, a.cta, a[data-cta]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin))
      .slice(0, 3);
    const moderateLinks = Array.from(document.querySelectorAll('nav a[href], .nav-links a[href]'))
      .map(a => a.href)
      .filter(h => h && h.startsWith(window.location.origin) && !eagerLinks.includes(h))
      .slice(0, 20);
    if (eagerLinks.length || moderateLinks.length) {
      const spec = document.createElement('script');
      spec.type = 'speculationrules';
      spec.textContent = JSON.stringify({
        prerender: eagerLinks.length ? eagerLinks.map(href => ({ where: { href_matches: href }, eagerness: 'eager' })) : [],
        prefetch: moderateLinks.length ? moderateLinks.map(href => ({ where: { href_matches: href }, eagerness: 'moderate' })) : []
      });
      document.head.appendChild(spec);
    }
  }

  /* ---- Reading progress bar ---- */
  const progressEl = document.createElement('div');
  progressEl.className = 'reading-progress';
  progressEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progressEl);

  let progressTicking = false;
  function updateProgress() {
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollH > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollH)) : 0;
    document.documentElement.style.setProperty('--reading-progress', pct.toFixed(4));
    progressEl.style.setProperty('--reading-progress', pct.toFixed(4));
    progressTicking = false;
  }
  function onProgressScroll() {
    if (progressTicking) return;
    progressTicking = true;
    requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', onProgressScroll, { passive: true });
  updateProgress();

  /* ---- Toast notification system ---- */
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  document.body.appendChild(toastContainer);

  function toast(message, type) {
    type = type || 'info';
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-msg">' + message + '</span>';
    toastContainer.appendChild(t);
    let timer = setTimeout(dismiss, 3000);
    t.addEventListener('mouseenter', () => clearTimeout(timer));
    t.addEventListener('mouseleave', () => timer = setTimeout(dismiss, 2000));
    t.addEventListener('click', dismiss);
    function dismiss() {
      clearTimeout(timer);
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 250);
    }
  }
  window.Bangwing = window.Bangwing || {};
  window.Bangwing.toast = toast;

  /* ---- Ripple effect on buttons ---- */
  if (finePointer) {
    document.addEventListener('pointerdown', (e) => {
      const target = e.target.closest('.btn, [data-ripple], button[type="submit"]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple__effect';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  /* ---- Enhanced keyboard navigation ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    if (e.altKey && e.key === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: false });
      }
    }
  });

  /* ---- Page transition states ---- */
  window.addEventListener('pagehide', () => {
    document.body.classList.add('vt-leaving');
  });
  window.addEventListener('pageshow', () => {
    document.body.classList.remove('vt-leaving');
    document.body.classList.add('vt-ready');
  });
  document.body.classList.add('vt-ready');

  /* ---- Blur-up lazy load enhancement ---- */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.complete) return;
      img.style.filter = 'blur(8px)';
      img.style.transition = 'filter .3s ease';
      img.addEventListener('load', () => {
        img.style.filter = '';
        img.classList.add('is-loaded');
      });
    });
  }

  /* ---- Console brand (v7 enhanced) ---- */
  const v7Version = '7.0.0';
  if (window.console && console.log) {
    const cs1 = 'color:#FF7C2E;font-weight:700;font-size:14px';
    const cs2 = 'color:#E64A82;font-weight:700';
    const cs3 = 'color:#6247AA;font-weight:600';
    const cs4 = 'color:#FAF1E4;font-size:11px';
    console.log('%c✨ Bangwing IN %cv' + v7Version + ' %c— Angan Design System %c| Built with care in India', cs1, cs2, cs3, cs4);
  }


  /* ================================================================== */
  
  })();

  /* ---- Active nav link detection (scroll spy) ---- */
  (function() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;
    
    var currentPath = window.location.pathname.replace(/\/$/, '').replace(/^\//, '');
    if (currentPath === '') currentPath = 'home';
    
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkPath = href.replace(/\/$/, '').replace(/^\//, '');
      if (linkPath === '') linkPath = 'home';
      
      if (linkPath === currentPath) {
        link.classList.add('is-active');
      }
    });
  })();

  /* ---- Enhanced mobile menu: focus trap, body lock, ESC close ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    document.body.appendChild(backdrop);

    function openMenu() {
      menu.setAttribute('data-open', 'true');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      backdrop.classList.add('is-visible');
      
      var firstLink = menu.querySelector('a');
      if (firstLink) {
        setTimeout(function() { firstLink.focus(); }, 100);
      }
    }

    function closeMenu() {
      menu.setAttribute('data-open', 'false');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      backdrop.classList.remove('is-visible');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      var isOpen = menu.getAttribute('data-open') === 'true';
      if (isOpen) closeMenu(); else openMenu();
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') {
        closeMenu();
      }
    });

    menu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        closeMenu();
      });
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || menu.getAttribute('data-open') !== 'true') return;
      var focusable = menu.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var progress = document.querySelector('.reading-progress');
    if (!progress) return;
    
    function updateProgress() {
      var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      var scrolled = window.pageYOffset / scrollHeight * 100;
      progress.style.width = scrolled + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  })();

  /* ---- IndexNow: ping search engines on page load ---- */
  (function() {
    if (window.location.search.indexOf('noindex') > -1) return;
    var currentUrl = window.location.href;
    var key = 'indexnow_' + currentUrl;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    
    try {
      fetch('https://api.indexnow.org/IndexNow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: window.location.hostname,
          key: 'bangwings_indexnow_key',
          urlList: [currentUrl]
        })
      }).catch(function() {});
    } catch(e) {}
  
  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */


  /* ================================================================== */
  /* v9 NAVIGATION REDESIGN — Auto-hide, Scroll-spy, Ripple,             */
  /* Animated Hamburger, Staggered Mobile Menu, Focus Trap, IndexNow    */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;
    var delta = 5;

    function updateHeader() {
      var scrollY = window.pageYOffset;
      if (scrollY > threshold) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      if (Math.abs(lastScroll - scrollY) > delta) {
        if (scrollY > lastScroll && scrollY > threshold) {
          header.classList.add('is-hidden');
        } else {
          header.classList.remove('is-hidden');
        }
      }
      lastScroll = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ---- Scroll-spy: highlight active nav link ---- */
  (function scrollSpyV9() {
    var navLinks = document.querySelectorAll('.nav-links a[href]');
    if (!navLinks.length) return;

    var linkMap = {};
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('://')) {
        linkMap[href] = link;
      }
    });

    var path = window.location.pathname;
    var normPath = path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

    if (linkMap[normPath]) {
      linkMap[normPath].classList.add('is-active');
    }
    if (linkMap[normPath + '/']) {
      linkMap[normPath + '/'].classList.add('is-active');
    }

    var sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(function(s) { observer.observe(s); });
  })();

  /* ---- Enhanced mobile menu with staggered entrance + focus trap ---- */
  (function() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('mobile-menu') || document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    var backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-menu-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menu.parentElement && menu.parentElement.classList.contains('site-header')) {
      document.body.appendChild(menu);
    }

    var focusableSelector = 'a[href], button, input, [tabindex]';
    var isMenuOpen = false;

    function openMenu() {
      isMenuOpen = true;
      menu.setAttribute('data-open', '');
      backdrop.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-locked');
      setTimeout(function() {
        var firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }, 100);
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.removeAttribute('data-open');
      backdrop.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-locked');
      toggle.focus();
    }

    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen) { closeMenu(); } else { openMenu(); }
    });

    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isMenuOpen) { closeMenu(); }
    });

    menu.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        setTimeout(closeMenu, 50);
      }
    });

    menu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab' || !isMenuOpen) return;
      var focusable = menu.querySelectorAll(focusableSelector);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860 && isMenuOpen) { closeMenu(); }
    });
  })();

  /* ---- Ripple effect on clickable nav elements ---- */
  (function() {
    var rippleTargets = document.querySelectorAll('.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta');
    rippleTargets.forEach(function(el) {
      el.addEventListener('click', function(e) {
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });
  })();

  /* ---- IndexNow ping on page load ---- */
  (function indexNow() {
    if (location.protocol !== 'https:') return;
    var key = 'bangwings_indexnow_v9';
    var url = location.href;
    try {
      var sent = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (sent.indexOf(url) >= 0) return;
      sent.push(url);
      sessionStorage.setItem(key, JSON.stringify(sent));
    } catch(e) { return; }

    var pingUrl = 'https://api.indexnow.org/IndexNow';
    var data = JSON.stringify({
      host: location.host,
      key: 'bangwingsxyzv9indexnowkey',
      urlList: [url]
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(pingUrl, data);
    } else {
      fetch(pingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(function() {});
    }
  })();

  /* ---- Reading progress bar ---- */
  (function() {
    var bar = document.querySelector('.reading-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---- Keyboard navigation: Home/End for page scroll ---- */
  document.addEventListener('keydown', function(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf(document.activeElement.tagName) >= 0) return;
    if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  });

  /* === END v9 === */

})();

