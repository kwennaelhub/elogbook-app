#!/usr/bin/env python3
"""
Export logos InternLog — SVG → PNG multi-résolutions + favicon ICO
Utilise qlmanage (macOS natif) pour le rendu SVG → PNG haute qualité,
puis Pillow pour le redimensionnement et la création du favicon.
"""

import os
import subprocess
import tempfile
import shutil
from PIL import Image
import io

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINAL_DIR = os.path.join(BASE_DIR, "logos", "final")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
ICONS_DIR = os.path.join(PUBLIC_DIR, "icons")

# Tailles d'export pour l'icône principale
ICON_SIZES = [16, 32, 48, 64, 96, 128, 180, 192, 256, 384, 512, 1024, 2048]

# Tailles favicon ICO (multi-résolution)
FAVICON_SIZES = [16, 32, 48]


def svg_to_master_png(svg_path: str, size: int = 2048) -> Image.Image:
    """Rend un SVG en PNG haute résolution via qlmanage (macOS)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(
            ["qlmanage", "-t", "-s", str(size), "-o", tmpdir, svg_path],
            capture_output=True, timeout=15
        )
        # qlmanage ajoute .png au nom du fichier
        basename = os.path.basename(svg_path)
        png_path = os.path.join(tmpdir, f"{basename}.png")
        if not os.path.exists(png_path):
            raise FileNotFoundError(f"qlmanage n'a pas produit {png_path}")
        return Image.open(png_path).copy()


def resize_and_save(master: Image.Image, output_path: str, size: int):
    """Redimensionne le master et sauvegarde en PNG."""
    resized = master.resize((size, size), Image.LANCZOS)
    resized.save(output_path, "PNG")


def create_favicon(master: Image.Image, output_path: str):
    """Crée un .ico multi-résolution."""
    images = []
    for size in FAVICON_SIZES:
        images.append(master.resize((size, size), Image.LANCZOS))
    images[0].save(
        output_path, format="ICO",
        sizes=[(s, s) for s in FAVICON_SIZES],
        append_images=images[1:]
    )


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)

    icon_svg = os.path.join(FINAL_DIR, "logo-icon.svg")
    horiz_svg = os.path.join(FINAL_DIR, "logo-horizontal.svg")

    print("=== Export logos InternLog ===\n")

    # Rendre le master à 2048px
    print("Rendu master 2048×2048...")
    master = svg_to_master_png(icon_svg, 2048)
    # S'assurer que c'est en RGBA
    if master.mode != "RGBA":
        master = master.convert("RGBA")
    print(f"  Master : {master.size[0]}×{master.size[1]}px\n")

    # 1. Icône — toutes les tailles
    print("Icône principale (PNG multi-résolutions) :")
    for size in ICON_SIZES:
        out = os.path.join(ICONS_DIR, f"icon-{size}x{size}.png")
        resize_and_save(master, out, size)
        print(f"  {size}×{size}px")

    # 2. Apple Touch Icon (180px)
    apple_touch = os.path.join(PUBLIC_DIR, "apple-touch-icon.png")
    resize_and_save(master, apple_touch, 180)
    print(f"\nApple Touch Icon : 180×180px")

    # 3. Favicon ICO
    favicon_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    create_favicon(master, favicon_path)
    print(f"Favicon ICO : 16+32+48px")

    # 4. Logo principal public/logo.svg
    shutil.copy2(icon_svg, os.path.join(PUBLIC_DIR, "logo.svg"))
    print(f"\nlogo.svg copié dans public/")

    # 5. Logo horizontal PNG (920×256)
    print("\nLogo horizontal :")
    master_horiz = svg_to_master_png(horiz_svg, 1840)
    horiz_png = os.path.join(FINAL_DIR, "logo-horizontal-920x256.png")
    # Calculer la hauteur proportionnelle (920:256 = 3.59:1)
    # Le SVG est 920×256, le master est rendu à largeur 1840
    # On redimensionne à 920 de large
    w, h = master_horiz.size
    ratio = 920 / w
    new_h = int(h * ratio)
    resized_horiz = master_horiz.resize((920, new_h), Image.LANCZOS)
    resized_horiz.save(horiz_png, "PNG")
    print(f"  920×{new_h}px")

    # 6. OG Image (1200×630) — icône centrée sur fond teal
    og_icon = master.resize((400, 400), Image.LANCZOS)
    og_bg = Image.new("RGBA", (1200, 630), (8, 145, 178, 255))
    x = (1200 - 400) // 2
    y = (630 - 400) // 2
    og_bg.paste(og_icon, (x, y), og_icon)
    og_path = os.path.join(PUBLIC_DIR, "og-image.png")
    og_bg.save(og_path, "PNG")
    print(f"\nOG Image : 1200×630px")

    # Résumé
    total = len(ICON_SIZES) + 4  # icons + apple-touch + favicon + logo.svg + horiz + og
    print(f"\n=== {total} fichiers exportés ===")


if __name__ == "__main__":
    main()
