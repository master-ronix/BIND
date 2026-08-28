#!/usr/bin/env python3
"""
Update all HTML files in site/ to use clean URLs (no .html).

This script applies regex replacements to convert:
  - canonical tags: /events.html → /events
  - og:url tags: /events.html → /events  
  - JSON-LD item URLs: /events.html → /events
  - Internal links: href="/events.html" → href="/events"
  - Internal links with fragment: href="/community.html#gallery" → href="/community#gallery"

Run from repo root: python3 scripts/update_clean_urls.py
"""
import re
import os
import sys

SITE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")

PAGES = [
    "index.html", "events.html", "our-story.html", "community.html",
    "achievements.html", "safety.html", "join.html", "store.html", "contact.html",
]

def clean_urls(html):
    """Apply all clean-URL transformations to HTML content."""
    original = html
    
    # 1. Canonical tags: .html → clean URL
    html = re.sub(
        r'(href="https://bangwings\.xyz/)([\w-]+)\.html"',
        r'\1\2',
        html
    )
    
    # 2. og:url tags
    html = re.sub(
        r'(content="https://bangwings\.xyz/)([\w-]+)\.html"',
        r'\1\2',
        html
    )
    
    # 3. JSON-LD "item" URLs
    html = re.sub(
        r'("item":\s*"https://bangwings\.xyz/)([\w-]+)\.html"',
        r'\1\2"',
        html
    )
    
    # 4. Internal links without fragment
    html = re.sub(r'href="/([\w-]+)\.html"', r'href="/\1"', html)
    
    # 5. Internal links with fragment
    html = re.sub(r'href="/([\w-]+)\.html(#\w+)"', r'href="/\1\2"', html)
    
    return html, html != original


def main():
    total_changed = 0
    
    for page in PAGES:
        filepath = os.path.join(SITE_DIR, page)
        if not os.path.exists(filepath):
            print(f"  SKIP {page}: file not found")
            continue
        
        with open(filepath, "r", encoding="utf-8") as f:
            html = f.read()
        
        original_count = len(re.findall(r'\.html', html))
        updated_html, changed = clean_urls(html)
        remaining_count = len(re.findall(r'\.html', updated_html))
        
        if changed:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated_html)
            print(f"  ✓ {page}: {original_count - remaining_count} .html URLs → clean URLs ({remaining_count} remaining)")
            total_changed += 1
        else:
            print(f"  - {page}: no changes needed")
    
    print(f"\n{total_changed} files updated.")
    
    # Verify no .html in URLs
    issues = []
    for page in PAGES:
        filepath = os.path.join(SITE_DIR, page)
        if not os.path.exists(filepath):
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            html = f.read()
        # Check for .html in href/content attributes
        matches = re.findall(r'(?:href|content)="[^"]*\.html[^"]*"', html)
        if matches:
            issues.append((page, matches))
    
    if issues:
        print("\n⚠ WARNING: .html URLs still found in:")
        for page, matches in issues:
            print(f"  {page}: {matches}")
    else:
        print("✓ All clean — no .html URLs in any href/content attributes.")


if __name__ == "__main__":
    main()
