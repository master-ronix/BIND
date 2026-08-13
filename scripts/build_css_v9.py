#!/usr/bin/env python3
"""
v9 CSS Build Script — PROPERLY Self-Healing
Strips ALL previous v8/v9/v9.1/v9.2/v9.3 blocks (not just the first),
preserves the original v5+v7 CSS intact, then appends ONE clean block.

Previous versions only stripped the FIRST v8 marker using find(),
leaving accumulated duplicates from multiple CI runs. This version
finds the EARLIEST v8/v9 marker and cuts everything from there.
"""
import re

CSS_PATH = "assets/css/style.css"

# Markers that indicate the START of v8/v9 additions
# Any of these means "cut from here to end, then append clean block"
V89_START_MARKERS = [
    "/* v8 NAVIGATION REDESIGN",
    "/* v9 NAVIGATION REDESIGN",
    "/* v9.1 NAVIGATION",
    "/* v9.2 NAVIGATION",
    "/* Glass morphism, animated hamburger",
    "/* ---- 1. SITE HEADER -- Glass Morphism",
    "/* === END v8",
    "/* === END v9",
]

def build_css_v9(css):
    # Find the EARLIEST v8/v9 marker
    cut_pos = len(css)
    for marker in V89_START_MARKERS:
        idx = css.find(marker)
        if 0 <= idx < cut_pos:
            cut_pos = idx

    # Also check for the v9 block comment pattern
    v9_block = re.search(r'/\* =+ \*/\s*/\*\s*v9\b', css, re.IGNORECASE)
    if v9_block and v9_block.start() < cut_pos:
        cut_pos = v9_block.start()

    # Also check for duplicate .site-header with position:fixed (v9 override)
    # The original v5 has position:sticky, v9 changes to position:fixed
    fixed_header = re.search(r'\.site-header\s*\{[^}]*position:\s*fixed', css)
    if fixed_header and fixed_header.start() < cut_pos:
        # Find the start of this rule's comment block
        search_back = css.rfind('\n/*', 0, fixed_header.start())
        if search_back > 0:
            cut_pos = min(cut_pos, search_back)

    # Cut everything from the earliest v8/v9 marker
    if cut_pos < len(css):
        css = css[:cut_pos].rstrip()

    # Remove any stray v8/v9 selectors that might have been added
    # by previous runs INSIDE the original CSS
    stray_patterns = [
        r'\.review-wall\s*\{[^}]*overflow:\s*visible[^}]*\}',
        r'\.data-table\s*\{[^}]*white-space:\s*nowrap[^}]*\}',
    ]
    for pattern in stray_patterns:
        css = re.sub(pattern, '', css)

    # Fix review-wall overflow to hidden
    def fix_rw(match):
        rule = match.group(0)
        rule = rule.replace('overflow: visible', 'overflow: hidden')
        rule = rule.replace('overflow:visible', 'overflow:hidden')
        return rule
    css = re.sub(r'\.review-wall\s*\{[^}]+\}', fix_rw, css)

    V9_CSS = r"""
/* ====================================================================== */
/* v9 NAVIGATION REDESIGN + DATA-TABLE FIX + REVIEW-WALL FIX             */
/* Glass morphism, animated hamburger->X, scroll-spy indicator,          */
/* staggered mobile menu, ripple effects, auto-hide header              */
/* ====================================================================== */

/* ---- 1. SITE HEADER ---- */
.site-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: color-mix(in srgb, var(--ink-900, #1B1417) 75%, transparent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid color-mix(in srgb, var(--paper, #FAF1E4) 8%, transparent);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, border-color 0.3s ease;
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

/* ---- 2. NAV LINKS ---- */
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
  color: var(--paper, #FAF1E4); background: color-mix(in srgb, var(--paper, #FAF1E4) 6%, transparent);
}
.nav-links a:hover::after, .nav-links a:focus-visible::after, .nav-links a.is-active::after { width: 70%; }
.nav-links a.is-active { color: var(--paper, #FAF1E4); }

/* ---- 3. NAV TOGGLE ---- */
.nav-toggle {
  display: none; background: none; border: none; cursor: pointer;
  padding: 0.5rem; border-radius: var(--r-sm, 8px); transition: background 0.2s ease; position: relative;
}
.nav-toggle:hover { background: color-mix(in srgb, var(--paper, #FAF1E4) 8%, transparent); }
.nav-toggle svg { width: 24px; height: 24px; stroke: var(--paper, #FAF1E4); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.nav-toggle .icon-open, .nav-toggle .icon-close {
  transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55); transform-origin: center;
}
.nav-toggle .icon-close { position: absolute; top: 0.5rem; left: 0.5rem; opacity: 0; transform: rotate(-90deg) scale(0.5); }
.nav-toggle[aria-expanded="true"] .icon-open { opacity: 0; transform: rotate(90deg) scale(0.5); }
.nav-toggle[aria-expanded="true"] .icon-close { opacity: 1; transform: rotate(0deg) scale(1); }

/* ---- 4. MOBILE MENU ---- */
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
  color: var(--marigold, #FF7C2E); background: color-mix(in srgb, var(--marigold, #FF7C2E) 8%, transparent);
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

/* ---- 6. DATA-TABLE ---- */
.data-table {
  width: 100%; max-width: 100%; border-collapse: collapse;
  font-size: var(--text-sm, 0.9rem); margin-block: var(--sp-3, 1.5rem);
  border-radius: var(--r-md, 12px); overflow: hidden; table-layout: auto;
}
.data-table caption { text-align: left; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--paper-50); margin-bottom: var(--sp-2); }
.data-table th {
  text-align: left; font-family: var(--font-mono); font-size: var(--text-xs);
  letter-spacing: .08em; text-transform: uppercase; color: var(--marigold-l, #FFB454);
  padding: var(--sp-2, 0.6rem) var(--sp-3, 1rem); border-bottom: 1px solid var(--paper-14, rgba(250,241,228,0.14)); background: var(--paper-08, rgba(250,241,228,0.08));
}
.data-table td {
  padding: var(--sp-2, 0.6rem) var(--sp-3, 1rem); border-bottom: 1px solid var(--paper-08, rgba(250,241,228,0.08));
  color: var(--paper-70, rgba(250,241,228,0.7)); text-align: left;
  word-break: break-word; overflow-wrap: break-word; white-space: normal;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tbody tr { transition: background var(--dur-fast, 0.2s) var(--ease, ease); }
.data-table tbody tr:hover { background: var(--paper-08, rgba(250,241,228,0.08)); }
.data-table td:nth-child(2) { font-weight: 600; color: var(--marigold-l, #FFB454); }
.data-table td:nth-child(3) { font-family: var(--font-mono, 'Space Mono', monospace); font-size: var(--text-xs, 0.8rem); color: var(--paper-50, rgba(250,241,228,0.5)); }
@media (max-width: 640px) {
  .data-table { font-size: var(--text-xs, 0.8rem); }
  .data-table th, .data-table td { padding: var(--sp-1, 0.4rem) var(--sp-2, 0.6rem); white-space: normal; }
}

/* ---- 7. REVIEW-WALL ---- */
.review-wall { position: relative; overflow: hidden; margin: 2rem 0; padding: 1rem 0; }
.review-wall [data-review-wall] { position: relative; overflow: hidden; margin-top: 1.5rem; }
.metrics-block { margin: 2rem 0; overflow: visible; }

/* ---- 8. BREADCRUMBS ---- */
.breadcrumbs {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: .4rem; font-size: .8rem; color: rgba(250,241,228,.6);
  padding: .5rem 1rem; max-width: 1200px; margin: 0 auto;
}
.breadcrumbs ol {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: .4rem; list-style: none; margin: 0; padding: 0;
}
.breadcrumbs li { display: inline-flex; align-items: center; gap: .4rem; }
.breadcrumbs li::after { content: "\\203A"; opacity: .4; }
.breadcrumbs li:last-child::after { display: none; }
.breadcrumbs li:last-child { color: #FAF1E4; }
.breadcrumbs a {
  color: rgba(250,241,228,.6); text-decoration: none;
  transition: color .2s ease;
}
.breadcrumbs a:hover { color: #FAF1E4; }

/* ---- 9. RIPPLE EFFECT ---- */
.nav-links a, .mobile-menu a, .nav-icon-btn, .nav-cta { position: relative; overflow: hidden; }
.ripple { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.3); transform: scale(0); animation: rippleAnim 0.6s ease-out; pointer-events: none; }
@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }

/* ---- 10. BODY NAV-LOCK + READING PROGRESS ---- */
body.nav-locked { overflow: hidden; touch-action: none; }
.reading-progress { position: fixed; top: 0; left: 0; height: 3px; width: 0; z-index: 1100; background: linear-gradient(90deg, var(--marigold, #FF7C2E), var(--rani, #E0447B)); transition: width 0.1s ease; }

/* ---- 11. NAV PREFERENCES + BREAKPOINTS ---- */
@media (hover: none) and (pointer: coarse) { .nav-links a:hover { background: none; } .nav-icon-btn:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .site-header, .nav-toggle svg, .nav-toggle .icon-open, .nav-toggle .icon-close,
  .mobile-menu, .mobile-menu a, .nav-links a::after, .reading-progress {
    transition: none !important; animation: none !important;
  }
}
@media (max-width: 860px) {
  .nav-links { display: none; } .nav-toggle { display: inline-flex; }
  .nav-actions .nav-cta { display: none; } .nav-actions .nav-icon-btn.hide-mobile { display: none; }
}
@media (min-width: 861px) { .mobile-menu { display: none; } .mobile-menu-backdrop { display: none; } }

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
