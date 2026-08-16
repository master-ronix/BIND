# Bangwing IN — bangwings.xyz

Static site (`site/`) + a small Cloudflare Worker (`worker.js`) for one edge
route and sitewide security headers. No build step, no framework — see
`site/README.md` for the full design-system writeup and version history.
**This file is only the "how do I deploy this" quick-start.**

## ⚠️ Got this error?

> This uploader does not yet support projects that require a build
> process. It looks like you're trying to upload a project with a
> wrangler config file. Please use 'wrangler deploy' instead for full
> feature support.

That happens when **this whole folder** (the one containing this file,
`wrangler.jsonc`, and `worker.js`) gets dragged into Cloudflare Pages'
*direct-upload* dashboard. That uploader only accepts a plain folder of
static files — seeing a `wrangler.jsonc` in what you gave it, it correctly
assumes this needs the real deploy tool instead. It's not a bug in this
project; it's Cloudflare telling you which of the two folders to use, and
which command to run. Two ways to fix it, in order of preference:

### Fix — Option B: deploy with Wrangler (recommended)
Run this from **this folder** (the one this README is in):
```
npm install
npm run deploy
```
That's it — `npm run deploy` is just `wrangler deploy`. First time only,
it'll open a browser tab to log in to your Cloudflare account. This is
also the *only* one of the deploy paths below with zero forced redirects
on `.html` URLs (see the Search Console section below for why that
matters) and it automatically pings IndexNow with every sitemap URL after
each deploy — nothing else to configure.

### Fix — Option A: Cloudflare Pages direct upload (simpler, one caveat)
Create a Pages project → **Direct upload** → drag in **only the `site/`
folder** — not this project root. `site/` contains nothing but plain
static files (no `wrangler.jsonc` in it), so the uploader accepts it.
**Caveat:** classic Pages forces every `/page.html` request to redirect to
`/page`, with no setting to turn it off — and every canonical tag,
sitemap entry, and internal link on this site points to the `.html` URL.
That mismatch is almost certainly what Search Console's "Page with
redirect" report was flagging. Fine for a quick preview; use Option B for
the real domain.

### Option C — Netlify / Vercel
`vercel.json` is included; drag `site/` onto app.netlify.com/drop, or run
`vercel --prod` from inside `site/`. Neither forces the `.html`-stripping
redirect Cloudflare Pages does.

## If Search Console still shows "Server error (5xx)"

I don't have a Google Search Console connection available in this
environment — I checked, and it isn't in the connector list I have access
to — so I can't pull your live coverage report directly. What actually
causes a 5xx (as opposed to the redirect issue above, which is fixed by
Option B) lives in your Cloudflare account/DNS settings, not in this
codebase. In order of likelihood:

1. **Confirm a deploy from *this* version is actually live** — the error
   above suggests the last upload attempt may not have gone through at
   all. Run Option B, then load the site yourself in a normal browser.
2. **SSL/TLS mode** (Cloudflare dashboard → SSL/TLS) should be **Full** or
   **Full (strict)**. "Flexible" against an origin that redirects
   HTTP→HTTPS is a classic cause of redirect loops that Google logs as an
   intermittent 5xx.
3. **Bot Fight Mode / WAF** — make sure nothing challenges or blocks the
   Googlebot user agent. A challenge page served instead of the real page
   gets logged as a server error, not a 403.
4. Once redeployed, use Search Console's **URL Inspection → Test Live
   URL** on a couple of affected pages, then **Validate Fix** on both
   reports after confirming a clean 200.

## One thing only you can finish

Every page has `<meta name="google-site-verification"
content="PASTE-YOUR-GOOGLE-SEARCH-CONSOLE-CODE-HERE">`. Get your real code
from [Search Console](https://search.google.com/search-console) (Settings
→ Ownership verification → HTML tag) and replace that placeholder across
all 10 HTML files — one find-and-replace. Then submit
`https://bangwings.xyz/sitemap.xml` from the Sitemaps tab. (If you already
verified the property a different way — DNS TXT record, for instance —
this step is already done and the placeholder is just unused.)

## Everything else

Full changelog, the design-token system, contrast reference, and "if you
ever want to change something" notes live in **`site/README.md`**.
`scripts/check-seo.js` (`npm run check-seo`) is a standalone lint that
checks every page's heading hierarchy, title/description length, alt
text, canonical tags, and internal links before you deploy — see that
script's own header comment for what it checks and why.
