# Bangwing IN — bangwings.xyz

A hand-coded, dependency-free static website. No build step, no framework,
no tracking. Ten HTML pages, one CSS file, one JS file — now with on-demand
SEO automation scripts that run when you ask, not on every serve.

## v6 — deeper responsiveness, reactivity, SEO automation, and the Cloudflare/GSC fix

This round addresses four asks: make the whole site more responsive/reactive,
use the real logo SVG everywhere, fix the Cloudflare + GSC errors, and apply
the full SEO requirements file across every page.

**1. Responsiveness & reactivity — CSS + JS v6 enhancements.**
The CSS grew from 1,422 to 1,956 lines, all additive (no v5 rules were
removed or broken). Key additions:
- Container queries on every grid (`.grid`, `.chip-grid`, `.proof-grid`,
  `.milestone-strip`, `.review-wall`, etc.) so components reflow based on
  their own width, not just the viewport.
- Fluid large-screen handling (1440px+, 1920px+) — wider wrap, generous
  spacing, prose capped at 62ch for reading comfort on ultrawide.
- Ultra-narrow phone hardening (≤360px) — tighter spacing, smaller fonts,
  single-column footer, compressed nav.
- Landscape phone handling (≤480px height) — compressed header, hero, and
  mobile menu so they don't eat the whole viewport.
- Richer interaction states: enhanced `:focus-visible` rings, active/press
  feedback on every interactive element, gradient card hover sheen,
  center-growing nav underlines, skewed button shine sweep, social icon
  gradient rings, accordion content fade-in.
- Scroll-driven animations via CSS `@scroll-timeline` (progressive —
  ignored by unsupported browsers): hero parallax deepens, section eyebrows
  drift in hue as you scroll past.
- Enhanced touch feedback: explicit `:active` scale states, tap-highlight
  color, pointer-tilt fully disabled on coarse pointers.
- Reduced-data awareness: `prefers-reduced-data` strips decorative SVGs,
  grain texture, disables marquee animation, defers lazy images.
- High-contrast mode (`prefers-contrast:more`): thicker borders, solid
  backgrounds, wider focus rings.
- Safe-area insets (iPhone notch, rounded corners) for header, back-to-top,
  and mobile menu.
- Content-visibility optimization on below-the-fold sections (significant
  paint win on the long achievements page).
- Anchor-link scroll highlighting, print polish (link URLs shown,
  accordions expanded), per-page view-transition naming hooks.

The JS grew from 392 to 715 lines, all additive:
- Scrollspy (active section awareness).
- Reading-time estimator (injects "N min read" on long prose).
- Enhanced smooth anchor scrolling with focus management + sticky-header offset.
- Accordion keyboard navigation (arrow keys, Home/End roving).
- Lazy-load polyfill for old browsers.
- Dynamic header height CSS var (reads actual rendered height after font load).
- Touch swipe-to-close on mobile menu.
- Print/Save-PDF button on long prose sections.
- Scroll-direction-aware header hide-on-scroll-down (mobile real estate).
- Console brand easter egg.

**2. Real logo everywhere.**
Every brand asset in `assets/images/brand/` is regenerated from
`logo-source.svg` (the double-chevron wing mark) as the single source of
truth — `logo.svg`, `favicon.svg`, `favicon.ico` (16/32/48 multi-res),
`icon-32/180/192/512.png`, `logo-64/128/256.png` + `.webp`, and
`og-image.jpg` (1200×630 social share card). The path traces the outline
of the mark, so filling it (no stroke) reproduces the correct brand mark
at any resolution with zero per-size stroke guessing.

**3. Cloudflare + GSC fix.**
The root cause of both errors was the `.html` URL scheme:
- **"This uploader does not yet support projects that require a build
  process"** happened because the project root (with `wrangler.jsonc` and
  `worker.js`) was dragged into Cloudflare Pages' direct-upload dashboard,
  which only accepts a plain folder of static files.
- **"Page with redirect"** happened because Cloudflare's default
  `html_handling` ("auto-trailing-slash") 307-redirects every `/page.html`
  request to `/page` — and every canonical tag, sitemap entry, and internal
  link used `.html` URLs, so Google crawled URLs that immediately redirected.

**The fix:** migrate to extensionless URLs everywhere (internal links,
canonical tags, OG/Twitter URLs, JSON-LD breadcrumbs, sitemap entries), then:
- `wrangler.jsonc` uses `html_handling: "auto-trailing-slash"` — serves
  `/our-story.html` when `/our-story` is requested, no redirect.
- `worker.js` is simplified (no manual `/` → `/index.html` rewrite needed).
- `_redirects` has 301 rules for any already-indexed `.html` URLs.
- Both Pages and Workers deploy paths work identically — nobody ever
  requests a `.html` URL, so no redirect ever fires.

**4. SEO requirements applied across all 10 pages.**
Per the techniques in `seo-requirement.txt`:
- **Speculation Rules API refined:** eager prerender for primary CTA links,
  moderate for the rest.
- **Semantic data tables** added to events (event archive grid), achievements
  (community statistics with sources), and community (forum directory) —
  "AI search mechanisms inherently trust structured data grids far more
  than heavy prose."
- **Meta keywords, robots, author** added to every indexable page.
- **DNS-prefetch** for Discord API, Discord CDN, YouTube thumbnails.
- **Robots meta** with `max-image-preview:large, max-snippet:-1, max-video-preview:-1`.
- **Text-to-HTML ratio** improved by stripping section-marker HTML comments.
- **Canonical/hreflang** — all canonical tags are now extensionless,
  self-referential, and consistent with sitemap.
- **IndexNow** integration (already in v5.4, verified working).
- **robots.txt** welcomes AI/LLM crawlers explicitly (GPTBot, ClaudeBot, etc.).

**5. On-demand SEO automation scripts (no build step added).**
The site stays zero-build-step. These scripts run when you ask them to:
- `npm run check:links` — scans every internal link, verifies it resolves to
  a real file. Fails (exit 1) if any are broken.
- `npm run check:headings` — validates exactly one `<h1>` per page, no
  skipped levels. Fails if violations found.
- `npm run generate:sitemap` — regenerates `sitemap.xml` from actual files.
- `npm run critical-css -- [page.html]` — extracts above-the-fold CSS rules
  as a `<style>` block ready to inline.
- `npm run submit-indexnow` — pings Bing/Yandex/Seznam with every sitemap URL.
- `npm run check:all` — runs link + heading checks together.

All scripts are pure Node.js, zero dependencies.

## Deploying it (both paths supported)

### Option A — Cloudflare Pages (direct upload)
Create a Pages project → "Direct upload" → drag in **only the `site/` folder**
(not the project root — dragging the root with `wrangler.jsonc` and `worker.js`
is what produces the "requires a build process" error). `_headers` and
`_redirects` are inside `site/` and apply automatically. Pages serves
extensionless URLs natively — no redirect, GSC issue resolved.

### Option B — Cloudflare Workers (recommended: edge stats proxy + security headers)
From the project root:
```
npm install
npm run deploy
```
Serves everything in `site/` as static assets from a Worker, with
`html_handling: "auto-trailing-slash"` (extensionless URLs, no redirect),
one edge route (`/api/discord-stats`) for the live member-count proxy, and
security headers layered on at the edge. `npm run deploy` also pings
IndexNow automatically (postdeploy script).

### Option C — Netlify / Vercel
Drag `site/` onto app.netlify.com/drop, or `vercel --prod` from inside
`site/`. `vercel.json` is included. Neither forces the `.html`-stripping
redirect.

## Before you go live
1. **Google Search Console verification.** Every page has
   `<meta name="google-site-verification" content="PASTE-YOUR-GOOGLE-SEARCH-CONSOLE-CODE-HERE">`.
   Replace the placeholder in all 10 HTML files, then submit
   `https://bangwings.xyz/sitemap.xml` from the Sitemaps tab.
2. **Validate the GSC fix.** After deploying, use Search Console's
   URL Inspection → Test Live URL on the affected pages, and Validate Fix
   on both the "Page with redirect" and "Server error (5xx)" reports.
3. **Run the SEO checks.** `npm run check:all` before every deploy to catch
   broken links or heading hierarchy regressions.

## File structure
```
bangwing-v6/
├── wrangler.jsonc      ← Cloudflare Workers config (html_handling: auto-trailing-slash)
├── worker.js           ← Edge worker (security headers + Discord stats proxy)
├── package.json       ← npm scripts (deploy, check:links, check:headings, etc.)
├── scripts/
│   ├── check-links.js       ← On-demand broken link checker
│   ├── check-headings.js    ← On-demand heading hierarchy linter
│   ├── generate-sitemap.js  ← Regenerate sitemap.xml from actual files
│   ├── extract-critical-css.js ← Extract above-the-fold CSS for inlining
│   └── submit-indexnow.js   ← Ping Bing/Yandex/Seznam with sitemap URLs
└── site/               ← The actual website (drag this to Pages)
    ├── index.html, our-story.html, community.html, events.html,
    │   achievements.html, safety.html, store.html, contact.html,
    │   join.html, 404.html
    ├── _headers, _redirects, vercel.json, manifest.json
    ├── sitemap.xml, robots.txt, llms.txt, llms-full.txt
    ├── favicon.ico
    └── assets/
        ├── css/style.css   ← 1,956 lines (v5 + v6 responsive/reactive)
        ├── js/main.js      ← 715 lines (v5 + v6 interactive)
        └── images/
            ├── brand/      ← All assets from logo-source.svg
            ├── events/     ← 5 events × 4 formats (jpg+webp, 640/960/1000)
            ├── og-image.jpg, jali-pattern.svg, rangoli-pattern.svg, etc.
```
