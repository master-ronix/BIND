#!/usr/bin/env python3
"""Generate brand PNG icons from the logo SVG using Pillow."""
import os
from PIL import Image, ImageDraw
import io

repo = "."
brand_dir = os.path.join(repo, "assets", "images", "brand")
os.makedirs(brand_dir, exist_ok=True)

# The logo path data (double-chevron wing mark)
# We'll draw it programmatically since we can't render SVG directly
def draw_logo(size, bg_color=None):
    """Draw the Bangwing IN wing logo at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor based on viewBox 915x727
    sx = size / 915.0
    sy = size / 727.0
    
    # Simplified wing shape - two chevrons forming a V/W
    # Using the actual path data from the SVG
    points_left = [
        (10, 10), (72, 10), (430, 445), (430, 609),
        (74, 261), (10, 261), (10, 276), (452, 717),
        (462, 717)
    ]
    points_right = [
        (462, 717), (905, 275), (905, 261),
        (835, 261), (485, 608), (485, 449),
        (905, 25), (905, 10), (841, 10), (459, 391)
    ]
    
    # Scale all points
    left = [(x * sx, y * sy) for x, y in points_left]
    right = [(x * sx, y * sy) for x, y in points_right]
    
    # Draw filled polygon
    all_points = left + right
    fill_color = (250, 241, 228, 255)  # #FAF1E4
    
    if bg_color:
        bg_img = Image.new("RGBA", (size, size), bg_color)
        draw = ImageDraw.Draw(bg_img)
        draw.polygon(all_points, fill=fill_color)
        return bg_img
    else:
        draw.polygon(all_points, fill=fill_color)
        return img

# Generate icons
sizes = {
    "icon-32.png": 32,
    "icon-180.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "logo-64.png": 64,
    "logo-128.png": 128,
    "logo-256.png": 256,
}

for name, size in sizes.items():
    img = draw_logo(size)
    img.save(os.path.join(brand_dir, name), "PNG")
    print(f"Generated {name} ({size}x{size})")

# Generate WebP versions
for name, size in [("logo-64.webp", 64), ("logo-128.webp", 128), ("logo-256.webp", 256)]:
    img = draw_logo(size)
    img.save(os.path.join(brand_dir, name), "WEBP")
    print(f"Generated {name}")

# Generate ICO
img_32 = draw_logo(32)
img_16 = draw_logo(16)
img_32.save(os.path.join(brand_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32)])
print("Generated favicon.ico")

print("\n=== All brand assets generated ===")
