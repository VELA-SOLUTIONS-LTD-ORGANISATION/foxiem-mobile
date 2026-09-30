"""Build Foxiem iOS Google Ads videos from the supplied stills."""
from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(r"c:\Users\hkuzudisli\Desktop\foxiem-mobile\store\ads")
SRC = OUT / "src"
HOME = SRC / "bccd3c93-ea1c-47ef-8e4d-1d7393a911f0.jpg"
STATS = SRC / "ef8d4daf-7269-4b25-9c20-dc0d5d5d487a.jpg"
STREAK = SRC / "2815aaa8-45af-4ae8-835c-f935fe452d90.jpg"
SPLASH = SRC / "3a39933d-c786-4e16-b878-419b16f103a5.jpg"

FONT_B = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_R = r"C:\Windows\Fonts\segoeui.ttf"
NAVY = (22, 36, 64)
FPS = 30
DURATION = 16.0


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def cover(im: Image.Image, w: int, h: int, zoom: float = 1.0) -> Image.Image:
    zw, zh = int(w * zoom), int(h * zoom)
    scale = max(zw / im.width, zh / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - zw) // 2
    top = (nh - zh) // 2
    cropped = resized.crop((left, top, left + zw, top + zh))
    if zoom != 1.0:
        cropped = cropped.resize((w, h), Image.Resampling.LANCZOS)
    return cropped


def rounded(im: Image.Image, radius: int) -> Image.Image:
    im = im.convert("RGBA")
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width, im.height), radius, fill=255)
    im.putalpha(mask)
    return im


def phone(shot: Image.Image, inner_h: int) -> Image.Image:
    aspect = shot.width / shot.height
    inner_w = int(inner_h * aspect)
    screen = shot.resize((inner_w, inner_h), Image.Resampling.LANCZOS).convert("RGBA")
    bezel = max(10, inner_h // 70)
    radius = max(28, inner_h // 22)
    canvas = Image.new("RGBA", (inner_w + bezel * 2, inner_h + bezel * 2), (0, 0, 0, 0))
    body = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle(
        (0, 0, canvas.width - 1, canvas.height - 1), radius + 8, fill=(18, 22, 28, 255)
    )
    body = rounded(body, radius + 8)
    canvas.alpha_composite(body)
    screen = rounded(screen, radius)
    canvas.alpha_composite(screen, (bezel, bezel))
    return canvas


def shadow_paste(base: Image.Image, sprite: Image.Image, xy: tuple[int, int]) -> None:
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    alpha = sprite.split()[-1].point(lambda p: int(p * 0.28))
    blob = Image.new("RGBA", sprite.size, (16, 24, 40, 255))
    blob.putalpha(alpha)
    sh.paste(blob, (xy[0] + 8, xy[1] + 18), blob)
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(sh)
    base.alpha_composite(sprite, xy)


def background(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), (244, 247, 252))
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        r = int(232 + (248 - 232) * t)
        g = int(240 + (246 - 240) * t)
        b = int(250 + (242 - 250) * t)
        for x in range(0, w, 2):
            px[x, y] = (r, g, b)
            if x + 1 < w:
                px[x + 1, y] = (r, g, b)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse((-w * 0.2, -h * 0.08, w * 0.7, h * 0.38), fill=(120, 160, 230, 46))
    d.ellipse((w * 0.35, h * 0.55, w * 1.15, h * 1.05), fill=(150, 120, 220, 36))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def text_center(draw: ImageDraw.ImageDraw, text: str, y: int, font: ImageFont.FreeTypeFont, fill, w: int) -> None:
    box = draw.textbbox((0, 0), text, font=font)
    x = (w - (box[2] - box[0])) // 2
    draw.text((x, y), text, font=font, fill=fill)


def blend(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    return Image.blend(a.convert("RGB"), b.convert("RGB"), ease(t)).convert("RGBA")


def splash_frame(w: int, h: int, splash: Image.Image, zoom: float, cta: bool, fonts) -> Image.Image:
    frame = cover(splash, w, h, zoom).convert("RGBA")
    if not cta:
        return frame
    veil = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(veil)
    band_top = int(h * 0.72)
    for i, y in enumerate(range(band_top, h)):
        alpha = int(170 * ((y - band_top) / (h - band_top)))
        d.line((0, y, w, y), fill=(10, 18, 32, alpha))
    frame.alpha_composite(veil)
    draw = ImageDraw.Draw(frame)
    title_font, body_font, pill_font = fonts
    text_center(draw, "Small counts. Big progress.", int(h * 0.76), title_font, (255, 255, 255), w)
    pill_w, pill_h = int(w * 0.62), int(h * 0.055)
    px = (w - pill_w) // 2
    py = int(h * 0.84)
    draw.rounded_rectangle((px, py, px + pill_w, py + pill_h), pill_h // 2, fill=(255, 255, 255, 245))
    label = "Download on the App Store"
    box = draw.textbbox((0, 0), label, font=pill_font)
    tw, th = box[2] - box[0], box[3] - box[1]
    draw.text(((w - tw) // 2, py + (pill_h - th) // 2 - 2), label, font=pill_font, fill=NAVY)
    return frame


def product_frame(w: int, h: int, device: Image.Image, headline: str, sub: str, rise: float, fonts, landscape: bool) -> Image.Image:
    frame = background(w, h)
    title_font, body_font, _pill = fonts
    draw = ImageDraw.Draw(frame)
    if landscape:
        text_x = int(w * 0.08)
        draw.text((text_x, int(h * 0.28)), "Foxiem", font=title_font, fill=NAVY)
        draw.text((text_x, int(h * 0.42)), headline, font=title_font, fill=NAVY)
        draw.text((text_x, int(h * 0.58)), sub, font=body_font, fill=(70, 84, 110))
        target_h = int(h * 0.86)
        sprite = device if device.height == target_h + device.width // 18 else phone_cached(device, target_h)
        # device passed in is already a phone sprite
        sprite = device
        y = int(h * 0.08 + (1 - rise) * h * 0.06)
        x = int(w * 0.58)
        shadow_paste(frame, sprite, (x, y))
    else:
        text_center(draw, headline, int(h * 0.07), title_font, NAVY, w)
        text_center(draw, sub, int(h * 0.125), body_font, (70, 84, 110), w)
        y = int(h * 0.20 + (1 - rise) * h * 0.04)
        x = (w - device.width) // 2
        shadow_paste(frame, device, (x, y))
    return frame


def phone_cached(shot, h):
    return phone(shot, h)


def build_audio(path: Path, seconds: float) -> None:
    sr = 44100
    n = int(sr * seconds)
    # Original bed: soft major pentatonic plucks plus a low pad.
    melody = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0]
    step = sr // 2
    samples = []
    for i in range(n):
        t = i / sr
        pad = 0.045 * math.sin(2 * math.pi * 130.81 * t) * (0.65 + 0.35 * math.sin(2 * math.pi * 0.12 * t))
        note_i = min(len(melody) - 1, i // step % len(melody))
        local = (i % step) / sr
        env = math.exp(-local * 4.2)
        pluck = 0.11 * env * math.sin(2 * math.pi * melody[note_i] * t)
        shimmer = 0.03 * env * math.sin(2 * math.pi * melody[note_i] * 2 * t)
        fade = 1.0
        if t < 0.4:
            fade = t / 0.4
        if t > seconds - 0.6:
            fade = max(0.0, (seconds - t) / 0.6)
        samples.append((pad + pluck + shimmer) * fade)
    peak = max(abs(s) for s in samples) or 1
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = b"".join(struct.pack("<h", int(max(-1, min(1, s / peak * 0.55)) * 32767)) for s in samples)
        wf.writeframes(frames)


def render(size: tuple[int, int], out_path: Path, audio: Path, preview_dir: Path | None) -> None:
    w, h = size
    landscape = w > h
    splash = Image.open(SPLASH).convert("RGB")
    shots = [Image.open(p).convert("RGB") for p in (HOME, STATS, STREAK)]
    if landscape:
        inner = int(h * 0.78)
        title_size, body_size, pill_size = 54, 32, 28
    else:
        inner = int(h * 0.68)
        title_size, body_size, pill_size = 64, 36, 34
    devices = [phone(s, inner) for s in shots]
    fonts_product = (
        ImageFont.truetype(FONT_B, title_size),
        ImageFont.truetype(FONT_R, body_size),
        ImageFont.truetype(FONT_B, pill_size),
    )
    fonts_splash = (
        ImageFont.truetype(FONT_B, 42 if landscape else 52),
        ImageFont.truetype(FONT_R, body_size),
        ImageFont.truetype(FONT_B, 28 if landscape else 34),
    )
    scenes = [
        ("splash", 0.0, 3.1, None),
        ("home", 3.1, 6.6, ("Count what matters", "Tap +1. No account needed.")),
        ("stats", 6.6, 10.3, ("See your progress", "History you can actually read.")),
        ("streak", 10.3, 13.5, ("Stay consistent", "One day at a time.")),
        ("cta", 13.5, DURATION, None),
    ]
    fade = 0.35

    def at(t: float) -> Image.Image:
        for i, (kind, start, end, copy) in enumerate(scenes):
            if t < end or i == len(scenes) - 1:
                local = (t - start) / max(0.001, end - start)
                if kind in ("splash", "cta"):
                    zoom = 1.0 + 0.06 * ease(local)
                    frame = splash_frame(w, h, splash, zoom, kind == "cta", fonts_splash)
                else:
                    idx = {"home": 0, "stats": 1, "streak": 2}[kind]
                    frame = product_frame(
                        w, h, devices[idx], copy[0], copy[1], ease(min(1, local / 0.35)), fonts_product, landscape
                    )
                if i > 0 and t < start + fade:
                    prev = scenes[i - 1]
                    pk, ps, pe, pc = prev
                    pt = pe - 0.02
                    return blend(at_raw(pt, pk, ps, pe, pc), frame, (t - start) / fade)
                return frame
        return splash_frame(w, h, splash, 1.0, True, fonts_splash)

    def at_raw(t, kind, start, end, copy):
        local = (t - start) / max(0.001, end - start)
        if kind in ("splash", "cta"):
            return splash_frame(w, h, splash, 1.0 + 0.06 * ease(local), kind == "cta", fonts_splash)
        idx = {"home": 0, "stats": 1, "streak": 2}[kind]
        return product_frame(w, h, devices[idx], copy[0], copy[1], 1.0, fonts_product, landscape)

    frames = int(DURATION * FPS)
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
        "-i", str(audio),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart",
        "-shortest",
        str(out_path),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for i in range(frames):
        t = i / FPS
        frame = at(t).convert("RGB")
        if preview_dir and i in {15, 90, 200, 320, 450}:
            frame.save(preview_dir / f"preview-{w}x{h}-{i:04d}.png")
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    code = proc.wait()
    if code != 0:
        raise SystemExit(f"ffmpeg failed with {code}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    audio = OUT / "bed.wav"
    build_audio(audio, DURATION)
    previews = OUT / "previews"
    previews.mkdir(exist_ok=True)
    render((1080, 1920), OUT / "foxiem-ios-portrait.mp4", audio, previews)
    render((1920, 1080), OUT / "foxiem-ios-landscape.mp4", audio, previews)
    print("done")


if __name__ == "__main__":
    main()
