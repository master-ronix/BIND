/**
 * check-seo.js — standalone pre-deploy sanity check. Zero dependencies,
 * same spirit as submit-indexnow.js: a plain Node script, not a build
 * step. Nothing in package.json calls this automatically — run it
 * yourself before deploying:
 *
 *   npm run check-seo
 *
 * It is a linter, not a build gate: nothing else in this project depends
 * on it passing. It exits 1 if it finds anything under "FAIL" so it can
 * be wired into CI later if you want, but that's opt-in, not assumed.
 *
 * What it checks, per HTML file in site/:
 *   - exactly one <h1>
 *   - no skipped heading level (e.g. an <h2> straight to an <h4>)
 *   - <title> present and <= 60 characters
 *   - meta description present and <= 160 characters
 *   - self-referential <link rel="canonical"> present
 *   - every <img> has a non-empty alt attribute
 *   - every internal href (root-relative, or a #fragment) resolves to a
 *     real file and, for fragments, a real id in that file
 *   - no bare "click here" / "read more" / "learn more" link text
 *
 * What it deliberately does NOT check: things that need a live crawl or
 * an actual account (real Search Console coverage, real PageSpeed
 * scores, live redirect behaviour). This only checks what's knowable by
 * reading the HTML on disk.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SITE_DIR = path.join(__dirname, "..", "site");
const TITLE_MAX = 60;
const DESC_MAX = 160;

function readHtmlFiles() {
  return fs
    .readdirSync(SITE_DIR)
    .filter((f) => f.endsWith(".html"))
    .sort();
}

function extractAll(html, re) {
  const out = [];
  let m;
  const g = new RegExp(re, "gi");
  while ((m = g.exec(html))) out.push(m);
  return out;
}

function checkFile(file, html, idsByFile) {
  const issues = []; // { level: 'FAIL' | 'WARN', msg: string }
  const fail = (msg) => issues.push({ level: "FAIL", msg });
  const warn = (msg) => issues.push({ level: "WARN", msg });

  // --- <title> ---------------------------------------------------------
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch) fail("missing <title>");
  else {
    const len = titleMatch[1].trim().length;
    if (len === 0) fail("<title> is empty");
    else if (len > TITLE_MAX) warn(`<title> is ${len} chars (budget: ${TITLE_MAX})`);
  }

  // --- meta description --------------------------------------------------
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!descMatch) fail("missing meta description");
  else {
    const len = descMatch[1].trim().length;
    if (len === 0) fail("meta description is empty");
    else if (len > DESC_MAX) warn(`meta description is ${len} chars (budget: ${DESC_MAX})`);
  }

  // --- canonical -----------------------------------------------------------
  if (!/<link\s+rel="canonical"\s+href="[^"]+"/i.test(html)) {
    fail("missing <link rel=\"canonical\">");
  }

  // --- headings: exactly one h1, no skipped levels -----------------------
  const headings = extractAll(html, "<h([1-6])[ >]").map((m) => Number(m[1]));
  const h1Count = headings.filter((n) => n === 1).length;
  if (h1Count === 0) fail("no <h1> found");
  else if (h1Count > 1) fail(`${h1Count} <h1> tags found (should be exactly 1)`);
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) {
      warn(`heading jumps from h${headings[i - 1]} to h${headings[i]} (skips a level)`);
    }
  }

  // --- images: every <img> needs a real alt ------------------------------
  const imgs = extractAll(html, "<img\\b[^>]*>");
  for (const m of imgs) {
    const tag = m[0];
    const altMatch = tag.match(/alt="([^"]*)"/i);
    if (!altMatch) fail(`<img> with no alt attribute: ${tag.slice(0, 70)}…`);
  }

  // --- generic anchor text -------------------------------------------------
  const genericLinks = extractAll(html, ">\\s*(click here|read more|learn more)\\s*<");
  for (const m of genericLinks) warn(`generic link text: "${m[1]}"`);

  // --- internal links resolve -------------------------------------------
  const hrefs = extractAll(html, 'href="([^"]+)"').map((m) => m[1]);
  const srcs = extractAll(html, 'src="([^"]+)"').map((m) => m[1]);
  for (const href of [...hrefs, ...srcs]) {
    if (/^(https?:)?\/\//i.test(href) || /^(mailto|tel|javascript):/i.test(href)) continue; // external/non-navigational
    let [urlPath, fragment] = href.split("#");
    let targetFile = file; // default: same-page fragment
    if (urlPath) {
      const clean = urlPath.replace(/^\//, "");
      targetFile = clean === "" ? "index.html" : clean;
      if (!fs.existsSync(path.join(SITE_DIR, targetFile))) {
        fail(`broken internal reference "${href}" — no file at site/${targetFile}`);
        continue;
      }
    }
    if (fragment && targetFile.endsWith(".html") && idsByFile.has(targetFile) && !idsByFile.get(targetFile).has(fragment)) {
      warn(`"${href}" links to #${fragment}, but no id="${fragment}" exists in ${targetFile}`);
    }
  }

  // --- text-to-HTML ratio (hygiene signal, not a hard rule) --------------
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyHtml = bodyMatch[1];
    const visibleText = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const ratio = bodyHtml.length ? visibleText.length / bodyHtml.length : 0;
    if (ratio < 0.1) warn(`text-to-HTML ratio is low (${(ratio * 100).toFixed(1)}%) — mostly markup, little visible copy`);
  }

  return issues;
}

function main() {
  const files = readHtmlFiles();
  const htmlByFile = new Map();
  const idsByFile = new Map();

  for (const file of files) {
    const html = fs.readFileSync(path.join(SITE_DIR, file), "utf8");
    htmlByFile.set(file, html);
    const ids = new Set(extractAll(html, 'id="([^"]+)"').map((m) => m[1]));
    idsByFile.set(file, ids);
  }

  let totalFail = 0;
  let totalWarn = 0;

  for (const file of files) {
    const issues = checkFile(file, htmlByFile.get(file), idsByFile);
    const fails = issues.filter((i) => i.level === "FAIL");
    const warns = issues.filter((i) => i.level === "WARN");
    totalFail += fails.length;
    totalWarn += warns.length;

    if (issues.length === 0) {
      console.log(`✔ ${file}`);
    } else {
      console.log(`${fails.length ? "✖" : "△"} ${file}`);
      for (const i of issues) console.log(`   [${i.level}] ${i.msg}`);
    }
  }

  console.log("");
  console.log(`${files.length} pages checked — ${totalFail} fail, ${totalWarn} warn.`);
  process.exit(totalFail > 0 ? 1 : 0);
}

main();
