#!/usr/bin/env python3
"""
v9 JS Build Script — Self-healing
Strips old v8 JS block, applies v9 with:
1. Enhanced navigation: auto-hide header, scroll-spy, animated hamburger, focus trap
2. Ripple effects on nav items
3. IndexNow ping helper
4. Reading progress bar
5. Staggered mobile menu entrance
"""
import re

JS_PATH = "assets/js/main.js"
MARKER_START = "/* v8 NAVIGATION REDESIGN"
MARKER_END = "/* === END v8"

def build_js_v9(js):
    # Strip old v8 block (self-healing)
    start_idx = js.find(MARKER_START)
    if start_idx >= 0:
        end_idx = js.find(MARKER_END, start_idx)
        if end_idx >= 0:
            end_idx = js.find("*/", end_idx) + 4
        else:
            end_idx = js.find("\n  })();", start_idx)
            if end_idx < 0:
                end_idx = js.find("\n})();", start_idx)
            if end_idx < 0:
                end_idx = js.rfind("});", start_idx)
                if end_idx > start_idx:
                    end_idx += 4
                else:
                    end_idx = len(js)
        js = js[:start_idx] + js[end_idx:]

    V9_JS = r"""
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
"""
    # Insert before the closing of the IIFE
    last_close = js.rfind('})();')
    if last_close < 0:
        last_close = js.rfind('})()')
    if last_close > 0:
        js = js[:last_close] + V9_JS + "\n" + js[last_close:]
    else:
        js = js.rstrip() + "\n" + V9_JS
    return js

if __name__ == "__main__":
    with open(JS_PATH, "r", encoding="utf-8") as f:
        js = f.read()
    js = build_js_v9(js)
    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"v9 JS applied ({len(js)} bytes)")
