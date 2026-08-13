#!/usr/bin/env python3
"""
v9 CSS Build Script — Self-healing
Strips old v8 CSS block, applies v9 with:
1. Fixed data-table (no duplicate rules, proper responsive without white-space:nowrap)
2. Redesigned navigation (glass morphism, animated hamburger, scroll-spy indicator, staggered mobile menu)
3. Review-wall overflow fix
"""
import re, sys

CSS_PATH = "assets/css/style.css"
MARKER_START = "/* v8 NAVIGATION REDESIGN"
MARKER_END = "/* === END v8"

def build_css_v9(css):
    # Strip old v8 block (self-healing)
    start_idx = css.find(MARKER_START)
    if start_idx >= 0:
        end_idx = css.find(MARKER_END, start_idx)
        if end_idx >= 0:
            end_idx = css.find("*/", end_idx) + 2
        else:
            end_idx = css.find("\n/* ---", start_idx + 100)
            if end_idx < 0:
                end_idx = len(css)
        css = css[:start_idx] + css[end_idx:]
    
    # Strip stray v8 data-table duplicate rules
    stray_block = css.find("/* v8 DATA TABLE")
    if stray_block >= 0:
        stray_end = css.find("/*", stray_block + 20)
        if stray_end > 0:
            css = css[:stray_block] + css[stray_end:]
    
    # Remove white-space:nowrap from data-table rules
    nowrap_pattern = r'\.data-table\s*\{[^}]*white-space:\s*nowrap[^}]*\}'
    css = re.sub(nowrap_pattern, '/* data-table nowrap rule removed in v9 */', css)
    
    v8_dt_pattern = r'/\* v8[^\n]*\*/\s*\.data-table\s*\{[^}]+\}'
    css = re.sub(v8_dt_pattern, '', css)
    
    V9_CSS = r"""
/* ====================================================================== */
/* v9 NAVIGATION REDESIGN + DATA-TABLE FIX + REVIEW-WALL FIX            */
/* Glass morphism, animated hamburger->X, scroll-spy indicator,          */
/* staggered mobile menu, ripple effects, auto-hide header              */
/* ====================================================================== */

/* ---- 1. SITE HEADER -- Glass Morphism with Auto-Hide ---- */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: color-mix(in srgb, var(--ink-900, #1B1417) 75%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid color-mix(in srgb, var(--paper, #FAF1E4) 8%, transparent);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.3s ease,
              border-color 0.3s ease;
}
.site-header.is-scrolled {
  background: color-mix(in srgb, var(--ink-900, #1B1417) 90%, transparent);
  border-bottom-color: color-mix(in srgb, var(--paper, #FAF1E4) 14%, transparent);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}
.site-header.is-hidden { transform: translateY(-100%); }
.site-header .nav.wrap {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--sp-3, 1rem); padding: 0.6rem var(--gutter, 1rem);
  max-width: var(--wrap, 1200px); margin: 0 auto;
}

/* ---- 2. NAV LINKS -- Desktop with Scroll-Spy Indicator ---- */
.nav-links { display: flex; align-items: center; gap: 0.3rem; list-style: none; margin: 0; padding: 0; }
.nav-links a {
  position: relative; display: inline-flex; align-items: center;
  padding: 0.5rem 0.85rem; font-size: var(--text-sm, 0.9rem); font-weight: 500;
  color: var(--paper-70, rgba(250,241,228,0.7)); text-decoration: none;
  border-radius: var(--r-sm, 8px); transition: color 0.2s ease, background 0.2s ease;
}
.nav-links a::after {
  content: ''; position: absolute; bottom: 0.15rem; left: 50%; width: 0; height: 2px;
  background: linear-gradient(90deg, var(--marigold, #FF7C2E), var(--rani, #E0447B));
  border-radius: 2px; transform: translateX(-50%);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-links a:hover, .nav-links a:focus-visible {
  color: var(--paper, #FAF1E4);
  background: color-mix(in srgb, var(--paper, #FAF1E4) 6%, transparent);
}
.nav-links a:hover::after, .nav-links a:focus-visible::after, .nav-links a.is-active::after { width: 70%; }
.nav-links a.is-active { color: var(--paper, #FAF1E4); }

/* ---- 3. NAV TOGGLE -- Animated Hamburger -> X ---- */
.nav-toggle {
  display: none; background: none; border: none; cursor: pointer;
  padding: 0.5rem; border-radius: var(--r-sm, 8px); transition: background 0.2s ease;
  position: relative;
}
.nav-toggle:hover { background: color-mix(in srgb, var(--paper, #FAF1E4) 8%, transparent); }
.nav-toggle svg { width: 24px; height: 24px; stroke: var(--paper, #FAF1E4); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.nav-toggle .icon-open, .nav-toggle .icon-close {
  transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform-origin: center;
}
.nav-toggle .icon-close { position: absolute; top: 0.5rem; left: 0.5rem; opacity: 0; transform: rotate(-90deg) scale(0.5); }
.nav-toggle[aria-expanded="true"] .icon-open { opacity: 0; transform: rotate(90deg) scale(0.5); }
.nav-toggle[aria-expanded="true"] .icon-close { opacity: 1; transform: rotate(0deg) scale(1); }

/* ---- 4. MOBILE MENU -- Slide-In with Staggered Entrance ---- */
.mobile-menu {
  position: fixed; inset: 0 0 0 auto; width: min(85vw, 380px);
  background: var(--ink-900, #1B1417);
  border-left: 1px solid color-mix(in srgb, var(--paper, #FAF1E4) 10%, transparent);
  transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001; overflow-y: auto; overscroll-behavior: contain;
  padding: var(--header-h, 64px) 0 2rem 0; display: flex; flex-direction: column;
}
.mobile-menu[data-open] { transform: translateX(0); box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5); }
.mobile-menu a {
  display: flex; align-items: center; padding: 1rem 1.5rem; font-size: 1.1rem; font-weight: 500;
  color: var(--paper-70, rgba(250,241,228,0.7)); text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--paper, #FAF1E4) 5%, transparent);
  opacity: 0; transform: translateX(30px); transition: color 0.2s ease, background 0.2s ease;
}
.mobile-menu[data-open] a { animation: navItemSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.mobile-menu[data-open] a:nth-child(1) { animation-delay: 0.05s; }
.mobile-menu[data-open] a:nth-child(2) { animation-delay: 0.10s; }
.mobile-menu[data-open] a:nth-child(3) { animation-delay: 0.15s; }
.mobile-menu[data-open] a:nth-child(4) { animation-delay: 0.20s; }
.mobile-menu[data-open] a:nth-child(5) { animation-delay: 0.25s; }
.mobile-menu[data-open] a:nth-child(6) { animation-delay: 0.30s; }
.mobile-menu[data-open] a:nth-child(7) { animation-delay: 0.35s; }
.mobile-menu[data-open] a:nth-child(8) { animation-delay: 0.40s; }
@keyframes navItemSlideIn { to { opacity: 1; transform: translateX(0); } }
.mobile-menu a:hover, .mobile-menu a:focus-visible {
  background: color-mix(in srgb, var(--paper, #FAF1E4) 6%, transparent); color: var(--paper, #FAF1E4);
}
.mobile-menu a[aria-current="page"] {
  color: var(--marigold, #FF7C2E);
  background: color-mix(in srgb, var(--marigold, #FF7C2E) 8%, transparent);
  border-left: 3px solid var(--marigold, #FF7C2E);
}

.mobile-menu-backdrop {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; z-index: 1000;
}
.mobile-menu-backdrop.is-visible { opacity: 1; visibility: visible; }

/* ---- 5. NAV ACTION BUTTONS ---- */
.nav-actions { display: flex; align-items: center; gap: 0.5rem; }
.nav-icon-btn {
  display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
  border-radius: var(--r-sm, 8px); color: var(--paper-70, rgba(250,241,228,0.7)); text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
}
.nav-icon-btn:hover { background: color-mix(in srgb, var(--paper, #FAF1E4) 8%, transparent); color: var(--paper, #FAF1E4); transform: translateY(-2px); }
.nav-cta {
  display: inline-flex; align-items: center; gap: 0.4em; padding: 0.55rem 1.2rem;
  font-size: var(--text-sm, 0.9rem); font-weight: 600; border-radius: var(--r-sm, 8px);
  background: linear-gradient(135deg, var(--marigold, #FF7C2E), var(--rani, #E0447B));
  color: var(--ink-900, #1B1417); text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 12px color-mix(in srgb, var(--marigold, #FF7C2E) 30%, transparent);
}
.nav-cta:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 4px 20px color-mix(in srgb, var(--marigold, #FF7C2E) 45%, transparent); }

/* ---- 6. DATA-TABLE FIX -- Proper Responsive Without Overflow ---- */
.data-table {
  width: 100%; max-width: 100%; border-collapse: collapse;
  font-size: var(--text-sm, 0.9rem); margin-block: var(--sp-3, 1.5rem);
  border-radius: var(--r-md, 12px); overflow: hidden; table-layout: auto;
}
.data-table th, .data-table td {
  padding: var(--sp-2, 0.6rem) var(--sp-3, 1rem); text-align: left;
  word-break: break-word; overflow-wrap: break-word; white-space: normal;
}
.data-table td:nth-child(2) { font-weight: 600; color: var(--marigold-l, #FFB454); white-space: nowrap; }
.data-table td:nth-child(3) { font-family: var(--font-mono, 'Space Mono', monospace); font-size: var(--text-xs, 0.8rem); color: var(--paper-50, rgba(250,241,228,0.5)); }
@media (max-width: 640px) {
  .data-table { font-size: var(--text-xs, 0.8rem); display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: normal; }
  .data-table th, .data-table td { padding: var(--sp-1, 0.4rem) var(--sp-2, 0.6rem); white-space: normal; }
  .data-table td:nth-child(2) { white-space: normal; }
}

/* ---- 7. REVIEW-WALL FIX -- Don't Clip Data-Table ---- */
.review-wall { position: relative; overflow: visible; margin: 2rem 0; padding: 1rem 0; }
.review-wall .data-table { margin-bottom: 2rem; }
.review-wall [data-review-wall] { position: relative; overflow: hidden; margin-top: 1.5rem; }
.metrics-block { margin: 2rem 0; }

/* ---- 8. RIPPLE EFFECT ---- */
.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta { position: relative; overflow: hidden; }
.ripple {
  position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.3);
  transform: scale(0); animation: rippleAnim 0.6s ease-out; pointer-events: none;
}
@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }

/* ---- 9. BODY NAV-LOCK ---- */
body.nav-locked { overflow: hidden; touch-action: none; }

/* ---- 10. NAV PREFERENCES ---- */
@media (hover: none) and (pointer: coarse) {
  .nav-links a:hover { background: none; }
  .nav-icon-btn:hover { transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .site-header, .nav-toggle svg, .nav-toggle .icon-open, .nav-toggle .icon-close,
  .mobile-menu, .mobile-menu a, .nav-links a::after {
    transition: none !important; animation: none !important;
  }
}

/* ---- 11. MOBILE BREAKPOINT ---- */
@media (max-width: 860px) {
  .nav-links { display: none; }
  .nav-toggle { display: inline-flex; }
  .nav-actions .nav-cta { display: none; }
  .nav-actions .nav-icon-btn.hide-mobile { display: none; }
}
@media (min-width: 861px) {
  .mobile-menu { display: none; }
  .mobile-menu-backdrop { display: none; }
}

/* === END v9 === */
"""
    css = css.rstrip() + "\n" + V9_CSS
    return css

if __name__ == "__main__":
    with open(CSS_PATH, "r", encoding="utf-8") as f:
        css = f.read()
    css = build_css_v9(css)
    with open(CSS_PATH, "w", encoding="utf-8") as f:
        f.write(css)
    print(f"v9 CSS applied ({len(css)} bytes)")
