// Bangwing IN — Cloudflare Worker (v7)
// Serves static assets from the edge with security headers.
// The `assets` config in wrangler.jsonc handles static file serving;
// this worker only adds edge-layer security headers and the Discord stats proxy.

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://discord.com; img-src 'self' data: https://cdn.discordapp.com https://i.ytimg.com; frame-src https://www.youtube-nocookie.com; script-src 'self'; base-uri 'self'; form-action 'self'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Robots-Tag": "index, follow"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API route: Discord stats proxy
    if (url.pathname === "/api/discord-stats") {
      try {
        const response = await fetch("https://discord.com/api/v9/invites/bangwing?with_counts=true&with_expiration=false", {
          headers: { "User-Agent": "BangwingIN/1.0" }
        });
        if (!response.ok) {
          return new Response(JSON.stringify({ error: "Discord API unavailable" }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...SECURITY_HEADERS }
          });
        }
        const data = await response.json();
        return new Response(JSON.stringify({
          member_count: data.approximate_member_count || 0,
          presence_count: data.approximate_presence_count || 0
        }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
            ...SECURITY_HEADERS
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS }
        });
      }
    }
    
    // For all other requests, let the assets binding handle it
    // but add security headers to the response
    return env.ASSETS.fetch(request).then(response => {
      // Clone the response to add headers
      const newResponse = new Response(response.body, response);
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });
      return newResponse;
    }).catch(() => {
      return new Response("Not Found", { status: 404, headers: SECURITY_HEADERS });
    });
  }
};
