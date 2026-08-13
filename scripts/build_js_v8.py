#!/usr/bin/env python3
"""v8 JS — IDEMPOTENT: nav interactions, scroll spy, mobile menu, IndexNow.
Only inserts if v8 marker doesn't exist, preventing duplication on re-runs."""
import os, sys

repo = os.environ.get('REPO_PATH', '.')
js_path = os.path.join(repo, "assets/js/main.js")

if not os.path.exists(js_path):
    print(f"ERROR: JS not found at {js_path}")
    sys.exit(1)

with open(js_path, 'r') as f:
    js = f.read()

original_len = len(js)

# IDEMPOTENCY: Skip entirely if v8 JS already applied
V8_MARKER = "v8 NAVIGATION REDESIGN"
if V8_MARKER in js:
    print(f"v8 JS already applied (marker found). Skipping. Size: {len(js)}")
    sys.exit(0)

# Match the ACTUAL HTML structure: .nav-toggle with SVG icons, .mobile-menu with data-open
v8_additions = r"""

  /* ================================================================== */
  /* v8 NAVIGATION REDESIGN — Scroll Spy, Auto-hide Header,             */
  /* Enhanced Mobile Menu, Active Link Detection, IndexNow             */
  /* ================================================================== */

  /* ---- Auto-hide header on scroll down, show on scroll up ---- */
  (function() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastScroll = 0;
    var ticking = false;
    var threshold = 80;

    function updateHeader() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      
      if (scrollY > threshold && scrollY > lastScroll && !document.body.classList.contains('nav-locked')) {
        header.classList.add('is-hidden');
      } else if (scrollY < lastScroll || scrollY < threshold) {
        header.classList.remove('is-hidden');
      }
      
      lastScroll = scrollY;
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateHeader);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    updateHeader();
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
  })();

"""

# Append at the end of the file
js += v8_additions

with open(js_path, 'w') as f:
    f.write(js)

print(f"v8 JS done: {len(js)} bytes ({len(js) - original_len:+d} from {original_len})")
