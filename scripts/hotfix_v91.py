#!/usr/bin/env python3
"""v9.1 HOTFIX — runs AFTER v9 scripts to fix two critical bugs:
1. Breadcrumb duplication (14x repeated 'Home > Achievements')
2. Review-wall overflow:visible breaking marquee clipping
"""
import re, os

PAGES = ["index.html","our-story.html","community.html","events.html",
         "achievements.html","safety.html","store.html","contact.html",
         "join.html","404.html"]
LABELS = {"our-story":"Our Story","community":"Community","events":"Events",
          "achievements":"Achievements","safety":"Safety","store":"Store",
          "contact":"Contact","join":"Join"}

# ---- Fix 1: Strip ALL breadcrumbs from ALL pages, add back ONE ----
for page in PAGES:
    if not os.path.exists(page):
        continue
    with open(page, "r", encoding="utf-8") as f:
        html = f.read()
    # Remove ALL breadcrumb nav elements (any class containing 'breadcrumb')
    html = re.sub(r'<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>.*?</nav>\s*',
                  '', html, flags=re.DOTALL | re.IGNORECASE)
    # Also remove by aria-label="Breadcrumb"
    html = re.sub(r'<nav[^>]*aria-label="Breadcrumb"[^>]*>.*?</nav>\s*',
                  '', html, flags=re.DOTALL)
    # Add ONE clean breadcrumb after </header>
    key = page.replace('.html', '')
    if key in LABELS:
        bc = ('\n<nav class="breadcrumbs" aria-label="Breadcrumb">'
              '<ol><li><a href="/">Home</a></li>'
              '<li>' + LABELS[key] + '</li></ol></nav>\n')
        idx = html.find('</header>')
        if idx > 0:
            idx += len('</header>')
            html = html[:idx] + bc + html[idx:]
    with open(page, "w", encoding="utf-8") as f:
        f.write(html)
    cnt = len(re.findall(r'breadcrumb', html, re.IGNORECASE))
    print(f"  {page}: {cnt} breadcrumb reference(s)")

# ---- Fix 2: CSS — fix review-wall overflow and data-table ----
css_path = "assets/css/style.css"
if os.path.exists(css_path):
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    # Change any .review-wall { overflow: visible } to overflow: hidden
    css = re.sub(
        r'(\.review-wall\s*\{[^}]*overflow:\s*)visible([^}]*\})',
        r'\1hidden\2}', css)
    # Remove white-space:nowrap from any data-table rule
    css = re.sub(
        r'(\.data-table[^{]*\{[^}]*white-space:\s*)nowrap([^}]*)',
        r'\1normal\2', css)
    # Ensure .metrics-block exists with overflow:visible
    if '.metrics-block' not in css:
        css += '\n.metrics-block { margin: 2rem 0; overflow: visible; }\n'
    # Ensure .breadcrumbs styling exists
    if '.breadcrumbs ol' not in css:
        css += '\n.breadcrumbs { padding: 0.5rem 1rem; max-width: 1200px; margin: 0 auto; }\n'
        css += '.breadcrumbs ol { list-style: none; display: flex; gap: 0.5rem; padding: 0; margin: 0; font-size: 0.8rem; }\n'
        css += '.breadcrumbs li { color: rgba(250,241,228,0.5); }\n'
        css += '.breadcrumbs a { color: rgba(250,241,228,0.5); text-decoration: none; }\n'
        css += '.breadcrumbs li:not(:last-child)::after { content: " \\203a"; }\n'
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
    print("CSS: review-wall overflow fixed, data-table nowrap removed")

print("v9.1 hotfix applied successfully")
