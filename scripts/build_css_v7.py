#!/usr/bin/env python3
"""Build enhanced CSS v7 for Bangwing IN — patches the existing v5 CSS."""
import re, os

repo = "."
css_path = os.path.join(repo, "assets/css/style.css")

with open(css_path, 'r') as f:
    css = f.read()

# FIX 1: Remove duplicate --wrap declarations and --text-3xl override
duplicate_block = """  --wrap:1280px;
  --wrap:1400px;
  --text-3xl: clamp(2.2rem,2rem + 2.8vw,2.8rem);
  --text-2xl: clamp(1.8rem,1.6rem + 1.6vw,2.4rem);
  --header-h:60px;
  --paper-70:rgba(250,241,228,.9);
  --paper-50:rgba(250,241,228,.7);
  --paper-14:rgba(250,241,228,.25);
  --paper-08:rgba(250,241,228,.15);
  --ink-900:#1F1719;"""

if duplicate_block in css:
    css = css.replace(duplicate_block, "  /* v7: consolidated — single --wrap, no duplicate overrides */")
    print("FIX 1: Removed duplicate --wrap/--text-3xl/--header-h overrides from :root")

early_dupes = "  --wrap:1200px;\n  --header-h:76px;"
if early_dupes in css:
    css = css.replace(early_dupes, "")
    print("FIX 1b: Removed early duplicate --wrap:1200px")

# FIX 2: Add View Transitions API support and enhanced micro-interactions
vt_css = """

/* ==========================================================================
   v7 ENHANCEMENTS — View Transitions, Enhanced Micro-interactions,
   Container Queries, Scroll-driven Animations, Safe-area, Content-visibility
   ========================================================================== */

@view-transition { navigation: auto; }
::view-transition-group(root) { animation-duration: .4s; animation-timing-function: cubic-bezier(.16,1,.3,1); }
::view-transition-old(root), ::view-transition-new(root) { animation-name: vt-fade-v7; animation-duration: .3s; mix-blend-mode: normal; }
@keyframes vt-fade-v7 { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }

.reading-progress { position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 9999; pointer-events: none; }
.reading-progress::after { content: ""; display: block; height: 100%; width: 100%; background: var(--grad-wing); transform: scaleX(var(--reading-progress, 0)); transform-origin: left; transition: transform .1s linear; }

.toast-container { position: fixed; bottom: max(1rem, env(safe-area-inset-bottom, 1rem)); right: max(1rem, env(safe-area-inset-right, 1rem)); z-index: 9999; display: flex; flex-direction: column; gap: .5rem; pointer-events: none; }
.toast { display: flex; align-items: center; gap: .5rem; padding: .75rem 1.25rem; background: var(--ink-800); border: 1px solid var(--ink-600); border-radius: var(--r-md); color: var(--paper); font-size: var(--text-sm); box-shadow: var(--shadow-md); pointer-events: auto; animation: toast-in .3s cubic-bezier(.16,1,.3,1) forwards; max-width: min(400px, 90vw); }
.toast.toast-success { border-left: 3px solid var(--peacock); }
.toast.toast-error { border-left: 3px solid var(--rani); }
.toast.toast-info { border-left: 3px solid var(--marigold); }
.toast.is-leaving { animation: toast-out .25s cubic-bezier(.16,1,.3,1) forwards; }
@keyframes toast-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toast-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }

.ripple__effect { position: absolute; border-radius: 50%; transform: scale(0); animation: ripple-expand .6s cubic-bezier(.16,1,.3,1) forwards; pointer-events: none; background: rgba(250,241,228,.3); }
@keyframes ripple-expand { to { transform: scale(4); opacity: 0; } }

.btn, [class*="btn-"], .cta { position: relative; overflow: hidden; isolation: isolate; }
.btn::after, [class*="btn-"]::after, .cta::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.4) 50%, transparent 80%); transform: translateX(-100%) skewX(-15deg); transition: transform .6s cubic-bezier(.16,1,.3,1); z-index: -1; }
@media (hover: hover) { .btn:hover::after, [class*="btn-"]:hover::after, .cta:hover::after { transform: translateX(100%) skewX(-15deg); } }

.card { position: relative; overflow: hidden; }
@media (hover: hover) and (pointer: fine) { .card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,124,46,.06) 0%, transparent 40%, rgba(230,74,130,.06) 100%); opacity: 0; transition: opacity var(--dur, .5s) var(--ease, cubic-bezier(.16,1,.3,1)); pointer-events: none; z-index: 0; } .card:hover::before { opacity: 1; } .card > * { position: relative; z-index: 1; } }

.nav-links a { position: relative; }
.nav-links a::after { content: ""; position: absolute; bottom: -2px; left: 50%; width: 0; height: 2px; background: var(--grad-wing); transform: translateX(-50%); transition: width var(--dur-fast, .22s) var(--ease, cubic-bezier(.16,1,.3,1)); }
@media (hover: hover) { .nav-links a:hover::after { width: 100%; } }
.nav-links a.is-active::after { width: 100%; }

.social-links a, .social-icon { position: relative; transition: transform var(--dur-fast, .22s) var(--ease-spring, cubic-bezier(.34,1.56,.64,1)); }
@media (hover: hover) and (pointer: fine) { .social-links a:hover, .social-icon:hover { transform: translateY(-3px) scale(1.08); } .social-links a::before, .social-icon::before { content: ""; position: absolute; inset: -3px; border-radius: inherit; background: var(--grad-wing); opacity: 0; transition: opacity var(--dur, .5s) var(--ease, cubic-bezier(.16,1,.3,1)); z-index: -1; } .social-links a:hover::before, .social-icon:hover::before { opacity: 1; } }

.accordion-content { animation: accordion-fade-in .35s cubic-bezier(.16,1,.3,1) forwards; }
@keyframes accordion-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, [tabindex]:focus-visible, summary:focus-visible { outline: 3px solid var(--marigold); outline-offset: 3px; border-radius: var(--r-sm, 10px); transition: outline-offset .15s cubic-bezier(.16,1,.3,1); }

.site-header { padding-top: env(safe-area-inset-top, 0px); }
.back-to-top { bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); right: calc(1rem + env(safe-area-inset-right, 0px)); }
#mobile-menu[data-open="true"] { padding-top: calc(var(--header-h, 60px) + env(safe-area-inset-top, 0px)); }

[data-cv="auto"] { content-visibility: auto; contain-intrinsic-size: auto 60vh; }

@media print { .site-header, .footer, .back-to-top, .reading-progress, .mobile-menu, .nav-toggle, .toast-container, .cursor-glow { display: none !important; } body { background: white !important; color: black !important; font-size: 12pt; } a[href]::after { content: " (" attr(href) ")"; font-size: 10pt; color: #555; } a[href^="#"]::after, a[href^="javascript:"]::after { content: ""; } .accordion-content { max-height: none !important; overflow: visible !important; display: block !important; } .card, section { break-inside: avoid; page-break-inside: avoid; } }

@media (prefers-reduced-data: reduce) { .grain, .hero-bg-line, .cursor-glow, .marquee-track, [data-parallax] { display: none !important; } * { background-image: none !important; } body { background-color: var(--ink-900); } }
@media (prefers-contrast: more) { :root { --paper-70: rgba(250,241,228,.95); --paper-50: rgba(250,241,228,.85); --paper-14: rgba(250,241,228,.4); --paper-08: rgba(250,241,228,.25); --ink-600: #5A4549; } * { border-width: 2px !important; } a:focus-visible, button:focus-visible { outline-width: 4px; outline-offset: 4px; } }

@media (max-height: 480px) and (orientation: landscape) { .site-header { height: auto; padding-block: .25rem; } :root { --header-h: 44px; } .hero { min-height: 100vh; min-height: 100dvh; padding-top: var(--header-h); } .hero h1 { font-size: clamp(1.4rem, 5vh, 2rem); } .hero .lead { font-size: var(--text-sm); } .section { padding-block: var(--sp-3, 1.4rem); } .mobile-menu { font-size: var(--text-sm); } .mobile-menu .nav-links a { padding-block: .5rem; } }
@media (max-width: 360px) { :root { --text-base: .9rem; --text-lg: 1.1rem; --text-xl: 1.4rem; } .wrap { padding-inline: .75rem; } .hero h1 { font-size: clamp(1.3rem, 8vw, 1.8rem); } .card { padding: var(--sp-2, .8rem); } .grid { gap: var(--sp-2, .8rem); } .footer-bottom { flex-direction: column; gap: .5rem; text-align: center; } }
@media (min-width: 1440px) { :root { --wrap: 1500px; } .wrap { padding-inline: 3rem; } .lead { max-width: 62ch; } }
@media (min-width: 1920px) { :root { --wrap: 1600px; } .section { padding-block: var(--sp-7, 8.4rem); } }
@media (hover: none), (pointer: coarse) { .btn:active, .card:active, a:active { transform: scale(.97); transition: transform .08s ease-out; } * { -webkit-tap-highlight-color: rgba(255,124,46,.15); } }
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) { .card, .btn { border-width: .5px; } }

@media (prefers-reduced-motion: no-preference) { @supports (animation-timeline: scroll()) { .hero-bg-line { animation: hero-parallax-v7 linear; animation-timeline: scroll(root); } @keyframes hero-parallax-v7 { to { transform: translateY(36px); } } .eyebrow { animation: eyebrow-drift-v7 linear; animation-timeline: scroll(root); } @keyframes eyebrow-drift-v7 { to { filter: hue-rotate(20deg); } } } }

.vt-ready { opacity: 1; }
.vt-leaving { opacity: 0; transition: opacity .15s ease-out; }

.site-logo, .footer-logo { display: inline-flex; align-items: center; gap: .5rem; }
.site-logo svg, .footer-logo svg { width: auto; height: 1.5rem; color: var(--paper); transition: transform var(--dur, .5s) var(--ease, cubic-bezier(.16,1,.3,1)); }
@media (hover: hover) and (pointer: fine) { .site-logo:hover svg, .footer-logo:hover svg { transform: scale(1.05); } }
.site-logo .logo-text { font-family: var(--font-display); font-weight: 600; font-size: var(--text-md); color: var(--paper); letter-spacing: -0.02em; }
"""

css += vt_css
print(f"FIX 2: Added View Transitions + enhanced micro-interactions CSS ({len(vt_css)} chars)")

with open(css_path, 'w') as f:
    f.write(css)

print(f"\nFinal CSS: {len(css)} bytes, {css.count(chr(10))} lines")
