#!/usr/bin/env node
/**
 * Pings IndexNow (api.indexnow.org) with every URL in sitemap.xml.
 * IndexNow tells participating search engines (Bing, Yandex, Seznam, Naver,
 * Yep — not Google, which doesn't take part in this protocol) that these
 * pages changed, instead of waiting for them to get around to recrawling.
 *
 * Runs automatically after `npm run deploy` (see package.json's
 * "postdeploy" script), so this needs zero manual steps day-to-day: deploy
 * normally and the ping happens on its own. You can also run it by hand any
 * time with `npm run submit-indexnow`.
 *
 * Requires Node 18+ (for global fetch). No other dependencies.
 */

const fs = require("fs");
const path = require("path");

const HOST = "bangwings.xyz";
const KEY = "2c5e0dcfc7515db46d2266c90109180e";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, "..", "site", "sitemap.xml");
const ENDPOINT = "https://api.indexnow.org/indexnow";

function extractUrls(sitemapXml) {
  const matches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

async function main() {
  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const urlList = extractUrls(xml);

  if (urlList.length === 0) {
    console.error("No URLs found in sitemap.xml — nothing to submit.");
    return;
  }

  console.log(`Submitting ${urlList.length} URLs to IndexNow...`);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  // IndexNow returns 200 or 202 on success; it does not return a body.
  if (res.status === 200 || res.status === 202) {
    console.log(`IndexNow accepted the submission (HTTP ${res.status}).`);
  } else {
    console.error(`IndexNow responded with HTTP ${res.status}.`);
    const text = await res.text().catch(() => "");
    if (text) console.error(text);
  }
}

main().catch((err) => {
  // Never let a failed ping make `npm run deploy` look like it failed —
  // the site is already live by the time this script runs.
  console.error("IndexNow submission failed (non-fatal):", err.message);
});
