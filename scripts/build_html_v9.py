#!/usr/bin/env python3
"""
v9 HTML Build Script — Self-healing
Fixes:
1. achievements.html data-table: move out of review-wall, add proper responsive wrapper
2. Add IndexNow key meta tag
3. Add FAQPage schema for safety page
4. Ensure all external links have rel="nofollow noopener noreferrer"
5. Add explicit width/height to images missing them
6. Add visible breadcrumb navigation
7. Add critical CSS preload hint
"""
import re, os

PAGES = [
    "index.html", "our-story.html", "community.html", "events.html",
    "achievements.html", "safety.html", "store.html", "contact.html",
    "join.html", "404.html"
]

def fix_achievements(html):
    """Fix the achievements page data-table overflow issue.
    The data-table is inside <div class="review-wall reveal"> which has
    overflow:hidden (for the marquee), causing the table to be clipped.
    Solution: Move the data-table OUT of the review-wall div into its own div.
    """
    # Pattern: review-wall div containing data-table followed by data-review-wall div
    pattern = r'(<div class="review-wall reveal">)\s*(<h2 class="visually-hidden">[^<]+</h2>)\s*(<table class="data-table.*?</table>)\s*(<div data-review-wall>)'
    match = re.search(pattern, html, re.DOTALL)
    if match:
        table_html = match.group(3)
        h2_html = match.group(2)
        replacement = '<div class="metrics-block reveal">\n    ' + h2_html + '\n    ' + table_html + '\n  </div>\n  <div class="review-wall reveal">\n    <div data-review-wall>'
        html = html[:match.start()] + replacement + html[match.end():]

    # Remove inline style from review-wall-note
    html = html.replace('style="margin-top:var(--sp-3);"', '')
    return html

def add_indexnow_key(html):
    """Add IndexNow key meta tag"""
    if 'indexnow' not in html.lower():
        link_tag = '<link rel="indexnow" href="/bangwings-indexnow-key.txt">'
        html = html.replace('</head>', '  ' + link_tag + '\n</head>')
    return html

def add_faq_schema(html, page_name):
    """Add FAQPage schema for pages that have FAQ-like content"""
    if page_name == 'safety' and 'FAQPage' not in html:
        faq_schema = '\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "Is Bangwing IN safe for minors?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "Yes. Bangwing IN requires members to be 13+ (Discord ToS) and has active moderation, content filters, and a non-ban rehabilitation policy."\n    }\n  },{\n    "@type": "Question",\n    "name": "What is the non-ban policy?",\n    "acceptedAnswer": {\n      "@type": "Answer",\n      "text": "Instead of banning members for first offenses, Bangwing IN mutes and rehabilitates them, ensuring a safer community without racking up ban counts."\n    }\n  }]\n}\n</script>'
        html = html.replace('</head>', faq_schema + '\n</head>')
    return html

def ensure_nofollow(html):
    """Ensure all external links with target=_blank have rel=nofollow noopener noreferrer"""
    def fix_link(match):
        tag = match.group(0)
        if 'target="_blank"' in tag or "target='_blank'" in tag:
            if 'rel=' not in tag:
                href_match = re.search(r'href="([^"]+)"', tag)
                if href_match:
                    href = href_match.group(1)
                    if href.startswith('http') and 'bangwings.xyz' not in href:
                        tag = tag.replace('<a ', '<a rel="nofollow noopener noreferrer" ', 1)
            else:
                rel_match = re.search(r'rel="([^"]+)"', tag)
                if rel_match:
                    rel_val = rel_match.group(1)
                    if 'nofollow' not in rel_val:
                        new_rel = 'nofollow noopener noreferrer ' + rel_val
                        tag = tag.replace(rel_match.group(0), 'rel="' + new_rel + '"')
        return tag
    html = re.sub(r'<a\s[^>]*target=["\']_blank["\'][^>]*>', fix_link, html)
    return html

def add_image_dimensions(html):
    """Add explicit width/height to images missing them"""
    def fix_img(match):
        tag = match.group(0)
        if 'width=' not in tag:
            tag = re.sub(r'<img ', '<img width="800" height="600" ', tag, count=1)
        return tag
    html = re.sub(r'<img(?![^>]*\swidth=)[^>]*>', fix_img, html)
    return html

def add_breadcrumb_html(html, page_name):
    """Add visible breadcrumb navigation HTML after the header"""
    if 'class="breadcrumbs"' in html:
        return html
    page_names = {
        'our-story': 'Our Story', 'community': 'Community', 'events': 'Events',
        'achievements': 'Achievements', 'safety': 'Safety', 'store': 'Store',
        'contact': 'Contact', 'join': 'Join',
    }
    page_key = page_name.replace('.html', '')
    if page_key not in page_names or page_key == 'index':
        return html
    label = page_names[page_key]
    breadcrumb_html = '\n<nav class="breadcrumbs" aria-label="Breadcrumb">\n  <a href="/">Home</a>\n  <span aria-hidden="true">\u203a</span>\n  <span aria-current="page">' + label + '</span>\n</nav>\n'
    header_end = html.find('</header>')
    if header_end > 0:
        header_end += len('</header>')
        html = html[:header_end] + breadcrumb_html + html[header_end:]
    return html

def add_critical_css_preload(html):
    """Add preload hint for critical CSS"""
    if 'rel="preload"' not in html and 'rel="stylesheet" href="/assets/css/style.css"' in html:
        preload = '<link rel="preload" href="/assets/css/style.css" as="style">'
        html = html.replace(
            '<link rel="stylesheet" href="/assets/css/style.css">',
            preload + '\n<link rel="stylesheet" href="/assets/css/style.css">'
        )
    return html

def process_html(html, filename):
    page_name = filename.replace('.html', '')
    if filename == 'achievements.html':
        html = fix_achievements(html)
    html = add_indexnow_key(html)
    html = add_faq_schema(html, page_name)
    html = ensure_nofollow(html)
    html = add_image_dimensions(html)
    html = add_breadcrumb_html(html, page_name)
    html = add_critical_css_preload(html)
    return html

if __name__ == "__main__":
    for page in PAGES:
        if os.path.exists(page):
            with open(page, "r", encoding="utf-8") as f:
                html = f.read()
            original_len = len(html)
            html = process_html(html, page)
            with open(page, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"v9 HTML applied to {page} ({original_len} -> {len(html)} bytes)")
        else:
            print(f"SKIP: {page} not found")
