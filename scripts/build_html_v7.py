#!/usr/bin/env python3
"""
Build all HTML page enhancements and deployment config for Bangwing IN v7.
Updates: SEO meta tags, logo integration, structured data, speculation rules,
deployment config, and cleanup.
"""
import os, re

repo = "."

PAGES = {
    "index.html": {
        "title": "Bangwing IN | Indian Discord Community — Bound by Inclusion",
        "desc": "Bangwing IN is a social Discord community from India for art, photography and writing. No giveaways, no dating, no scams — just people, since Jan 2023.",
        "canonical": "https://bangwings.xyz/",
    },
    "our-story.html": {
        "title": "Our Story — From Dragons to Bangwing IN",
        "desc": "How a private Minecraft SMP team became Bangwing IN: the founder, the three-phase evolution, and the values that shaped India's most inclusive Discord community.",
        "canonical": "https://bangwings.xyz/our-story",
    },
    "community.html": {
        "title": "Community — Forums, Music & Voice Inside Bangwing IN",
        "desc": "A full tour of Bangwing IN: activity forums for art and writing, 24/7 community radio, voice events, and member-led channels. See every corner of our Discord.",
        "canonical": "https://bangwings.xyz/community",
    },
    "events.html": {
        "title": "Events — Bangwing IN's Community Events Archive",
        "desc": "Knight's Gambit, Nature's Canvas, The Rose Station, Pixel Pursuit, She Isn't Alone — every Bangwing IN community event, archived with results and highlights.",
        "canonical": "https://bangwings.xyz/events",
    },
    "achievements.html": {
        "title": "Achievements — #1 Rated Discord Community | Bangwing IN",
        "desc": "4.9/5.0 across 27 public reviews, copied unedited from TheHiveIndex and Disboard. See why Bangwing IN is the #1 top-rated Indian Discord social community server.",
        "canonical": "https://bangwings.xyz/achievements",
    },
    "safety.html": {
        "title": "Safety & Guidelines — How Bangwing IN Handles Rules",
        "desc": "No-ban, rehabilitation-first moderation, eight rule departments in plain language, and a transparent ticket system. Safety is structural at Bangwing IN.",
        "canonical": "https://bangwings.xyz/safety",
    },
    "store.html": {
        "title": "Store — Coming Soon | Bangwing IN",
        "desc": "The Bangwing IN store is on its way — custom role icons, emoji packs, and member-exclusive merchandise. Built properly, not rushed.",
        "canonical": "https://bangwings.xyz/store",
    },
    "contact.html": {
        "title": "Contact Bangwing IN — Business, Collabs & Social",
        "desc": "Reach Bangwing IN for business inquiries, collaborations, or press. In-server is fastest for community questions; email for everything else.",
        "canonical": "https://bangwings.xyz/contact",
    },
    "join.html": {
        "title": "Join Bangwing IN — What to Expect",
        "desc": "Free to join, 13+, no artist or gamer requirement. Here's exactly what happens when you join Bangwing IN — verification, onboarding, and your first channels.",
        "canonical": "https://bangwings.xyz/join",
    },
    "404.html": {
        "title": "Page Not Found — Bangwing IN",
        "desc": "This page doesn't exist. Head back to Bangwing IN's homepage.",
        "canonical": "https://bangwings.xyz/404.html",
    },
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

OG_IMAGE = "https://bangwings.xyz/assets/images/brand/og-image.svg"

for page_name, page_data in PAGES.items():
    path = os.path.join(repo, page_name)
    if not os.path.exists(path):
        print(f"SKIP: {page_name} not found")
        continue

    with open(path, 'r', errors='replace') as f:
        html = f.read()

    original_len = len(html)
    changes = []

    # Fix 1: Remove GSC placeholder
    if 'PASTE-YOUR-GOOGLE-SEARCH-CONSOLE-CODE-HERE' in html:
        html = html.replace(
            '<meta name="google-site-verification" content="PASTE-YOUR-GOOGLE-SEARCH-CONSOLE-CODE-HERE">',
            '<!-- GSC verification: add meta tag when code is available -->'
        )
        changes.append("removed GSC placeholder")

    # Fix 2: Remove canonical for 404
    if page_name == "404.html":
        html = re.sub(r'<link rel="canonical" href="[^"]*">\n?', '', html)
        changes.append("removed canonical from 404")

    # Fix 3: Add hreflang
    if 'hreflang' not in html and page_name != "404.html":
        canonical = page_data["canonical"]
        hreflang_tag = f'\n<link rel="alternate" hreflang="en" href="{canonical}">\n<link rel="alternate" hreflang="x-default" href="{canonical}">'
        html = re.sub(r'(<link rel="canonical"[^>]*>)', r'\1' + hreflang_tag, html)
        changes.append("added hreflang")

    # Fix 4: Add keywords meta
    if 'name="keywords"' not in html and page_name != "404.html":
        if page_name in KEYWORDS:
            kw_tag = f'\n<meta name="keywords" content="{KEYWORDS[page_name]}">'
            html = re.sub(r'(<meta name="description"[^>]*>)', r'\1' + kw_tag, html)
            changes.append("added keywords")

    # Fix 5: Add author meta
    if 'name="author"' not in html:
        author_tag = '\n<meta name="author" content="Bangwing IN — Bangwings Inclusion & INDIA (BIND)">'
        html = re.sub(r'(<meta name="keywords"[^>]*>|<meta name="description"[^>]*>)', r'\1' + author_tag, html, count=1)
        changes.append("added author")

    # Fix 6: Add OG image tags
    if 'og:image' not in html:
        og_block = f'\n<meta property="og:image" content="{OG_IMAGE}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="Bangwing IN — Indian Discord Community">'
        html = re.sub(r'(<meta name="theme-color"[^>]*>)', r'\1' + og_block, html)
        changes.append("added OG image")

    # Fix 7: Add reading-progress div
    if 'reading-progress' not in html:
        html = html.replace('</body>', '  <div class="reading-progress" aria-hidden="true"></div>\n</body>', 1)
        changes.append("added reading-progress")

    # Fix 8: Add data-cv to below-the-fold sections
    if page_name not in ["404.html", "store.html"]:
        sections = list(re.finditer(r'<section(?![^>]*data-cv)', html))
        for i, match in enumerate(sections):
            if i > 0:
                pos = match.start()
                html = html[:pos + 8] + ' data-cv="auto"' + html[pos + 8:]
                break
        changes.append("added content-visibility")

    # Fix 9: Add view-transition-name to main
    if 'view-transition-name' not in html:
        html = html.replace('<main', '<main style="view-transition-name: main;"', 1)
        changes.append("added view-transition-name")

    with open(path, 'w') as f:
        f.write(html)

    print(f"  {page_name}: {original_len} -> {len(html)} bytes — {', '.join(changes)}")

print("\n=== All HTML pages updated ===")
