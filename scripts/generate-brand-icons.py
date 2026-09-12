"""Generate Expo / web brand icons from the real Foxiem logo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

MOBILE_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = MOBILE_ROOT.parent / "foxiem-web"
SOURCE = MOBILE_ROOT / "assets" / "images" / "foxiem-logo.png"
BLACK = (0, 0, 0, 255)


def fit_square(src: Image.Image, size: int, fill=BLACK) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), fill)
    layer = src.convert("RGBA")
    layer.thumbnail((size, size), Image.Resampling.LANCZOS)
    ox = (size - layer.width) // 2
    oy = (size - layer.height) // 2
    canvas.paste(layer, (ox, oy), layer)
    return canvas


def adaptive_foreground(src: Image.Image, size: int = 1024) -> Image.Image:
    """Keep logo inside Android adaptive safe zone (~66% diameter)."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    safe = int(size * 0.72)
    layer = src.convert("RGBA")
    layer.thumbnail((safe, safe), Image.Resampling.LANCZOS)
    ox = (size - layer.width) // 2
    oy = (size - layer.height) // 2
    canvas.paste(layer, (ox, oy), layer)
    return canvas


def monochrome(src: Image.Image, size: int = 1024) -> Image.Image:
    """White silhouette on transparent for Android themed icons."""
    base = adaptive_foreground(src, size)
    pixels = base.load()
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out_px = out.load()
    for y in range(size):
        for x in range(size):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            # Treat near-black canvas as transparent; keep logo shape.
            if r < 18 and g < 18 and b < 18:
                continue
            lum = int(0.2126 * r + 0.7152 * g + 0.0722 * b)
            alpha = max(a, min(255, lum + 40))
            out_px[x, y] = (255, 255, 255, alpha)
    return out.filter(ImageFilter.SMOOTH_MORE)


def solid(size: int, color=BLACK) -> Image.Image:
    return Image.new("RGBA", (size, size), color)


def save_png(img: Image.Image, path: Path, *, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if rgb:
        bg = Image.new("RGB", img.size, (0, 0, 0))
        bg.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[-1])
        bg.save(path, "PNG", optimize=True)
    else:
        img.convert("RGBA").save(path, "PNG", optimize=True)
    print(f"wrote {path} ({path.stat().st_size} bytes, {img.size})")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source logo: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    mobile_assets = MOBILE_ROOT / "assets"
    web_public = WEB_ROOT / "public"
    web_images = web_public / "images"

    # iOS / Expo app icon
    save_png(fit_square(src, 1024), mobile_assets / "icon.png", rgb=True)

    # Android adaptive layers
    save_png(adaptive_foreground(src, 1024), mobile_assets / "android-icon-foreground.png")
    save_png(solid(1024, BLACK), mobile_assets / "android-icon-background.png")
    save_png(monochrome(src, 1024), mobile_assets / "android-icon-monochrome.png")

    # Expo web favicon + splash mark
    save_png(fit_square(src, 48), mobile_assets / "favicon.png")
    save_png(fit_square(src, 512), mobile_assets / "splash-icon.png")

    # Marketing / web icons
    save_png(fit_square(src, 512), web_images / "app-icon.png")
    save_png(fit_square(src, 48), web_public / "favicon.png")
    save_png(fit_square(src, 180), web_public / "apple-touch-icon.png")
    save_png(fit_square(src, 192), web_public / "icon-192.png")
    save_png(fit_square(src, 512), web_public / "icon-512.png")

    # Keep web source logo in sync if mobile logo is newer/different size
    web_logo = web_images / "foxiem-logo.png"
    if web_logo.exists():
        # Do not recompress aggressively; only replace if clearly different.
        pass

    print("done")


if __name__ == "__main__":
    main()
