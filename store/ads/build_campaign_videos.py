"""Short Foxiem Android ad videos from the real app screenshots.

Keeps the two existing 16s films. Adds 18 clips: six messages in
portrait, landscape and square. Copy matches the live English assets.
The call to action is Google Play, because this campaign is Android.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import build_ios_ad as base

OUT = Path(r"c:\Users\hkuzudisli\Desktop\foxiem-mobile\store\ads")
VIDEO_DIR = OUT / "videos"
STILL_DIR = VIDEO_DIR / "stills"
SRC = OUT / "src"
HOME = SRC / "bccd3c93-ea1c-47ef-8e4d-1d7393a911f0.jpg"
STATS = SRC / "ef8d4daf-7269-4b25-9c20-dc0d5d5d487a.jpg"
STREAK = SRC / "2815aaa8-45af-4ae8-835c-f935fe452d90.jpg"
SPLASH = SRC / "3a39933d-c786-4e16-b878-419b16f103a5.jpg"

FONT_B = base.FONT_B
FONT_R = base.FONT_R
NAVY = base.NAVY
FPS = 30
DURATION = 12.0

# Six distinct beats. Each is rendered in three aspect ratios.
BEATS = [
    ("counters", HOME, "Multiple named counters", "Tap +1, +5 or -1."),
    ("stats", STATS, "Stats, history and streaks", "Day, week and month."),
    ("streak", STREAK, "Small counts. Big progress.", "Keep a daily streak."),
    ("local", HOME, "No account needed", "Counts stay on your phone."),
    ("habits", HOME, "Habits, reps, daily goals", "Give each counter a name."),
    ("brand", HOME, "Foxiem: Tally Counter", "Habits, reps and daily goals."),
]

SIZES = {
    "p": (1080, 1920),
    "l": (1920, 1080),
    "s": (1080, 1080),
}


def fonts_for(w: int, h: int):
    landscape = w > h
    square = w == h
    if landscape:
        title, body, pill = 52, 30, 28
    elif square:
        title, body, pill = 44, 26, 28
    else:
        title, body, pill = 60, 34, 32
    return (
        ImageFont.truetype(FONT_B, title),
        ImageFont.truetype(FONT_R, body),
        ImageFont.truetype(FONT_B, pill),
        landscape,
    )


def product_still(w: int, h: int, shot: Image.Image, headline: str, sub: str) -> Image.Image:
    title_font, body_font, _pill, landscape = fonts_for(w, h)
    if landscape:
        inner = int(h * 0.78)
    elif w == h:
        inner = int(h * 0.62)
    else:
        inner = int(h * 0.62)
    device = base.phone(shot, inner)
    return base.product_frame(w, h, device, headline, sub, 1.0, (title_font, body_font, _pill), landscape)


def cover_focus(im: Image.Image, w: int, h: int, focus_y: float) -> Image.Image:
    scale = max(w / im.width, h / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = max(0, (nw - w) // 2)
    top = int((nh - h) * focus_y)
    top = max(0, min(top, max(0, nh - h)))
    return resized.crop((left, top, left + w, top + h))


def splash_still(w: int, h: int) -> Image.Image:
    # A 16:9 crop of the portrait art cuts the fox in half, so landscape uses a clean title card.
    if w > h:
        frame = base.background(w, h)
        title_font, body_font, _pill, _landscape = fonts_for(w, h)
        draw = ImageDraw.Draw(frame)
        draw.text((int(w * 0.08), int(h * 0.34)), "Foxiem", font=title_font, fill=NAVY)
        draw.text((int(w * 0.08), int(h * 0.50)), "Small counts. Big progress.", font=body_font, fill=(70, 84, 110))
        return frame
    focus = 0.5 if h > w else 0.18
    return cover_focus(Image.open(SPLASH).convert("RGB"), w, h, focus).convert("RGBA")


def cta_still(w: int, h: int) -> Image.Image:
    _title, body_font, pill_font, _landscape = fonts_for(w, h)
    if w > h:
        frame = splash_still(w, h)
        draw = ImageDraw.Draw(frame)
        label = "Get it on Google Play"
        box = draw.textbbox((0, 0), label, font=pill_font)
        tw, th = box[2] - box[0], box[3] - box[1]
        pill_w = tw + int(w * 0.04)
        pill_h = th + int(h * 0.04)
        px = int(w * 0.08)
        py = int(h * 0.66)
        draw.rounded_rectangle((px, py, px + pill_w, py + pill_h), pill_h // 2, fill=(37, 99, 235, 255))
        draw.text((px + (pill_w - tw) // 2, py + (pill_h - th) // 2 - 1), label, font=pill_font, fill=(255, 255, 255))
        return frame
    frame = splash_still(w, h)
    veil = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(veil)
    band_top = int(h * 0.72)
    for y in range(band_top, h):
        alpha = int(150 * ((y - band_top) / max(1, h - band_top)))
        d.line((0, y, w, y), fill=(10, 18, 32, alpha))
    frame.alpha_composite(veil)
    draw = ImageDraw.Draw(frame)
    label = "Get it on Google Play"
    box = draw.textbbox((0, 0), label, font=pill_font)
    tw, th = box[2] - box[0], box[3] - box[1]
    pill_w = tw + int(w * 0.08)
    pill_h = th + int(h * 0.028)
    px = (w - pill_w) // 2
    py = int(h * 0.82)
    draw.rounded_rectangle((px, py, px + pill_w, py + pill_h), pill_h // 2, fill=(255, 255, 255, 245))
    draw.text(((w - tw) // 2, py + (pill_h - th) // 2 - 1), label, font=pill_font, fill=NAVY)
    return frame


def render_stills() -> list[tuple[str, Path, Path, Path]]:
    STILL_DIR.mkdir(parents=True, exist_ok=True)
    shots = {
        HOME: Image.open(HOME).convert("RGB"),
        STATS: Image.open(STATS).convert("RGB"),
        STREAK: Image.open(STREAK).convert("RGB"),
    }
    jobs: list[tuple[str, Path, Path, Path]] = []
    n = 1
    for key, (w, h) in SIZES.items():
        splash = splash_still(w, h)
        cta = cta_still(w, h)
        splash_path = STILL_DIR / f"{key}-splash.png"
        cta_path = STILL_DIR / f"{key}-cta.png"
        splash.convert("RGB").save(splash_path, optimize=True)
        cta.convert("RGB").save(cta_path, optimize=True)
        for slug, shot_path, headline, sub in BEATS:
            mid = product_still(w, h, shots[shot_path], headline, sub)
            mid_path = STILL_DIR / f"{n:02d}-{key}-{slug}.png"
            mid.convert("RGB").save(mid_path, optimize=True)
            jobs.append((f"{n:02d}-{key}-{slug}", splash_path, mid_path, cta_path))
            n += 1
    return jobs


def encode(name: str, splash: Path, mid: Path, cta: Path, audio: Path) -> None:
    out = VIDEO_DIR / f"{name}.mp4"
    # 3.2s + 6.4s + 3.2s with two 0.4s fades = 12.0s
    filt = (
        "[0:v]scale=iw:ih,zoompan=z='min(1+0.00045*on,1.05)':"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=96:s=1080x1920:fps=30,format=yuv420p[v0];"
        "[1:v]scale=iw:ih,zoompan=z='min(1+0.00028*on,1.06)':"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=192:s=1080x1920:fps=30,format=yuv420p[v1];"
        "[2:v]scale=iw:ih,zoompan=z='min(1+0.00045*on,1.05)':"
        "x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=96:s=1080x1920:fps=30,format=yuv420p[v2];"
        "[v0][v1]xfade=transition=fade:duration=0.4:offset=2.8[x1];"
        "[x1][v2]xfade=transition=fade:duration=0.4:offset=8.8[v]"
    )
    # zoompan output size must match the still. Read it from the mid image.
    with Image.open(mid) as im:
        w, h = im.size
    filt = filt.replace("s=1080x1920", f"s={w}x{h}")
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(splash),
        "-loop", "1", "-i", str(mid),
        "-loop", "1", "-i", str(cta),
        "-i", str(audio),
        "-filter_complex", filt,
        "-map", "[v]", "-map", "3:a",
        "-t", "12",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]
    subprocess.run(cmd, check=True)


def main() -> None:
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    audio = VIDEO_DIR / "bed-12.wav"
    base.build_audio(audio, DURATION)
    jobs = render_stills()
    print(f"stills {len(jobs)}")
    for name, splash, mid, cta in jobs:
        print("encode", name)
        encode(name, splash, mid, cta, audio)
    print("done", len(jobs))


if __name__ == "__main__":
    main()
