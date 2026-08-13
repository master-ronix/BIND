#!/usr/bin/env python3
"""v9.3 HOTFIX - Fix CSS brace imbalance + final cleanup
The v9.1 regex bug added extra } characters to the CSS, corrupting
the cascade. This script:
1. Removes stray } that aren't matching any {
2. Strips duplicate breadcrumbs from HTML (self-healing)
3. Ensures review-wall has overflow:hidden
"""
import re, os

# ---- HTML: Strip duplicate breadcrumbs ----
PAGES = ["index.html","our-story.html","community.html","events.html",
         "achievements.html","safety.html","store.html","contact.html",
         "join.html","404.html"]
LABELS = {"our-story":"Our Story","community":"Community","events":"Events",
          "achievements":"Achievements","safety":"Safety","store":"Store",
          "contact":"Contact","join":"Join"}

for page in PAGES:
    if not os.path.exists(page):
        continue
    with open(page, "r", encoding="utf-8") as f:
        html = f.read()
    html = re.sub(r'<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>.*?</nav>\s*',
                  '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<nav[^>]*aria-label="Breadcrumb"[^>]*>.*?</nav>\s*',
                  '', html, flags=re.DOTALL)
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

# ---- CSS: Fix brace imbalance ----
css_path = "assets/css/style.css"
if not os.path.exists(css_path):
    print("CSS file not found!")
    exit(1)

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

print("CSS before: " + str(len(css)) + " chars")
print("Braces: " + str(css.count('{')) + " open, " + str(css.count('}')) + " close")

# Fix 1: Remove stray } by tracking depth
result = []
depth = 0
in_string = False
string_char = None
i = 0
while i < len(css):
    ch = css[i]
    if ch == '"' or ch == "'":
        if not in_string:
            in_string = True
            string_char = ch
        elif in_string and ch == string_char and css[i-1:i] != '\\':
            in_string = False
            string_char = None
        result.append(ch)
        i += 1
        continue
    if in_string:
        result.append(ch)
        i += 1
        continue
    if ch == '/' and i + 1 < len(css) and css[i+1] == '*':
        end = css.find('*/', i + 2)
        if end == -1:
            result.append(css[i:])
            break
        result.append(css[i:end+2])
        i = end + 2
        continue
    if ch == '{':
        depth += 1
        result.append(ch)
    elif ch == '}':
        if depth > 0:
            depth -= 1
            result.append(ch)
        else:
            print("  Removed stray } at position " + str(i))
    else:
        result.append(ch)
    i += 1

css = ''.join(result)

# Fix 2: Ensure all review-wall rules have overflow:hidden
def fix_rw(match):
    rule = match.group(0)
    rule = rule.replace('overflow: visible', 'overflow: hidden')
    rule = rule.replace('overflow:visible', 'overflow:hidden')
    return rule

css = re.sub(r'\.review-wall\s*\{[^}]+\}', fix_rw, css)

# Fix 3: Ensure breadcrumb CSS at end
css = re.sub(r'\.breadcrumbs[^{]*\{[^}]+\}\s*', '', css)
css = re.sub(r'\.breadcrumbs\s+ol\s*\{[^}]+\}\s*', '', css)
css = re.sub(r'\.breadcrumbs\s+li[^{]*\{[^}]+\}\s*', '', css)
css = re.sub(r'\.breadcrumbs\s+a[^{]*\{[^}]+\}\s*', '', css)

breadcrumb_css = """
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  font-size: .8rem;
  color: rgba(250,241,228,.6);
  padding: .5rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}
.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.breadcrumbs li {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
}
.breadcrumbs li::after { content: "\\203A"; opacity: .4; }
.breadcrumbs li:last-child::after { display: none; }
.breadcrumbs li:last-child { color: #FAF1E4; }
.breadcrumbs a {
  color: rgba(250,241,228,.6);
  text-decoration: none;
  transition: color .2s ease;
}
.breadcrumbs a:hover { color: #FAF1E4; }
"""
css = css.rstrip() + '\n' + breadcrumb_css

# Fix 4: Ensure .metrics-block has overflow:visible
css = re.sub(r'\.metrics-block\s*\{[^}]+\}\s*', '', css)
css = css.rstrip() + '\n.metrics-block { margin: 2rem 0; overflow: visible; }\n'

# Final brace check
open_b = css.count('{')
close_b = css.count('}')
print("CSS after: " + str(len(css)) + " chars")
print("Braces: " + str(open_b) + " open, " + str(close_b) + " close, diff=" + str(open_b - close_b))

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("v9.3 hotfix applied: brace imbalance fixed, review-wall overflow:hidden, breadcrumbs ensured")
