#!/usr/bin/env python3
"""v8.1 CSS — SELF-HEALING: strips old v8 block and re-applies corrected version.
Truly idempotent: same output every run, regardless of prior state."""
import re, os, sys

repo = os.environ.get('REPO_PATH', '.')
css_path = os.path.join(repo, "assets/css/style.css")

if not os.path.exists(css_path):
    print(f"ERROR: CSS not found at {css_path}")
    sys.exit(1)

with open(css_path, 'r') as f:
    css = f.read()

original_len = len(css)
changes = []

# STEP 1: Strip any existing v8 block (self-healing)
v8_start_marker = "/* ==========================================================================\n   v8 NAVIGATION REDESIGN"
if v8_start_marker in css:
    idx = css.index(v8_start_marker)
    css = css[:idx].rstrip() + '\n'
    changes.append("stripped old v8 CSS block")

# STEP 2: Add missing --moon variable if not defined
if '--moon' not in css:
    css = re.sub(
        r'(--paper:\s*#[0-9a-fA-F]{6};)',
        r'\1\n  --moon: #E8D5B5;',
        css, count=1
    )
    changes.append("added --moon color variable")

# STEP 3: Add shorthand variables if missing
shorthand_defs = {
    '--paper-08': 'rgba(250,241,228,.08)',
    '--paper-14': 'rgba(250,241,228,.14)',
    '--paper-dim': 'rgba(250,241,228,.7)',
    '--r-pill': '999px',
    '--r-sm': '10px',
    '--r-md': '12px',
    '--r-lg': '16px',
    '--header-h': '60px',
    '--text-xs': '.8rem',
    '--text-sm': '.9rem',
    '--text-md': '1.1rem',
    '--sp-3': '1.4rem',
    '--grad-wing': 'linear-gradient(90deg, #FF7C2E, #E64A82, #6247AA)',
}
for var_name, var_val in shorthand_defs.items():
    if var_name not in css:
        css = re.sub(
            r'(:root\s*\{[^}]*?)(\})',
            lambda m: m.group(1) + f'\n  {var_name}: {var_val};' + m.group(2),
            css, count=1, flags=re.DOTALL
        )
        changes.append(f"added {var_name}")

# STEP 4: Append corrected v8 navigation CSS
nav_css = r"""

/* ==========================================================================
   v8 NAVIGATION REDESIGN — Reactive, Animated, Interactive, Responsive
   ========================================================================== */

.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: 
    background-color .4s cubic-bezier(.16,1,.3,1),
    backdrop-filter .4s cubic-bezier(.16,1,.3,1),
    box-shadow .4s cubic-bezier(.16,1,.3,1),
    transform .35s cubic-bezier(.4,0,.2,1);
  background: transparent;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}
.site-header.is-scrolled {
  background: color-mix(in srgb, var(--ink-900, #1B1417) 85%, transparent);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  box-shadow: 0 1px 0 rgba(250,241,228,.08), 0 8px 32px rgba(0,0,0,.3);
}
.site-header.is-hidden { transform: translateY(-100%); }

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.4rem;
  height: 60px;
  transition: height .3s cubic-bezier(.16,1,.3,1);
}
.site-header.is-scrolled .nav { height: 52px; }

.nav .brand {
  display: inline-flex;
  align-items: center;
  gap: .6rem;
  text-decoration: none;
  font-family: var(--font-display, 'Fraunces', serif);
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--paper, #FAF1E4);
  white-space: nowrap;
  transition: transform .5s cubic-bezier(.16,1,.3,1);
}
.nav .brand .brand-mark {
  width: 32px;
  height: 25px;
  transition: transform .4s cubic-bezier(.34,1.56,.64,1), filter .4s ease;
  filter: drop-shadow(0 0 0px transparent);
}
@media (hover: hover) {
  .nav .brand:hover { transform: scale(1.02); }
  .nav .brand:hover .brand-mark {
    transform: rotate(-5deg) scale(1.1);
    filter: drop-shadow(0 0 8px rgba(255,124,46,.4));
  }
}

.nav-links {
  display: flex;
  align-items: center;
  gap: .15rem;
}
.nav-links a {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: .4rem .9rem;
  font-size: .9rem;
  font-weight: 500;
  color: rgba(250,241,228,.7);
  text-decoration: none;
  border-radius: 999px;
  transition: 
    color .25s cubic-bezier(.16,1,.3,1),
    background-color .25s cubic-bezier(.16,1,.3,1),
    transform .25s cubic-bezier(.34,1.56,.64,1);
  white-space: nowrap;
}
.nav-links a::after {
  content: "";
  position: absolute;
  bottom: 2px;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #FF7C2E, #E64A82, #6247AA);
  border-radius: 2px;
  transform: translateX(-50%);
  transition: width .3s cubic-bezier(.16,1,.3,1);
}
@media (hover: hover) {
  .nav-links a:hover {
    color: #FAF1E4;
    background: rgba(250,241,228,.08);
    transform: translateY(-1px);
  }
  .nav-links a:hover::after { width: 60%; }
}
.nav-links a.is-active {
  color: #FAF1E4;
  background: rgba(250,241,228,.15);
}
.nav-links a.is-active::after { width: 60%; }

.nav-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.nav-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: rgba(250,241,228,.7);
  transition: color .25s ease, background-color .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
}
@media (hover: hover) {
  .nav-icon-btn:hover {
    color: #FAF1E4;
    background: rgba(250,241,228,.08);
    transform: translateY(-2px);
  }
}

.nav-toggle {
  display: none;
  position: relative;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #FAF1E4;
}
.nav-toggle svg {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22px;
  height: 22px;
  transform: translate(-50%, -50%);
  transition: transform .3s cubic-bezier(.16,1,.3,1), opacity .2s ease;
}
.nav-toggle .icon-open {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
}
.nav-toggle .icon-close {
  opacity: 0;
  transform: translate(-50%, -50%) scale(.5) rotate(-90deg);
}
.nav-toggle[aria-expanded="true"] .icon-open {
  opacity: 0;
  transform: translate(-50%, -50%) scale(.5) rotate(90deg);
}
.nav-toggle[aria-expanded="true"] .icon-close {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1) rotate(0deg);
}

.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: color-mix(in srgb, #1B1417 96%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .3rem;
  padding-top: 60px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .35s cubic-bezier(.16,1,.3,1), visibility .35s;
}
.mobile-menu[data-open="true"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.mobile-menu a {
  display: block;
  padding: .8rem 2rem;
  font-family: var(--font-display, 'Fraunces', serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: #FAF1E4;
  text-decoration: none;
  text-align: center;
  opacity: 0;
  transform: translateY(20px);
  transition: color .25s ease;
}
.mobile-menu[data-open="true"] a {
  animation: mobile-link-in .4s cubic-bezier(.16,1,.3,1) forwards;
}
.mobile-menu[data-open="true"] a:nth-child(1) { animation-delay: .08s; }
.mobile-menu[data-open="true"] a:nth-child(2) { animation-delay: .14s; }
.mobile-menu[data-open="true"] a:nth-child(3) { animation-delay: .2s; }
.mobile-menu[data-open="true"] a:nth-child(4) { animation-delay: .26s; }
.mobile-menu[data-open="true"] a:nth-child(5) { animation-delay: .32s; }
.mobile-menu[data-open="true"] a:nth-child(6) { animation-delay: .38s; }
.mobile-menu[data-open="true"] a:nth-child(7) { animation-delay: .44s; }
.mobile-menu[data-open="true"] a:nth-child(8) { animation-delay: .5s; }
.mobile-menu[data-open="true"] a:nth-child(9) { animation-delay: .56s; }
.mobile-menu[data-open="true"] a:nth-child(10) { animation-delay: .62s; }
@keyframes mobile-link-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (hover: hover) {
  .mobile-menu a:hover { color: #FF7C2E; }
}
.mobile-menu a[aria-current="page"] { color: #FF7C2E; }

.mobile-menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  z-index: 998;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity .35s ease, visibility .35s;
}
.mobile-menu-backdrop.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

@media (max-width: 880px) {
  .nav-links { display: none; }
  .nav-toggle { display: block; }
  .nav-actions .nav-cta,
  .nav-actions .nav-icon-btn:not(.nav-store-btn) { display: none; }
}
@media (min-width: 881px) {
  .mobile-menu { display: none !important; }
  .mobile-menu-backdrop { display: none !important; }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: .9rem;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(250,241,228,.1);
}
.data-table caption {
  padding: 1rem;
  font-size: .8rem;
  color: rgba(250,241,228,.6);
  text-align: left;
  caption-side: top;
}
.data-table thead { background: rgba(250,241,228,.08); }
.data-table th {
  padding: .9rem 1.2rem;
  text-align: left;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-weight: 600;
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: rgba(250,241,228,.7);
  border-bottom: 1px solid rgba(250,241,228,.15);
}
.data-table td {
  padding: .8rem 1.2rem;
  border-bottom: 1px solid rgba(250,241,228,.06);
  color: #FAF1E4;
  vertical-align: top;
}
.data-table tbody tr { transition: background-color .2s ease; }
.data-table tbody tr:hover { background: rgba(250,241,228,.05); }
.data-table td:nth-child(2) { font-weight: 600; color: #FF7C2E; }
.data-table td:nth-child(3) {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: .8rem;
  color: rgba(250,241,228,.6);
}
@media (max-width: 600px) {
  .data-table { font-size: .8rem; }
  .data-table th, .data-table td { padding: .6rem .8rem; }
  .data-table { display: block; overflow-x: auto; white-space: nowrap; }
}

.review-wall {
  position: relative;
  overflow: hidden;
  margin: 2rem 0;
  padding: 1rem 0;
}

.faq-item {
  margin-bottom: 1.5rem;
  padding: 1.2rem 1.5rem;
  background: rgba(250,241,228,.04);
  border-radius: 12px;
  border: 1px solid rgba(250,241,228,.08);
  transition: border-color .25s ease, background-color .25s ease;
}
.faq-item:hover {
  border-color: rgba(250,241,228,.15);
  background: rgba(250,241,228,.06);
}
.faq-item .faq-answer { font-weight: 600; color: #FAF1E4; }

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  font-size: .8rem;
  color: rgba(250,241,228,.6);
  padding: .5rem 0;
}
.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.breadcrumbs li {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
}
.breadcrumbs li::after { content: "\203A"; opacity: .4; }
.breadcrumbs li:last-child::after { display: none; }
.breadcrumbs a {
  color: rgba(250,241,228,.6);
  text-decoration: none;
  transition: color .2s ease;
}
.breadcrumbs a:hover { color: #FAF1E4; }
.breadcrumbs li:last-child { color: #FAF1E4; }

body.nav-locked {
  overflow: hidden;
  position: fixed;
  width: 100%;
}

.nav-cta { position: relative; overflow: hidden; }
.nav-cta::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.2) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: transform .5s cubic-bezier(.16,1,.3,1);
}
@media (hover: hover) {
  .nav-cta:hover::before { transform: translateX(100%); }
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  background: #FF7C2E;
  color: #1B1417;
  padding: .8rem 1.2rem;
  font-weight: 600;
  text-decoration: none;
  z-index: 10000;
  border-radius: 0 0 12px 0;
  transition: top .2s ease;
}
.skip-link:focus { top: 0; }

.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  background: linear-gradient(90deg, #FF7C2E, #E64A82, #6247AA);
  z-index: 10000;
  transition: width .1s linear;
}

[data-cv="auto"] {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px;
}

@view-transition { navigation: auto; }

.nav-links a:focus-visible,
.nav-icon-btn:focus-visible,
.nav-toggle:focus-visible,
.mobile-menu a:focus-visible {
  outline: 3px solid #FF7C2E;
  outline-offset: 4px;
  border-radius: 10px;
}
"""

css += nav_css
changes.append("applied corrected v8 navigation CSS")

with open(css_path, 'w') as f:
    f.write(css)

print(f"v8.1 CSS done: {len(css)} bytes ({len(css) - original_len:+d} from {original_len})")
print(f"Changes: {', '.join(changes)}")
