/**
 * Bangwing IN — Cloudflare Worker
 * ---------------------------------------------------------------------
 * Two jobs:
 *   1. /api/discord-stats  → edge-cached proxy to Discord's public invite
 *      API, so main.js can read live member/online counts same-origin
 *      (no CORS, one fewer third-party round trip than calling
 *      discord.com directly from the browser).
 *   2. everything else     → served straight from the `site/` folder via
 *      the ASSETS binding (see wrangler.jsonc), with a small set of
 *      security headers layered on at the edge so they apply no matter
 *      what serves the page.
 *
 * wrangler.jsonc sets html_handling to "none" so that *.html URLs (which
 * is what our sitemap, canonical tags, and every internal link use) are
 * served exactly as requested with no redirect — Cloudflare's default
 * ("auto-trailing-slash") was 307-redirecting every *.html request to the
 * extension-less URL, which is what Google Search Console was flagging as
 * "Page with redirect". The one thing "none" doesn't do automatically is
 * resolve "/" to "/index.html", so this file does that one rewrite itself
 * below; everything else is passed straight through to ASSETS.fetch().
 *
 * This file is only used if you deploy with `wrangler deploy`. Deploying
 * the `site/` folder to Cloudflare Pages instead works exactly the same
 * for visitors — main.js already falls back to calling Discord directly
 * if this route isn't present — but note classic Pages cannot disable its
 * own .html-stripping redirect, so the "Page with redirect" issue can
 * resurface there. Wrangler deploy is the recommended path for this site.
 */

const DISCORD_INVITE_CODE = "w3Pe95knF6";
const DISCORD_STATS_CACHE_SECONDS = 120;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  // includeSubDomains without preload: preload is a near-permanent, third-
  // party-list commitment (removal takes months) that also binds every
  // subdomain this site will ever have to HTTPS-only, including ones that
  // don't exist yet — that's a call for whoever controls the DNS zone to
  // make deliberately, not a default this file should quietly opt into.
  // Add "; preload" here and submit to hstspreload.org once that's true
  // and confirmed for every subdomain.
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; connect-src 'self' https://discord.com; " +
    "img-src 'self' data: https://cdn.discordapp.com https://i.ytimg.com; " +
    "frame-src https://www.youtube-nocookie.com; script-src 'self'; base-uri 'self'; form-action 'self'",
};

// Structured-data files a crawler could fetch directly and mistakenly try
// to index as a content page in their own right, rather than reading them
// as the machine-readable metadata they actually are. Real HTML pages —
// including store.html, which is deliberately real, indexable "coming
// soon" content, not a placeholder — are never in this list.
const NOINDEX_PATHS = new Set(["/sitemap.xml", "/manifest.json"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/discord-stats") {
      return handleDiscordStats(request, ctx);
    }

    // html_handling is "none" (see wrangler.jsonc), which serves *.html
    // requests exactly as-is with no redirect — but it also turns off
    // Cloudflare's automatic "/" → "/index.html" resolution, so that one
    // mapping needs to happen here instead.
    const assetRequest =
      url.pathname === "/"
        ? new Request(new URL("/index.html", url), request)
        : request;

    const assetResponse = await env.ASSETS.fetch(assetRequest);
    return withHeaders(assetResponse, url.pathname);
  },
};

async function handleDiscordStats(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(
    "https://cache.internal/discord-stats/" + DISCORD_INVITE_CODE,
    request
  );

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(
    `https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true`,
    { headers: { "User-Agent": "bangwings-website-worker/1.0" } }
  );

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "upstream_unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await upstream.json();
  const body = JSON.stringify({
    approximate_member_count: data.approximate_member_count,
    approximate_presence_count: data.approximate_presence_count,
  });

  const response = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${DISCORD_STATS_CACHE_SECONDS}`,
      "Access-Control-Allow-Origin": "*",
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/** Layer security headers onto every asset response, and tune caching by
 *  file type — long-lived immutable caching for hashed/static assets,
 *  short revalidate-first caching for HTML so content updates show up
 *  quickly without needing a purge. */
function withHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  const isHTML = pathname === "/" || pathname.endsWith(".html") || !pathname.includes(".");
  const isVersionedAsset = pathname.startsWith("/assets/");

  if (isVersionedAsset) {
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  } else if (isHTML) {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }

  if (NOINDEX_PATHS.has(pathname)) {
    headers.set("X-Robots-Tag", "noindex");
  }

  return new Response(response.body, { status: response.status, headers });
}
