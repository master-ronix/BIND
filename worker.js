/**
 * Bangwing IN — Cloudflare Worker
 */

const DISCORD_INVITE_CODE = "w3Pe95knF6";
const DISCORD_STATS_CACHE_SECONDS = 120;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; connect-src 'self' https://discord.com; " +
    "img-src 'self' data: https://cdn.discordapp.com https://i.ytimg.com; " +
    "frame-src https://www.youtube-nocookie.com; script-src 'self'; base-uri 'self'; form-action 'self'",
};

const NOINDEX_PATHS = new Set(["/sitemap.xml", "/manifest.json"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/discord-stats") {
      return handleDiscordStats(request, ctx);
    }

    // Handle clean URLs: /events -> /events.html, /community -> /community.html
    // Google canonicalized these from the old Netlify pretty-URL setup
    let assetPath = url.pathname;
    if (
      assetPath !== "/" &&
      !assetPath.includes(".") &&
      !assetPath.startsWith("/api/") &&
      !assetPath.startsWith("/assets/")
    ) {
      assetPath = assetPath + ".html";
    }

    const assetRequest =
      assetPath === "/"
        ? new Request(new URL("/index.html", url), request)
        : new Request(new URL(assetPath, url), request);

    const assetResponse = await env.ASSETS.fetch(assetRequest);

    // If the .html version wasn't found, try the original path
    if (assetResponse.status === 404 && assetPath !== url.pathname) {
      const fallbackResponse = await env.ASSETS.fetch(request);
      return withHeaders(fallbackResponse, url.pathname);
    }

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

function withHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  const isHTML =
    pathname === "/" ||
    pathname.endsWith(".html") ||
    (!pathname.includes(".") && pathname !== "/api/discord-stats");

  if (isHTML) {
    headers.set("Content-Type", "text/html; charset=utf-8");
  }

  const isVersionedAsset = pathname.startsWith("/assets/");

  if (isVersionedAsset) {
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  } else {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-store");
  }

  if (NOINDEX_PATHS.has(pathname)) {
    headers.set("X-Robots-Tag", "noindex");
  }

  return new Response(response.body, { status: response.status, headers });
}
