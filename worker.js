/**
 * Bangwing IN — Cloudflare Worker
 * Multi-layer SEO hardening: HTTPS, canonical URLs, sitemap, security
 */

const DISCORD_INVITE_CODE = "w3Pe95knF6";
const DISCORD_STATS_CACHE_SECONDS = 120;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; connect-src 'self' https://discord.com; " +
    "img-src 'self' data: https://cdn.discordapp.com https://i.ytimg.com; " +
    "frame-src https://www.youtube-nocookie.com; script-src 'self'; base-uri 'self'; form-action 'self'",
};

// Pages that should serve at clean URLs (without .html)
// Google canonicalized these from the old Netlify pretty-URL setup
const CLEAN_URL_PAGES = new Set([
  "/events",
  "/achievements",
  "/our-story",
  "/community",
  "/safety",
  "/join",
  "/store",
  "/contact",
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Layer 1: HTTPS enforcement ──────────────────────────────────
    // Redirect any HTTP request to HTTPS so Google never indexes HTTP
    if (url.protocol === "http:") {
      const httpsUrl = new URL(url);
      httpsUrl.protocol = "https:";
      httpsUrl.port = "";
      return Response.redirect(httpsUrl.toString(), 301);
    }

    // ── Layer 1b: www → apex redirect ───────────────────────────────
    if (url.hostname === "www.bangwings.xyz") {
      const apexUrl = new URL(url);
      apexUrl.hostname = "bangwings.xyz";
      return Response.redirect(apexUrl.toString(), 301);
    }

    // ── API route (not asset, not page) ────────────────────────────
    if (url.pathname === "/api/discord-stats") {
      return handleDiscordStats(request, ctx);
    }

    // ── Layer 2: .html → clean URL 301 redirect ─────────────────────
    // Google canonicalized /events not /events.html — redirect .html
    // to the clean URL so there's one canonical version of each page
    if (url.pathname.endsWith(".html")) {
      const cleanPath = url.pathname.slice(0, -5); // strip .html
      if (CLEAN_URL_PAGES.has(cleanPath)) {
        const cleanUrl = new URL(url);
        cleanUrl.pathname = cleanPath;
        cleanUrl.search = "";
        return Response.redirect(cleanUrl.toString(), 301);
      }
    }

    // ── Layer 2b: index.html → / redirect ───────────────────────────
    if (url.pathname === "/index.html") {
      const rootUrl = new URL(url);
      rootUrl.pathname = "/";
      rootUrl.search = "";
      return Response.redirect(rootUrl.toString(), 301);
    }

    // ── Layer 5: Clean URL serving ──────────────────────────────────
    // /events → serve /events.html content directly (200, not redirect)
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

  // Layer 4: Security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  // ── Content-Type based on extension ───────────────────────────────
  if (pathname === "/" || pathname.endsWith(".html")) {
    headers.set("Content-Type", "text/html; charset=utf-8");
  } else if (pathname.endsWith(".xml")) {
    headers.set("Content-Type", "application/xml; charset=utf-8");
  } else if (pathname.endsWith(".json")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  } else if (pathname.endsWith(".txt")) {
    headers.set("Content-Type", "text/plain; charset=utf-8");
  } else if (pathname.endsWith(".svg")) {
    headers.set("Content-Type", "image/svg+xml");
  } else if (!pathname.includes(".") && pathname !== "/api/discord-stats") {
    // Clean URL serving .html content
    headers.set("Content-Type", "text/html; charset=utf-8");
  }

  // ── Layer 3: Cache control ───────────────────────────────────────
  const isVersionedAsset = pathname.startsWith("/assets/");
  const isSitemap = pathname === "/sitemap.xml";
  const isRobots = pathname === "/robots.txt";

  if (isVersionedAsset) {
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    headers.set("CDN-Cache-Control", "public, max-age=604800");
  } else if (isSitemap) {
    // Sitemap: cache at edge for 24 hours
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("CDN-Cache-Control", "public, max-age=86400");
  } else if (isRobots) {
    // Robots.txt: cache at edge for 1 hour
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("CDN-Cache-Control", "public, max-age=3600");
  } else {
    // HTML pages: no edge cache (always serve fresh)
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set("CDN-Cache-Control", "no-store");
  }

  // ── Layer 3b: Explicitly DELETE any noindex headers ──────────────
  // Belt-and-suspenders: delete X-Robots-Tag if it was set by assets
  headers.delete("X-Robots-Tag");

  return new Response(response.body, { status: response.status, headers });
}
