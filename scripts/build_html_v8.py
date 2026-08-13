#!/usr/bin/env python3
"""v8 HTML: fix achievements bug, add JSON-LD, breadcrumbs, nofollow, SEO meta to all pages."""
import os, re, json

repo = os.environ.get('REPO_PATH', '.')

PAGES = {
    "index.html": {"title": "Bangwing IN | Indian Discord Community — Bound by Inclusion", "desc": "Bangwing IN is a social Discord community from India for art, photography and writing. No giveaways, no dating, no scams — just people, since Jan 2023.", "canonical": "https://bangwings.xyz/", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["WebSite", "Organization"]},
    "our-story.html": {"title": "Our Story — From Dragons to Bangwing IN", "desc": "How a private Minecraft SMP team became Bangwing IN: the founder, the three-phase evolution, and the values that shaped India's most inclusive Discord community.", "canonical": "https://bangwings.xyz/our-story", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["Article", "BreadcrumbList"]},
    "community.html": {"title": "Community — Forums, Music & Voice Inside Bangwing IN", "desc": "A full tour of Bangwing IN: activity forums for art and writing, 24/7 community radio, voice events, and member-led channels. See every corner of our Discord.", "canonical": "https://bangwings.xyz/community", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["WebPage", "BreadcrumbList"]},
    "events.html": {"title": "Events — Bangwing IN's Community Events Archive", "desc": "Knight's Gambit, Nature's Canvas, The Rose Station, Pixel Pursuit, She Isn't Alone — every Bangwing IN community event, archived with results and highlights.", "canonical": "https://bangwings.xyz/events", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["ItemList", "BreadcrumbList"]},
    "achievements.html": {"title": "Achievements — #1 Rated Discord Community | Bangwing IN", "desc": "4.9/5.0 across 27 public reviews, copied unedited from TheHiveIndex and Disboard. See why Bangwing IN is the #1 top-rated Indian Discord social community server.", "canonical": "https://bangwings.xyz/achievements", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["Review", "AggregateRating", "BreadcrumbList"]},
    "safety.html": {"title": "Safety & Guidelines — How Bangwing IN Handles Rules", "desc": "No-ban, rehabilitation-first moderation, eight rule departments in plain language, and a transparent ticket system. Safety is structural at Bangwing IN.", "canonical": "https://bangwings.xyz/safety", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["FAQPage", "BreadcrumbList"]},
    "store.html": {"title": "Store — Coming Soon | Bangwing IN", "desc": "The Bangwing IN store is on its way — custom role icons, emoji packs, and member-exclusive merchandise. Built properly, not rushed.", "canonical": "https://bangwings.xyz/store", "robots": "noindex, follow", "schemas": []},
    "contact.html": {"title": "Contact Bangwing IN — Business, Collabs & Social", "desc": "Reach Bangwing IN for business inquiries, collaborations, or press. In-server is fastest for community questions; email for everything else.", "canonical": "https://bangwings.xyz/contact", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["ContactPage", "BreadcrumbList"]},
    "join.html": {"title": "Join Bangwing IN — What to Expect", "desc": "Free to join, 13+, no artist or gamer requirement. Here's exactly what happens when you join Bangwing IN — verification, onboarding, and your first channels.", "canonical": "https://bangwings.xyz/join", "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "schemas": ["FAQPage", "BreadcrumbList"]},
    "404.html": {"title": "Page Not Found — Bangwing IN", "desc": "This page doesn't exist. Head back to Bangwing IN's homepage.", "canonical": "", "robots": "noindex", "schemas": []},
}

BREADCRUMBS = {
    "our-story.html": [("Home", "/"), ("Our Story", None)],
    "community.html": [("Home", "/"), ("Community", None)],
    "events.html": [("Home", "/"), ("Events", None)],
    "achievements.html": [("Home", "/"), ("Achievements", None)],
    "safety.html": [("Home", "/"), ("Safety & Guidelines", None)],
    "store.html": [("Home", "/"), ("Store", None)],
    "contact.html": [("Home", "/"), ("Contact", None)],
    "join.html": [("Home", "/"), ("Join", None)],
}

KEYWORDS = {
    "index.html": "discord community, india discord, bangwing, social community, art forums, photography, writing, inclusive discord server",
    "our-story.html": "bangwing story, discord community history, minecraft to discord, indian gaming community, bind community",
    "community.html": "discord community forums, art forums, writing community, community radio, voice events, discord channels",
    "events.html": "discord events, community events, knights gambit, natures canvas, pixel pursuit, discord tournaments",
    "achievements.html": "discord community reviews, top discord server, rated discord community, thehiveindex, disboard reviews",
    "safety.html": "discord safety, community guidelines, moderation, no-ban policy, rehabilitation, discord rules",
    "store.html": "bangwing store, discord merchandise, role icons, emoji packs, community store",
    "contact.html": "contact bangwing, discord business inquiry, collaboration, press contact, community support",
    "join.html": "join discord, bangwing join, discord onboarding, discord verification, how to join discord community",
}

def make_schema(page_name, pd):
    s = []
    c = pd["canonical"]
    if "Organization" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"Organization","@id":c+"#org","name":"Bangwing IN","alternateName":"Bangwings Inclusion & INDIA (BIND)","url":"https://bangwings.xyz/","logo":"https://bangwings.xyz/assets/images/brand/logo-256.png","foundingDate":"2023-01-10","founder":{"@type":"Person","name":"Rachit Ranjan"},"description":"A social Discord community from India centered on activity forums for art, photography, writing, music and tech.","sameAs":["https://discord.gg/w3Pe95knF6","https://instagram.com/bangwings.in","https://twitter.com/bangwings_in","https://youtube.com/@bangwings.official"]})
    if "WebSite" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"WebSite","@id":c+"#website","name":"Bangwing IN","url":"https://bangwings.xyz/","publisher":{"@id":"https://bangwings.xyz/#org"}})
    if "WebPage" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"WebPage","@id":c+"#page","name":pd["title"],"url":c,"description":pd["desc"],"isPartOf":{"@id":"https://bangwings.xyz/#website"},"about":{"@id":"https://bangwings.xyz/#org"}})
    if "Article" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"Article","headline":pd["title"],"description":pd["desc"],"url":c,"datePublished":"2023-01-10","dateModified":"2026-08-13","author":{"@type":"Person","name":"Rachit Ranjan"},"publisher":{"@id":"https://bangwings.xyz/#org"},"mainEntityOfPage":c})
    if "ItemList" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"ItemList","name":"Bangwing IN Events Archive","description":"Complete archive of community events held at Bangwing IN.","url":c,"itemListElement":[{"@type":"ListItem","position":1,"name":"Knight's Gambit"},{"@type":"ListItem","position":2,"name":"Nature's Canvas"},{"@type":"ListItem","position":3,"name":"The Rose Station"},{"@type":"ListItem","position":4,"name":"Pixel Pursuit"},{"@type":"ListItem","position":5,"name":"She Isn't Alone"}]})
    if "Review" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"Review","itemReviewed":{"@id":"https://bangwings.xyz/#org"},"reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},"author":{"@type":"Person","name":"Community Member"},"publisher":{"@type":"Organization","name":"TheHiveIndex"}})
    if "AggregateRating" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"AggregateRating","itemReviewed":{"@id":"https://bangwings.xyz/#org"},"ratingValue":"4.9","bestRating":"5","ratingCount":"27","reviewCount":"27"})
    if "ContactPage" in pd["schemas"]:
        s.append({"@context":"https://schema.org","@type":"ContactPage","name":pd["title"],"url":c,"description":pd["desc"],"mainEntity":{"@type":"Organization","@id":"https://bangwings.xyz/#org","email":"bangwings@zohomail.in","contactPoint":{"@type":"ContactPoint","contactType":"customer support","url":"https://discord.gg/w3Pe95knF6","availableLanguage":["en","hi"]}}})
    if "FAQPage" in pd["schemas"]:
        if page_name == "safety.html":
            s.append({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Does Bangwing IN ban members?","acceptedAnswer":{"@type":"Answer","text":"No. Bangwing IN follows a no-ban, rehabilitation-first moderation policy. Members who break rules are given warnings and guided back, not permanently removed."}},{"@type":"Question","name":"How many rule departments does Bangwing IN have?","acceptedAnswer":{"@type":"Answer","text":"Eight rule departments: Conduct, Content, Privacy, Safety, Community, Equality & Unity, and Finance — all documented and enforced."}},{"@type":"Question","name":"How does the ticket system work?","acceptedAnswer":{"@type":"Answer","text":"Bangwing IN uses a transparent ticket system where members can raise concerns and track them openly, ensuring accountability in moderation."}}]})
        elif page_name == "join.html":
            s.append({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is Bangwing IN free to join?","acceptedAnswer":{"@type":"Answer","text":"Yes, completely free. No payment, no subscription, no hidden fees."}},{"@type":"Question","name":"What is the minimum age to join?","acceptedAnswer":{"@type":"Answer","text":"You must be 13 or older to join Bangwing IN, in compliance with Discord's Terms of Service."}},{"@type":"Question","name":"Do I need to be an artist or gamer?","acceptedAnswer":{"@type":"Answer","text":"No. There is no artist or gamer requirement. Bangwing IN welcomes anyone interested in art, photography, writing, music, or tech."}}]})
    if "BreadcrumbList" in pd["schemas"] and page_name in BREADCRUMBS:
        items = [{"@type":"ListItem","position":i+1,"name":n,**({"item":"https://bangwings.xyz"+u} if u else {})} for i,(n,u) in enumerate(BREADCRUMBS[page_name])]
        s.append({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items})
    return s

def make_breadcrumb_html(pn):
    if pn not in BREADCRUMBS:
        return ""
    items = [f'<li><a href="{u}">{n}</a></li>' if u else f'<li>{n}</li>' for n,u in BREADCRUMBS[pn]]
    return f'<nav class="breadcrumbs wrap" aria-label="Breadcrumb"><ol>{"".join(items)}</ol></nav>'

for pn, pd in PAGES.items():
    path = os.path.join(repo, pn)
    if not os.path.exists(path):
        print(f"SKIP: {pn}")
        continue
    with open(path, 'r', errors='replace') as f:
        html = f.read()
    orig = len(html)
    ch = []

    # FIX 1: Fix achievements broken div tag
    if pn == "achievements.html":
        html = re.sub(r'<div class="review-wall reveal"\s*\n\s*<h2', '<div class="review-wall reveal">\n    <h2', html)
        ch.append("fixed review-wall div")

    # FIX 2: Title and description
    html = re.sub(r'<title>[^<]*</title>', f'<title>{pd["title"]}</title>', html)
    html = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{pd["desc"]}">', html)
    ch.append("title/desc")

    # FIX 3: Robots meta
    if 'name="robots"' in html:
        html = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{pd["robots"]}">', html)
    else:
        html = re.sub(r'(<meta name="description"[^>]*>)', r'\1\n<meta name="robots" content="'+pd["robots"]+'">', html, count=1)
    ch.append("robots")

    # FIX 4: hreflang
    if pn != "404.html" and pd["canonical"] and 'hreflang' not in html:
        c = pd["canonical"]
        html = re.sub(r'(<link rel="canonical"[^>]*>)', r'\1\n<link rel="alternate" hreflang="en" href="'+c+'">\n<link rel="alternate" hreflang="x-default" href="'+c+'">', html)
        ch.append("hreflang")

    # FIX 5: Keywords
    if pn in KEYWORDS and 'name="keywords"' not in html:
        html = re.sub(r'(<meta name="description"[^>]*>)', r'\1\n<meta name="keywords" content="'+KEYWORDS[pn]+'">', html)
        ch.append("keywords")

    # FIX 6: Author
    if 'name="author"' not in html:
        html = re.sub(r'(<meta name="keywords"[^>]*>|<meta name="description"[^>]*>)', r'\1\n<meta name="author" content="Bangwing IN — Bangwings Inclusion & INDIA (BIND)">', html, count=1)
        ch.append("author")

    # FIX 7: OG image
    if 'og:image' not in html and pn != "404.html":
        og = '\n<meta property="og:image" content="https://bangwings.xyz/assets/images/og-image.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="Bangwing IN — Indian Discord Community">'
        html = re.sub(r'(<meta name="theme-color"[^>]*>)', r'\1'+og, html)
        ch.append("og:image")

    # FIX 8: JSON-LD
    if pd["schemas"] and pd["canonical"]:
        schemas = make_schema(pn, pd)
        if schemas and 'application/ld+json' not in html:
            sch = "".join(f'\n<script type="application/ld+json">\n{json.dumps(s, indent=2, ensure_ascii=False)}\n</script>' for s in schemas)
            html = html.replace('</head>', sch+'\n</head>')
            ch.append(f"{len(schemas)} JSON-LD")

    # FIX 9: Breadcrumbs
    if pn in BREADCRUMBS and 'class="breadcrumbs"' not in html:
        html = html.replace('<main', make_breadcrumb_html(pn)+'\n<main', 1)
        ch.append("breadcrumbs")

    # FIX 10: nofollow on external links
    def fix_links(text):
        def repl(m):
            tag = m.group(0)
            href = m.group(1)
            if href.startswith('http') and 'bangwings.xyz' not in href:
                if 'rel="' in tag:
                    rm = re.search(r'rel="([^"]*)"', tag)
                    if rm and 'nofollow' not in rm.group(1):
                        tag = tag.replace(rm.group(0), f'rel="nofollow {rm.group(1)}"')
                else:
                    tag = tag.replace('<a ', '<a rel="nofollow noopener noreferrer" ', 1)
            return tag
        return re.sub(r'<a\s+[^>]*href="([^"]*)"[^>]*>', repl, text)
    html = fix_links(html)
    ch.append("nofollow")

    # FIX 11: Image dimensions
    html = re.sub(r'<img(?!\s+width=)', '<img width="800" height="600"', html)
    ch.append("img-dims")

    # FIX 12: Replace inline --moon
    if '--moon' in html:
        html = html.replace('style="color:var(--moon);', 'class="link-accent" style="')
        ch.append("moon-fix")

    # FIX 13: Reading progress
    if 'reading-progress' not in html:
        html = html.replace('</body>', '  <div class="reading-progress" aria-hidden="true"></div>\n</body>', 1)
        ch.append("reading-progress")

    # FIX 14: View transition
    if 'view-transition-name' not in html:
        html = html.replace('<main', '<main style="view-transition-name: main;"', 1)
        ch.append("view-transition")

    # FIX 15: Prefetch links
    if pn != "404.html" and 'rel="prefetch"' not in html:
        pf = ""
        if pn != "index.html": pf += '\n<link rel="prefetch" href="/">'
        if pn != "community.html": pf += '\n<link rel="prefetch" href="/community">'
        if pn != "join.html": pf += '\n<link rel="prefetch" href="/join">'
        html = html.replace('</head>', pf+'\n</head>')
        ch.append("prefetch")

    # FIX 16: Nav aria-label
    if '<nav class="nav' in html and 'aria-label=' not in html.split('<nav class="nav')[1].split('>')[0]:
        html = html.replace('<nav class="nav', '<nav aria-label="Primary" class="nav', 1)
        ch.append("nav-aria")

    # FIX 17: Skip link
    if 'skip-link' not in html:
        html = html.replace('<body>', '<body>\n<a href="#main" class="skip-link">Skip to content</a>', 1)
        ch.append("skip-link")

    # FIX 18: 404 cleanup
    if pn == "404.html":
        html = re.sub(r'<link rel="canonical" href="[^"]*">\n?', '', html)
        html = re.sub(r'<link rel="alternate" hreflang[^>]*>\n?', '', html)
        ch.append("404-cleanup")

    with open(path, 'w') as f:
        f.write(html)
    print(f"  {pn}: {orig} -> {len(html)} ({', '.join(ch)})")

print("\n=== v8 HTML done ===")
