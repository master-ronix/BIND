# Bangwing IN — bangwings.xyz

A hand-coded, dependency-free static website. No build step, no framework,
no tracking. Ten HTML pages, one CSS file, one JS file.

## v7 — the SEO brief reconciled line-by-line, two real nav bugs a headless browser caught, and named view-transitions

v6 covered gaps found by auditing the site itself. This round started from
re-reading the actual SEO requirements document line by line (the earlier
pass worked from a summary of it, since the upload had expired) and a
direct request to redesign the nav — so the driver here was two external
documents, not internal code-reading. Where the two disagreed with the
project's own architecture, that's noted rather than papered over.

**Nav — found by actually rendering it, not by reading the CSS.** Built a
way to screenshot this site in a real headless browser inside this
sandbox despite no network access (Puppeteer with pipe transport, request
interception standing in for a local server). At exactly the "desktop"
breakpoint the nav claimed to switch on at (1100px), it measurably
wrapped to two rows — six links, two icons, a logo, and a CTA don't fit
in that width with this font/weight/gap combination; it didn't render
clean until ~1145px. A JS resize handler closing the mobile menu at
860px matched neither that breakpoint nor the truth. Fixed by tightening
`.nav-links`/`.nav-actions` gaps to reclaim space, moving the breakpoint
to a verified-safe 1130px (confirmed clean at 1125/1130/1135/1150/1200px
via real screenshots, not just at one spot-checked width), and matching
the JS threshold to it exactly. Also added named cross-document
view-transitions on the header and the active-page underline — the
header now stays visually pinned during navigation instead of falling
and rising with the rest of the content, and the underline glides from
the old active link's position to the new one. Both inherit the site's
existing Chromium-only, reduced-motion-gated transition infrastructure;
the underline specifically gets `view-transition-name:none` under
reduced motion, since unlike the header's (inert — its position never
actually changes) its whole point is lateral motion.

**SEO brief, reconciled against the literal text this time.** Implemented:
a `video:video` sitemap entry for join.html's embedded video, a
`discord.com` preconnect (that page's live member-count widget is the
only thing on the site that calls it), HSTS across all three deploy
targets, and a targeted `X-Robots-Tag: noindex` on `sitemap.xml` and
`manifest.json` specifically — never on an actual page, store.html
included, which is deliberately real indexable content, not a
placeholder. FAQ answers on join.html now lead with a bolded direct
answer, matching the brief's "question then bolded one-line summary"
pattern precisely (they already led with a direct answer sentence; this
adds the literal `<strong>`). The stat blocks on achievements.html and
index.html moved from generic `<div>`s to `<dl>/<dt>/<dd>` and
`<ol>/<li>/<time>` respectively — genuine "table/list matrixing" for the
two places on the site that actually hold list-shaped data, chosen per
block rather than forcing one pattern everywhere: achievements.html's
numbers are clean label→value pairs (`dl`), index.html's are chronological
records with a real date attached to each (`ol` + `<time datetime>`).
Confirmed both render identically to before via headless-browser
screenshots — class selectors throughout, so no CSS depended on the old
tag names, verified rather than assumed.

Tested and rejected: AVIF for the event images. Measured against the
already-shipped WebP files, including at AVIF's slowest/highest-effort
encode setting, and it came out *larger* on several images — this
artwork is flat-color poster/graphic style, not photographic, which is
where AVIF's advantage is smallest. Shipping a third image format that
sometimes regresses the exact metric it's meant to improve would fail
"optimized," not satisfy it.

Evaluated as genuinely not applicable, on evidence rather than by
category: sitemap index/splitting (9 URLs against a 50,000-URL
threshold); critical-CSS inlining (checked the real gzipped size — 17KB,
cached a year via the existing immutable Cache-Control, shared by all
ten pages, so the render-blocking round trip this technique removes is
paid once per visitor, not once per page); zero-client-JS (would remove
the interactivity this exact project has been asked for elsewhere);
Article/Product/LocalBusiness schema (no blog, no real products yet on
the coming-soon store, no physical location — Organization, already
present, is the correct type); ISR (no CMS/backend exists to regenerate
from); geo-targeting and hreflang (no localized content exists to route
to or reference — either would be a false signal pointing at nothing);
nofollow/sponsored/ugc (every outbound link is the org's own real
channel); topic clustering (no blog/tag taxonomy on a ten-page site).

Re-validated everything before packaging, not just the new pieces:
`check-seo.js` (10 pages, 0 fail, 0 warn), CSS brace/paren balance,
`node --check` on every script, JSON-parsed `package.json`/`vercel.json`/
`manifest.json`, and `sitemap.xml` through an XML parser.

## v6 — an architecture pass, not a redesign: container queries, forced-colors support, the two deploy issues, and a link/heading checker

This round started from a request to rebuild the whole site "enterprise-
grade." It isn't one — the fluid `clamp()` type scale, the modular
spacing scale, the mobile-first breakpoint system, the WCAG-checked
palette, and the structured data below were already root-level, not
per-page patches, and the two reported deploy issues both already had a
correct, documented fix in the code (see v5's and v4's sections below).
Redoing any of that from scratch would have thrown away real, verified
work to re-solve already-solved problems. What v6 actually adds:

**1. Container queries (§10 of style.css).** Grid components adapted to
*viewport* width already; nothing let a card adapt to the width of *its
own box* if it ever ended up somewhere narrower or wider than today's
fixed grids — a sidebar, a future page, a different column count. Added
`container-type:inline-size` on `.grid` and two `@container` rules for
`.card`/`.feature-icon`. Caught my own mistake writing this: a
`@container` block placed *before* `.card`'s base rule loses the cascade
tie (equal specificity, base rule comes later in source order → base
wins regardless of the container condition) — moved both rules to after
everything they need to outrank, which is the only place they actually
take effect.

**2. `forced-colors` support — checked per component, not assumed.**
Nothing on this site had ever been tested against Windows High Contrast
Mode. Rather than guess which components needed patching, I read each
one's actual CSS: `.card`, `.chip`, `.back-to-top`, and `.btn-ghost` all
already carry a real (non-transparent) `border-color`, which forced-
colors mode promotes to a visible system color on its own — nothing to
do there. `.btn-primary` and `.nav-toggle` genuinely have no `border`
property at all, and get their entire visible shape from a gradient fill
that forced-colors neutralises — verified by reading the rule, not
inferred from the class name. Those two (plus `.nav-icon-btn`, whose
border is the literal `transparent` keyword — an author choice forced-
colors leaves alone rather than promotes) now get an explicit
`border:1px solid ButtonText` under `@media (forced-colors:active)`.
Purely decorative background textures (`.jali-bg`, `.rangoli-bg`,
`.paisley-bg`, the mandala-corner/toran-divider flourishes) are hidden in
that mode instead of rendering as unpredictable noise once their colors
flatten.

**3. `text-wrap:balance` / `text-wrap:pretty`, and a cleanup they made
possible.** Both moved into the base `h1–h6` and `p` resets — pure
progressive enhancement, ignored safely on browsers that don't support
the value. This made the existing `.text-balance` utility class fully
redundant (it was only ever applied to 4 headings, achievements.html and
store.html's h1/h2 — grepped every usage to confirm before touching it);
removed the utility and the 4 now-unnecessary class attributes rather
than leave two mechanisms doing the same job.

**4. `og:image:width`/`height`/`alt` — measured, not assumed.** Missing
on all 9 pages that have an `og:image`. Opened both actual images with
Pillow rather than guessing from filenames: the shared brand card is
1200×630; `events.html` uses a different, specific photo
(`she-isnt-alone.jpg`) that turned out to be 1000×1000 — caught that this
page uses a distinct image before writing a blanket "1200×630 everywhere"
script that would have been wrong for one page in nine. Its `alt` text is
specific to that photo, not copy-pasted from the generic card's
description.

**5. `scripts/check-seo.js` — new, standalone, zero-dependency, opt-in.**
Checks every page for: exactly one `<h1>`, no skipped heading levels,
title/description length budgets, a canonical tag, non-empty `alt` on
every image, every internal `href`/`src` resolving to a real file on
disk, every `#fragment` resolving to a real `id`, and no generic "click
here"/"read more" link text. `npm run check-seo`. Not wired into
`deploy` — it's a linter you run before deploying, same relationship
`submit-indexnow.js` has to `postdeploy`, just manual instead of
automatic. First draft had its own bug worth recording honestly: it
flagged every CSS/image/manifest reference on every page as a "broken
link" because it only knew about `.html` files. Fixed to check the real
filesystem (`fs.existsSync`) instead of a curated list, then re-run — 10
pages, 0 fail, 0 warn, including after every edit in this section.

**6. The two reported deploy issues.** Both root causes were already
diagnosed and fixed in code by v5 (see below) — what was missing was a
document a person would actually see. Added a root-level `README.md`
(this file is `site/README.md`, one level down — easy to miss on
extraction) that opens with the exact Cloudflare error message, explains
*why* it happens (the project root, not `site/`, got dragged into the
Pages direct-upload dashboard, which correctly refuses anything
containing a `wrangler.jsonc`), and gives `npm run deploy` as the fix.
For Search Console's "Server error (5xx)": no Google Search Console
connector is available in this environment — checked, not assumed — so
live coverage data isn't something I can pull directly. Root README lists
the concrete, checkable causes on the Cloudflare side (stale deploy,
SSL/TLS mode, Bot Fight Mode/WAF challenging Googlebot) and the exact
Search Console steps to confirm the fix once redeployed.

**7. Sitemap `lastmod` bumped to 2026-08-14 across all 9 URLs** — the
shared stylesheet and every page's `<head>` genuinely changed this round,
so this isn't a cosmetic touch-up.

**What I checked against the SEO brief and did *not* implement, on
purpose:** hreflang/i18n (site is single-language with no translated
pages — adding hreflang tags with no actual alternate-language content
to point to would be a false signal, not an optimization); ISR
(Incremental Static Regeneration presumes a CMS/backend regenerating
pages — this site has neither, by design); LocalBusiness schema (this is
a Discord community, not a physical business — Organization is already
the correct type, and it's already there); sitemap index/splitting (that
matters past ~50,000 URLs; this sitemap has 9); a build-time heading/meta
linter as a hard gate (there's still no build step, on purpose — added
`check-seo.js` as the opt-in equivalent instead). Outbound links
(Discord, socials, the wiki) are the org's own real channels, not
paid/sponsored/user-submitted — audited and left as plain
`rel="noopener noreferrer"`, since adding `nofollow` would misrepresent
them.

## v5.5 — the logo fix redone properly, a real flexbox bug, card proportions, mobile density, and glass surfaces

This round was entirely a response to visual feedback (screenshots) on v5.4. Six separate issues, each investigated in the actual code/DOM rather than guessed at.

**1. The logo — v5.4's fix was wrong, here's why and what's actually right.**
v5.4 kept `fill="none" stroke="..."` from the uploaded file and tried to
guess a good stroke-width per icon size. That was the wrong technique, not
just the wrong number: measuring the raw file, its stroke-width is ~0.46%
of the viewBox width — rendered literally, that's sub-pixel and invisible
at every size this site uses, which is *why* a guess was needed at all,
and v5.4's guess landed 5–13x too thick (verified by rendering both side
by side at true display size). The actual fix: the path's 19 points don't
trace a thin line, they trace the OUTLINE of the double-chevron mark
itself — filling the closed path (no stroke at all) reproduces the
correct brand mark at any resolution with zero per-size guessing, because
it's just a vector shape at that point, not a line weight anyone has to
tune. Every logo/icon/favicon asset is regenerated this way.

**2. A real flexbox bug — not a style opinion, a genuine CSS defect.**
The values lists (Our Story's "seven values," Community's Spotlight/Games
lists, Safety's rule bullets — 13 list instances across 4 pages) used
`display:flex` on each `<li>`. Bare text sitting next to an element inside
a flex container becomes its own separate flex item — so
`<strong>Inclusivity</strong> — every member belongs...` was silently
splitting into two flex items, and when the second one wrapped, its
continuation lines aligned under *itself*, not under the bullet, producing
exactly the ragged hanging-indent look in the screenshots (and the
mid-word break on "Community-first"). Fixed by switching these rows to
normal block flow with an absolutely-positioned bullet — plain paragraph
wrapping, flush under the bullet, on every screen size. Zero HTML changes
needed; this was a pure CSS defect.

**3. Card proportions ("slim thick cards").** The 8 activity-forum cards
were forced into 2 mobile columns meant for simpler content elsewhere on
the site, measuring 161×461px — a 1-to-2.9 aspect ratio, basically a
narrow tower. Confirmed with real bounding-box measurements, not just a
look. Gave forums their own grid breakpoints (1 col under 560px, 2 up to
1000px, 4 above) — cards now measure 345×254px, a 1-to-1.36 ratio. The
"coming up next" event banner's icon was vertically centered against the
*entire* card (icon+heading+paragraph+button) instead of against the
heading next to it, because of `align-items:center` on a wrapped flex row
with mismatched-height siblings — switched to `align-items:flex-start`.

**4. Mobile "wall of cards" on Achievements.** The milestones section was
12 stat cards (two rows of six), each forced to full mobile width one per
line — a long, repetitive single-file scroll. Switched to a 2-column grid
under 600px (unchanged above that, where it already worked well): 6 rows
instead of 12, every card a consistent 166×124px including the
longest labels. The 20-item safety/achievements checklist next to it was
deliberately left single-column — those cards carry full sentences, and
checked the numbers: forcing 2 columns there would cram real paragraphs
into ~160px and hurt readability for no real density win, unlike the
milestones which were just "number + short label" and had room to spare.

**5. Color — two real problems, not just taste.** The three homepage/
community feature-card eyebrows ("SOCIAL COMMUNITY" etc.) and every
checkmark in the achievements/safety checklists (20+ repeats on
Achievements alone) used `--peacock`, a deep teal defined in the CSS's own
comments as "deliberately rare — not a wallpaper." Twenty-plus repeats of
a color explicitly designed to be rare is a real inconsistency, and
measuring contrast confirms it further: peacock-on-ink-900 is 4.14:1,
which *fails* WCAG AA for normal text (needs 4.5:1). Both switched to the
palette's gold (10.08:1, comfortably passing). The online-status dot and
the "copied!" confirmation flash keep peacock — genuinely rare, single-
instance uses, and green-for-online matches Discord's own convention.

**6. Glass surfaces, sitewide.** The header and mobile menu already used
backdrop-filter blur; every card-shaped surface elsewhere (`.card`,
`.milestone`, `.event-card`, `.review-card`, `.proof-badge`, `.check-item`,
`.accordion-item`, `.quote-block`, `.store-preview-card`, `.copy-chip`,
the back-to-top button — eleven components, one shared rule) did not, and
sat on a flat solid color. All eleven now use a translucent fill plus
`backdrop-filter:blur(20px) saturate(160%)`, so the page's existing grain
texture and section gradients diffuse through instead of disappearing
under an opaque rectangle. This is "reactive" and not just decorative:
hovering a card (or opening a Safety accordion panel) deepens the frost
(more blur, more saturation, brighter inset edge) rather than flattening
to a solid hover color the way it did before — the glass character holds
through the interaction instead of vanishing exactly when you engage with
it. Checked the worst case (a card with nothing interesting behind it,
just flat page background) against WCAG math: text contrast is 15.5:1,
marginally *better* than the old flat card's 14.96:1, so the new look
doesn't cost any legibility. `@media print` forces every glass surface
back to a plain white bordered box — blur has no meaning on paper.

Every fix in this round was checked directly: the moon-list bug was
diagnosed by reading how flexbox actually generates anonymous boxes
around bare text, not by re-guessing at CSS; the card and milestone
numbers above are real `getBoundingClientRect()` measurements before and
after; the contrast figures are real WCAG relative-luminance math, not
estimates. A full overflow/console-error scan across all 10 pages and 13
breakpoints came back clean after every change.

## v5.4 — real logo assets, a sitewide heading-hierarchy bug, and the actual cause of the GSC/Cloudflare errors

Three separate asks this round: use the real logo everywhere, fix a
Cloudflare upload error, and fix "Server error (5xx)" / "Page with
redirect" in Google Search Console. All three are done; here's exactly
what each one was and what changed.

**1. Real logo, regenerated at every size from the actual vector file.**
The uploaded `logo.svg` (the double-chevron "wing" mark) is now the single
source of truth for every brand asset in `assets/images/brand/`:
`favicon.ico` (16/32/48 multi-res), `icon-32/180/192/512.png`,
`logo-64/128/256.png` + `.webp`, a new `favicon.svg` (modern SVG favicon,
now linked before the PNG fallback in all 10 `<head>`s), and `logo.svg` /
`logo-source.svg` for future reference. Stroke weight isn't one flat
number scaled up — it's calibrated per size (heavier at 16–32px so it
doesn't dissolve into a blob at favicon scale, closer to the source
file's own weight at 256px+) by measuring the previous assets' actual
rendered stroke width and matching it, not guessing. Color is the site's
real `--paper` (`#FAF1E4`), not a generic white. The header/footer
`<img>` `height` attribute is also corrected (30 → 25) to match the new
mark's true aspect ratio, for exact-not-approximate CLS reservation.
*Not touched:* `assets/images/og-image.jpg`. Its wing mark is already the
same silhouette at the same aspect ratio (within ~1%); patching a
gradient shape into a lossy JPEG risked a visible seam for a shape that
was already correct. If you want it regenerated from scratch, say so.

**2. Duplicate arrow on every `link-arrow` link, sitewide.** `.link-arrow`
text was hand-typed as e.g. `Read our story →`, but
`.link-arrow::after{ content:'→' }` *also* appends one — so every one of
these rendered as "Read our story → →". Confirmed on real screenshots,
not just reading the CSS. Fixed by removing the hardcoded arrow from the
10 affected links (404, community, contact ×3, index ×4, our-story) and
keeping the CSS one, since that's the one with the hover slide animation.

**3. Heading hierarchy skipped levels on every single page.** The shared
footer used `<h4>Explore</h4>` / `<h4>Connect</h4>` right after whatever
`<h2>` ended the page's main content — h3 was never used, on any page.
Fixed sitewide (now `<h3>`, CSS selector updated to match, zero visual
change since this codebase already sizes headings by class, not tag).
Achievements also had 20 more `<h4>`s the same way (promoted to `<h3>`),
and Our Story / Contact both jumped `<h1>` straight to `<h3>` for their
first card row — fixed with an invisible (`.visually-hidden`) `<h2>` each,
so screen readers and crawlers get a real document outline without
changing how either page looks. Every page now has exactly one `<h1>` and
no skipped levels — this is the kind of thing a heading-linter would have
caught, so worth adding one if this project ever gets a build step.

**4. Two pages broke the title/description length budget.** Achievements'
`<title>` was 80 characters and its meta description was 277 — both would
get truncated mid-sentence in search results. Trimmed to 55 and 141 chars
respectively, keeping the real numbers (4.9/5.0, 27 reviews, 1,500+
members). Store's description was 165; trimmed to 147. Everything else
was already inside the 60/160 budget.

**5. The Cloudflare upload error.** *"This uploader does not yet support
projects that require a build process... use `wrangler deploy` instead"*
happens because the project root (this folder, containing `wrangler.jsonc`
and `worker.js`) was dragged into Cloudflare Pages' direct-upload
dashboard, which only accepts a plain folder of static files. See
**Deploying it** below for the two clean ways to actually ship this.

**6. The actual cause of "Page with redirect" in Search Console.**
`wrangler.jsonc` had `html_handling: "auto-trailing-slash"` — Cloudflare's
default, which 307-redirects every `/page.html` request to `/page`. Every
canonical tag, every OG `url`, every sitemap entry, and every internal
link on this site uses the `.html` URL. So Google (or anyone) requesting
the exact URL this site advertises as canonical got bounced with a
redirect instead of a 200 — that's precisely what "Page with redirect"
means. Cloudflare Pages (classic) has the identical behavior baked in
with no setting to turn it off (confirmed against Cloudflare's own docs
and other people's identical bug reports), so this is fixed by (a)
switching `html_handling` to `"none"` — serves `*.html` exactly as
requested, no redirect — and (b) since `"none"` also disables automatic
`/` → `/index.html` resolution, `worker.js` now does that one rewrite
itself, running on every request (`run_worker_first: true`) instead of
just `/api/*`. **This means Workers deploy (Option B below) is now the
recommended path**, not just an alternative — it's the only one of the
four documented deploy targets that can actually serve this site's
`.html`-URL scheme with zero redirects.
*Couldn't verify directly:* the "Server error (5xx)" report — that needs
eyes on the live Cloudflare dashboard/DNS, which this environment doesn't
have access to. See the checklist in **Deploying it** below.

**7. IndexNow.** Added the verification key file
(`/2c5e0dcfc7515db46d2266c90109180e.txt`) and
`scripts/submit-indexnow.js`, wired as `postdeploy` in `package.json` —
so `npm run deploy` now also pings Bing/Yandex/Seznam/Naver with every URL
in `sitemap.xml` immediately after each deploy, with zero extra steps.
(Google doesn't participate in IndexNow; this is Bing/Yandex/etc. only.)
Run it by hand any time with `npm run submit-indexnow`.

Everything above was checked against real rendered screenshots (mobile +
desktop, every page) and an automated horizontal-overflow scan across 10
pages × 13 breakpoints — zero overflow bugs found, so the extensive
responsive work from v5.1–v5.3 is holding up. A few things I checked and
deliberately left alone because they were already done well: structured
data (Organization/WebSite, 5× Event, FAQPage, 27× Review +
AggregateRating, BreadcrumbList everywhere), every `<img>` already has
explicit width/height, the Speculation Rules API is already on all 10
pages, WebP + `<picture>` + `srcset` is already in place for event
images, and outbound-link `rel="noopener noreferrer"` is already applied
correctly (and only) to every link that opens in a new tab. Critical-CSS
inlining was considered and skipped on purpose — it'd mean hand-maintaining
a separate "above the fold" ruleset per page with no build step to keep it
in sync, which is a worse trade than the `rel=preload` already in place.

## v5.3 — the deeper bug: CSS specificity conflicts, found from real screenshots again

The button-icon fix in v5.2 was real, but it wasn't the whole story — a
second round of real-device screenshots turned up a pattern of bugs I'd
missed: **child elements silently inheriting or getting overridden by a
parent/context selector with higher specificity than the component style
that was supposed to win.** Four confirmed instances, all fixed:

1. **Every section's descriptive paragraph was rendering at heading size**
   (up to 86px on desktop). `.section-head{ font-size:var(--text-2xl) }`
   was meant to size the `<h2>` inside it, but `font-size` inherits — and
   the plain `<p>` right below the heading had no size of its own, so it
   silently inherited the same huge value. Compounding it further: `<h2>`
   itself has no explicit font-size anywhere in this codebase, so on top
   of inheriting the wrapper's size, the *browser's own default* h2 rule
   (`font-size: 1.5em`, universal across browsers, easy to forget it's
   there once you've never overridden it) multiplied that by another 1.5×.
   Two bugs stacked on each other, on the one component used 23 times
   across the site. Fixed by (a) neutralizing every heading level's
   default browser multiplier with an explicit `font-size:1em` reset, so
   headings only ever render at whatever size their own rule gives them,
   and (b) giving `.section-head`'s paragraph its own real body-text size
   instead of inheriting the heading scale.
2. **The mobile menu's "Join the community" button rendered in the large
   serif display font** instead of its own button style — `.mobile-menu
   a{ font-size:var(--text-lg); font-family:var(--font-display) }`
   (2 selectors) out-specifies `.btn`/`.btn-primary` (1 selector each),
   so the generic menu-link style quietly won over the button's own.
   Fixed with `.mobile-menu a:not(.btn)`, which is both the fix and
   arguably how it should have been scoped from the start.
3. **The pillar-card category labels** ("Social community," "Healthy
   interaction," "Quality engagement") were a 30–43px, 14%-opacity italic
   watermark absolutely positioned to sit *behind* the card heading —
   intended as a subtle background flourish, but reading as broken,
   overlapping ghost text in practice, especially compressed into a
   phone screenshot. Rebuilt as a small, legible, properly-spaced label
   above the heading (same family as the site's existing `.eyebrow`
   treatment) — same three words, no content removed, no more overlap.
4. **The homepage pull-quote's ivory-surface treatment (added in v5) is
   reverted back to the dark card style.** It was a deliberate choice to
   work "ivory" into the palette, but in practice a bright cream box in
   an otherwise all-dark site reads as a mismatch rather than an accent.
   Better to stay cohesive than force a color note that isn't landing.

Re-audited afterward, specifically hunting for this same
inheritance/specificity pattern elsewhere: every heading and paragraph
on every page checked for unexpected size at mobile and desktop widths,
every button on every page checked for the correct (not display-serif)
font. Zero remaining instances found.

**On "the desktop nav looks squeezed":** tested at every common desktop
width (1100–1920px) — zero overflow, consistent spacing at all of them.
If it's still happening, it's something in this list that isn't
reproducing in this testing setup — a screenshot (and the browser/window
width) would help pin it down rather than another blind sweep.

## v5.2 — the actual root cause of "everything looks broken"

Screenshots from a real phone made this one obvious in a way no amount of
desktop-browser testing would have: **every primary "Join the community" /
"Join Bangwing IN on Discord" button** (homepage ×2, our-story, community,
events, contact, join ×2, safety — eight buttons across seven pages) **had
a decorative icon with no defined size anywhere** — no `width`/`height`
attribute on the `<svg>`, no CSS rule for it either. An SVG with no size
specified has *undefined* rendered dimensions, and that's exactly what
happened: this sandbox's Chromium collapsed it to 0×0 (invisible — which
is exactly why it never once showed up across dozens of this project's
own screenshots), while real mobile browsers fell back to a large default
box, ballooning the whole button into the huge, broken-looking pill in the
reported screenshots. Same bug, opposite-looking failure, depending on
the browser's fallback behavior — neither outcome was ever intentional,
because the size was never actually specified.

Fixed with one rule (`.btn svg{ width:1.15em; height:1.15em; flex-shrink:0; }`)
that gives any icon inside any button an explicit, browser-independent
size. Verified by auditing every `<svg>` on every page (over 160 of them
total) for zero computed size at both mobile and desktop widths — zero
remain. This was very likely the single biggest contributor to "problems
on every page": it's the one thing in the screenshots that was
unambiguously, dramatically wrong, and it appeared on almost every page
because that button does.

## v5.1 — bug fixes found in testing after the first v5 pass

A round of testing across screen widths and interaction states (not just
the usual 375px/1440px spot-checks) turned up four real, verifiable bugs
— three pre-existing (from v4 or earlier, only now actually exercised),
one introduced by v5's own card-tilt feature. All four are fixed:

1. **Header/nav overflowed from 860px–1100px wide.** The full desktop nav
   (logo + 6 links + 2 icons + CTA button) simply didn't fit in that
   range — the CTA button and icons were pushed off-screen, forcing
   horizontal scroll. This is exactly the "tablet / half-a-laptop-screen"
   width band, so it was hitting real devices. Fixed by tightening the
   nav-links gap and raising the mobile-menu breakpoint from 860px to
   1100px (verified empirically to have zero overflow, not just "seems
   fine") — below that, you now correctly get the hamburger menu instead
   of a cramped, overflowing row.
2. **The mobile menu opened to a ~90px sliver showing only "Home."**
   Root cause: `.mobile-menu` was nested inside `<header class="site-
   header">`, and that header's `backdrop-filter` (for the frosted-glass
   look) creates a new containing block for `position:fixed` descendants
   per spec — so the menu's "stretch to the bottom of the viewport" inset
   was being measured against the header's own ~76px box instead of the
   real viewport. Fixed by relocating `.mobile-menu` to a direct child of
   `<body>` at runtime in main.js (a one-line, well-known fix for exactly
   this class of bug). This affected every page, at every width, any time
   the mobile menu opened — a real, wide-impact fix.
3. **Hover-lift and pointer-tilt silently did nothing on any card that was
   also a staggered reveal-on-scroll item** (most of them). v5's tilt
   system used a `--tilt-y` custom property inside `.card`'s `transform`;
   the pre-existing `.reveal-group.is-visible .reveal-child` rule set
   `transform` directly and outranked it on specificity, so hovering
   changed the custom property but the browser never re-read it. Fixed by
   converting the reveal system to drive its own `--reveal-y` custom
   property, wrapped in `:where(...)` (zero specificity) so it can never
   outrank a component's own styling again — and folding `--reveal-y`
   into the tilt formula so cards still slide up while fading in, on top
   of the hover/pointer effects working correctly now.
4. **404 page overflowed ~28px at 320px width** (the classic small-phone
   size) — its simplified header (just logo + one CTA button, no
   hamburger system) didn't wrap. Fixed by letting `.nav` wrap onto a
   second line when needed (`flex-wrap:wrap`, `height` → `min-height`);
   invisible on every other page, since their narrow-width layout never
   needed to wrap in the first place.

Also added in this pass: a genuine frosted-glass treatment on the footer
(translucent background, backdrop-blur, a top hairline in the wing
gradient mirroring the header's shimmer, a whisper of jali texture) —
previously it had no distinct surface treatment at all.

**On viewing the site without a local server:** opening an HTML file
directly from the extracted folder (double-clicking it) will look
completely unstyled — no fonts, no layout, broken nav links — because
every asset path is root-absolute (`/assets/css/style.css`, `/our-
story.html`, etc.), which only resolves correctly when a real server
treats `site/` as the document root. This is deliberate (it's what every
real deployment target — Cloudflare Pages, Netlify, Vercel — does
automatically) but it does mean local previews need either `cd site &&
python3 -m http.server 8080` or an editor's "Live Server"-style extension,
not a direct double-click.

## What changed in v5 (this round)

- **Design system extended, not replaced.** v4's palette (marigold, rani,
  indigo, gold, peacock) gains two heritage notes that were implied but
  never named: **terracotta** (baked clay, used the way marigold is but
  pitched an octave lower) and a dusty **sage** pastel (quiet accents only
  — chips, tags — never load-bearing). A seventh surface, **ivory-on-ink**,
  gives the rare section that wants to read as paper-and-ink instead of
  ink-and-paper somewhere to live (`.ivory-band` utility class; the
  homepage `.quote-block` now uses it). All new colours are documented
  with contrast ratios below and clear AA.
- **Reading-progress thread.** A hairline in the wing gradient now lives on
  the sticky header's own bottom edge, filling left-to-right as you scroll
  — driven by one extra custom property (`--p`) inside the same rAF scroll
  loop that already handled header state and the hero parallax, so it's
  effectively free.
- **Pointer tilt for cards.** `.card`, `.milestone`, `.event-card`, and
  `.proof-badge` now pick up a few degrees of pointer-driven 3D rotation on
  fine-pointer devices, layered on top of the existing hover-lift via CSS
  custom properties (`--tilt-rx`/`--tilt-ry`) so it composes with the
  stylesheet instead of fighting it. Off on touch and reduced-motion, both
  in JS (listeners never attach) and as a CSS backstop.
- **Soft pastel colour-cycling** on the achievements language-chip cloud
  and the community forum tags — alternating terracotta/sage borders via
  `nth-child`, zero HTML changes, always-on (not hover-gated) so it reads
  the same on a phone as a desktop.
- **Two more pages join the mandala-corner motif** (Our Story, Join),
  matching the README's own note from last round that more pages should
  carry the visual language — still rare, still one per hero at most.
- **A small, skippable celebration** — four petal-shaped marks scatter from
  the copy-to-clipboard chip on a successful copy, purely as reinforcement
  on top of the existing text/colour/icon feedback. Off entirely under
  reduced-motion.
- **Custom cross-document view-transition.** `@view-transition` was already
  turned on; it now has its own gentle fall/rise instead of the browser
  default cross-fade. Chromium-family only — everything else keeps the
  instant navigation it already had.
- **Responsive event images.** Each of the 5 event posters now ships in
  640/960/1000px webp+jpg with real `srcset`/`sizes`, instead of every
  visitor downloading the 1000×1000 master regardless of card size. Typical
  payload for the 5 images together: **~136KB vs ~292KB before** (browser
  picks per-viewport; measured at a standard desktop width).
- **The OG share image finally exists** — see "before you go live" below,
  this item is now done, not just planned.
- No new dependencies, no build step added. Every effect above is CSS +
  vanilla JS; nothing here needed GSAP, Framer Motion, or a framework, and
  adding one would have meant loosening the `script-src 'self'` CSP this
  project already ships in `worker.js`, `_headers`, and `vercel.json`.

## What changed in v4 (previous round)

- **Achievements page rebuilt from the ground up.** New title framing
  ("The #1 top-rated Indian Discord social community server"), and — most
  importantly — **all 27 real reviews** (15 from TheHiveIndex, 12 from
  Disboard) are now shown, verbatim, in a self-shuffling animated review
  wall (`data-review-wall` in `achievements.html`, logic in `main.js`).
  The order re-randomizes on every page load; hover or focus any row to
  pause it and read. Every stat on the page (members, voice hours,
  messages, retention, event counts, external listings) is wired to the
  same source-of-truth numbers you gave, with an `AggregateRating` +
  27 `Review` entries in JSON-LD for rich-result eligibility.
- **New page: `store.html`.** Marketplace for role icons, emoji packs, and
  membership — clearly labeled "coming soon / under maintenance" per your
  instruction, not pretending to be open.
- **Expanded Indian motif system.** Added a paisley/kalka background
  texture, a mandala corner ornament, a marigold/toran bunting divider, a
  diya flicker accent, and a peacock-feather icon — layered on top of the
  existing jali/rangoli/chevron patterns so more pages carry the visual
  language, not just the homepage. Still restrained/architectural, never
  religious-specific, matching the community's inclusive-across-faiths
  positioning.
- **Minecraft SMP section on `community.html`**, with the live address
  (`bangwings.play.hosting`) in a copy-to-clipboard chip.
- **Official welcome video embedded on `join.html`**, as a click-to-load
  facade (a static thumbnail + play button) — the real YouTube iframe and
  its JS don't load at all until someone actually clicks play, so the page
  stays fast for everyone who doesn't.
- **Wiki button** to your Notion wiki added in the header (desktop icon +
  mobile menu), the footer, `join.html`, and `contact.html`.
- **Nav/mobile-menu refresh**: two new quick-action icons (Wiki, Store) in
  the desktop header; the mobile full-screen menu gained Store + Wiki
  entries with staggered entrance timing extended to match; the desktop
  breakpoint moved from 960px→1040px so the header never crowds.
- **SEO + Search Console**: a `google-site-verification` placeholder meta
  tag on every page (paste your real code in — see below), `sitemap.xml`
  updated with `store.html` and fresh `lastmod` dates, and `robots.txt`
  rewritten to explicitly welcome every major AI/LLM crawler by name
  (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) alongside
  classic search engines.
- **`/llms.txt` and `/llms-full.txt`** added at the site root — a
  structured, AI-readable summary of who you are and what's real, so
  assistants that fetch these files directly get accurate facts instead
  of guessing.
- **Cloudflare Workers support**: `wrangler.jsonc` + `worker.js` at the
  project root (one level up from `site/`) let you deploy the entire site
  as a Worker with static assets, including your exact observability/logs
  config. Full explanation below — Pages still works exactly as before if
  you'd rather use that.
- **Decimal count-up fix**: the number-animation script previously rounded
  everything to a whole number, which would have shown "4+" instead of
  "3.5+" years running — fixed to preserve one decimal place when the
  target value has one.

## Deploying it (pick one)

### Option A — Cloudflare Pages (direct upload, simplest — but read the caveat)
Create a Pages project → "Direct upload" → drag in **only the `site/`
folder** (not this project root — dragging the root, with `wrangler.jsonc`
and `worker.js` in it, is exactly what produces the "this uploader does
not yet support projects that require a build process" error) → add
`bangwings.xyz` as a custom domain. `_headers`/`_redirects` are already
inside `site/` and apply automatically.
**Caveat:** classic Pages redirects every `/page.html` request to `/page`
with no setting to disable it, which conflicts with this site's `.html`
canonical URLs (sitemap, `<link rel="canonical">`, every internal link)
and is what Search Console's "Page with redirect" report was almost
certainly flagging. Fine for a quick preview; **Option B removes this
issue entirely** and is the recommended path for the real domain.

### Option B — Cloudflare Workers (recommended: fixes the redirect issue, adds the live member count)
From the **project root** (the folder containing this `site/` folder,
`wrangler.jsonc`, `worker.js`, and `package.json`):
```
npm install
npm run deploy
```
(`npm run deploy` is just `wrangler deploy`; `npx wrangler deploy` works
too if you don't want to `npm install` first.) This serves everything in
`site/` as static assets from a Worker, with `html_handling: "none"` so
`*.html` URLs are served exactly as requested — no redirect, which is
what actually fixes "Page with redirect" — plus one edge route
(`/api/discord-stats`) that proxies the Discord invite API server-side
(same-origin, cached, no CORS). `main.js` already tries this route first
and silently falls back to calling Discord directly if it's missing, so
the site behaves correctly either way. Deploying also automatically pings
IndexNow with every sitemap URL (see the `postdeploy` script) — no extra
step needed. The `observability` block in `wrangler.jsonc` is exactly the
config you provided (Workers Logs on, persisted, full sampling).

### Option C — Netlify / Vercel
Same as before: drag `site/` onto app.netlify.com/drop, or `vercel --prod`
from inside `site/`. `vercel.json` is included. Neither of these forces
the `.html`-stripping redirect that Cloudflare Pages does, so this option
doesn't have the same caveat as Option A.

### If Search Console is still showing "Server error (5xx)"
This one needs eyes on your actual Cloudflare account/DNS, which isn't
something this environment has access to — a few things worth checking,
in order:
1. **Is there actually a successful deploy live right now?** The
   Cloudflare error you hit suggests the last upload attempt may not have
   gone through. Redeploy with Option B above, then open the site
   yourself in a normal browser to confirm it loads.
2. **SSL/TLS mode**, under Cloudflare's SSL/TLS tab — should be **Full**
   or **Full (strict)**. "Flexible" against an origin that redirects
   HTTP→HTTPS is a classic cause of redirect loops that can present as
   intermittent 5xx/redirect errors.
3. **Bot Fight Mode / WAF rules** — make sure nothing is set to challenge
   or block the Googlebot user agent; a challenge page served instead of
   the real page can get logged as a 5xx.
4. Once redeployed, use Search Console's **URL Inspection → Test Live
   URL** on a couple of the affected pages, and **Validate Fix** on both
   reports after confirming they return a clean 200.

## Before you go live: one thing only you can finish

1. **Google Search Console verification.** Every page now has:
   `<meta name="google-site-verification" content="PASTE-YOUR-GOOGLE-SEARCH-CONSOLE-CODE-HERE">`
   Go to [Google Search Console](https://search.google.com/search-console),
   add `bangwings.xyz` as a property, choose the "HTML tag" verification
   method, copy the code it gives you, and replace the placeholder text
   above in all 10 HTML files (one find-and-replace). Then submit
   `https://bangwings.xyz/sitemap.xml` from the Sitemaps tab.

~~A real OG share image at `/assets/images/og-image.jpg`~~ — **done in
v5.** A 1200×630 card was composed to match the brand system (wing mark in
the actual gradient via a CSS mask, jali texture, mandala corner, the
homepage's real headline and eyebrow copy) and now sits at that exact
path. If you'd rather it match pixel-for-pixel using the real Fraunces/
Karla webfonts instead of the system-serif fallback used to generate it
(no network access in the sandbox this was built in), the source template
is worth regenerating once you can load Google Fonts — everything else
about it (copy, layout, colours, motif) is final.

## Still open (site works without these, but they'd help)

1. **Facebook & WhatsApp** — still text-only mentions on Contact (no
   verified URLs were provided, so nothing was guessed or hyperlinked).
   Send the real profile/channel URLs and I'll wire up proper icons.
2. **Exact profile URLs for TheHiveIndex / Product Hunt / CommunityOne.io
   / Discord Discovery** — the achievements page badges currently link to
   each platform's real homepage (verifiably correct), not a
   Bangwing-specific deep link (which would need the exact URL from you
   to avoid guessing). Send those and the badges become direct proof
   links instead of homepage links.

## Contrast reference (for future edits)

`--paper`, `--paper-dim`, `--saffron`, `--moon`, and `--rani` all clear
4.5:1 against the `--ink` background and are safe for text. `--indigo` on
its own is only ~2.2:1 — it's used deliberately only inside gradients
(blended with the other colors), never as flat text or a thin border.

v5 additions, checked the same way against `--ink-900` / `--ink-800`:
`--terracotta` (5.9:1 / 5.5:1), `--terracotta-l` (8.1:1 / 7.4:1), and
`--sage` (7.5:1 / 6.9:1) all clear 4.5:1 comfortably and are safe for
text and icons on the dark canvas. On the new `--ivory-surface` light
band, use the `-deep` variants instead — `--terracotta-deep`,
`--indigo-deep`, and `--peacock-deep` all clear 5:1+ against
`--ivory-surface` and are what `.ivory-band` content should use for text,
never the flat/light versions meant for dark backgrounds.

## If you ever want to change something

Every page repeats the same header/footer markup — no templating system,
on purpose, so the site has zero build step and works on any host forever.
Changing the nav means find-and-replace across all 10 HTML files. Not
elegant, but nothing here can break from an outdated dependency.
