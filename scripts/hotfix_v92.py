#!/usr/bin/env python3
"""v9.2 HOTFIX - Comprehensive CSS cleanup + breadcrumb fix
Fixes:
1. Removes ALL duplicate CSS rules (keeps last occurrence of each selector)
2. Ensures .review-wall has overflow:hidden (removes any overflow:visible)
3. Validates CSS brace balance
4. Ensures breadcrumb CSS is present and correct
5. Strips duplicate breadcrumbs from HTML (self-healing)
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

# ---- CSS: Comprehensive cleanup ----
css_path = "assets/css/style.css"
if not os.path.exists(css_path):
    print("CSS file not found!")
    exit(1)

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

print("CSS before cleanup: " + str(len(css)) + " chars")

# Step 1: Fix ALL review-wall overflow:visible to overflow:hidden
def fix_review_wall(match):
    rule = match.group(0)
    rule = rule.replace('overflow: visible', 'overflow: hidden')
    rule = rule.replace('overflow:visible', 'overflow:hidden')
    return rule

css = re.sub(r'\.review-wall\s*\{[^}]+\}', fix_review_wall, css)

# Step 2: Remove version comments
css = re.sub(r'/\*[^*]*v8[^*]*\*/', '', css)
css = re.sub(r'/\*[^*]*v9[^*]*\*/', '', css)

# Step 3: Deduplicate CSS rules - keep only the LAST occurrence of each selector
rules = []
i = 0
while i < len(css):
    brace_start = css.find('{', i)
    if brace_start == -1:
        rules.append(('__text__', css[i:]))
        break
    brace_end = css.find('}', brace_start)
    if brace_end == -1:
        rules.append(('__text__', css[i:]))
        break
    selector = css[i:brace_start].strip()
    block = css[brace_start:brace_end+1]
    if selector.startswith('@media') or selector.startswith('@supports') or selector.startswith('@keyframes'):
        depth = 1
        j = brace_start + 1
        while j < len(css) and depth > 0:
            if css[j] == '{':
                depth += 1
            elif css[j] == '}':
                depth -= 1
            j += 1
        block = css[brace_start:j]
        rules.append((selector, block))
        i = j
    else:
        rules.append((selector, block))
        i = brace_end + 1

# Deduplicate: keep only the LAST occurrence of each selector
seen = {}
deduped = []
for selector, block in reversed(rules):
    if selector == '__text__':
        deduped.append((selector, block))
    elif selector not in seen:
        seen[selector] = True
        deduped.append((selector, block))

deduped.reverse()

# Rebuild CSS
css_clean = ''
for selector, block in deduped:
    if selector == '__text__':
        css_clean += block
    else:
        css_clean += selector + ' ' + block + '\n'

# Step 4: Remove existing breadcrumb rules and add clean ones at the end
css_clean = re.sub(r'\.breadcrumbs[^{]*\{[^}]+\}\s*', '', css_clean)
css_clean = re.sub(r'\.breadcrumbs\s+ol\s*\{[^}]+\}\s*', '', css_clean)
css_clean = re.sub(r'\.breadcrumbs\s+li[^{]*\{[^}]+\}\s*', '', css_clean)
css_clean = re.sub(r'\.breadcrumbs\s+a[^{]*\{[^}]+\}\s*', '', css_clean)

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
css_clean = css_clean.rstrip() + '\n' + breadcrumb_css

# Step 5: Ensure .metrics-block has overflow:visible
css_clean = re.sub(r'\.metrics-block\s*\{[^}]+\}\s*', '', css_clean)
css_clean = css_clean.rstrip() + '\n.metrics-block { margin: 2rem 0; overflow: visible; }\n'

# Step 6: Validate brace balance
open_braces = css_clean.count('{')
close_braces = css_clean.count('}')
print("Brace balance: " + str(open_braces) + " open, " + str(close_braces) + " close, diff=" + str(open_braces - close_braces))
if open_braces != close_braces:
    print("WARNING: Brace mismatch detected! Adding missing closing braces.")
    while css_clean.count('{') > css_clean.count('}'):
        css_clean += '}'

print("CSS after cleanup: " + str(len(css_clean)) + " chars")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css_clean)

print("v9.2 hotfix applied: CSS deduplicated, review-wall fixed, breadcrumbs ensured")
