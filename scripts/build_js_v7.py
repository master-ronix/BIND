#!/usr/bin/env python3
"""Build enhanced JS v7 for Bangwing IN — appends new features to existing v5 JS."""
import os

repo = "."
js_path = os.path.join(repo, "assets/js/main.js")

with open(js_path, 'r') as f:
    js = f.read()

v7_additions = """

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
    const icon = type === 'success' ? '\u2713' : type === 'error' ? '\u26A0' : '\u2139';
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
    console.log('%c\u2728 Bangwing IN %cv' + v7Version + ' %c\u2014 Angan Design System %c| Built with care in India', cs1, cs2, cs3, cs4);
  }
"""

# Insert v7 additions before the closing of the IIFE
last_close = js.rfind('})();')
if last_close == -1:
    last_close = js.rfind('})()')

if last_close != -1:
    js = js[:last_close] + v7_additions + '\n' + js[last_close:]
    print(f"v7 enhancements inserted ({len(v7_additions)} chars)")
else:
    js += v7_additions
    print("v7 enhancements appended (IIFE close not found)")

with open(js_path, 'w') as f:
    f.write(js)

print(f"Final JS: {len(js)} bytes, {js.count(chr(10))} lines")
