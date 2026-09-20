"""Render the bundled placeholder reels.

Mock video posts need something real to play so the player's buffering,
progress and completion paths are exercised rather than mimed. Rather than ship
stock footage the project has no rights to, each clip is a slow flight over the
same map the app draws, rendered from the same Natural Earth outlines.
"""
import json, math, os, struct, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter
import imageio_ffmpeg

SRC = os.path.dirname(os.path.abspath(__file__))
BIN = os.path.join(SRC, 'out', 'world_outlines.bin')
OUT = sys.argv[1]
W, H, FPS = 360, 640, 15
# One clip per length a mock post declares, so the preview's "35-second video"
# and the player's clock agree.
LENGTHS = {'sample_reel_a': 35, 'sample_reel_b': 50, 'sample_reel_c': 66}

A1, A2, A3, A4 = 1.340264, -0.081106, 0.000893, 0.003796
M = math.sqrt(3) / 2
HALF_H = (lambda t: t * (A1 + A2 * t * t + t**6 * (A3 + A4 * t * t)))(math.asin(M))
HALF_W = math.pi / (M * A1)
ASPECT = HALF_W / HALF_H


def project(lon, lat):
    lam = math.radians(lon)
    phi = math.radians(max(-90.0, min(90.0, lat)))
    th = math.asin(M * math.sin(phi))
    t2 = th * th
    t6 = t2 * t2 * t2
    x = lam * math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    return ((x + HALF_W) / (2 * HALF_H), (HALF_H - y) / (2 * HALF_H))


def load():
    b = open(BIN, 'rb').read()
    assert b[:8] == b'ATLASMP1'
    o = 8
    n, = struct.unpack_from('<H', b, o); o += 2
    countries = {}
    for _ in range(n):
        code = b[o:o+2].decode(); o += 2
        rings, = struct.unpack_from('<H', b, o); o += 2
        polys = []
        for _ in range(rings):
            c, = struct.unpack_from('<H', b, o); o += 2
            pts = []
            for _ in range(c):
                lon = struct.unpack_from('<h', b, o)[0] / 100
                lat = struct.unpack_from('<h', b, o + 2)[0] / 100
                o += 4
                pts.append(project(lon, lat))
            polys.append(pts)
        countries[code] = polys
    return countries


COUNTRIES = load()

# Three flights, each over a different part of the world, tinted differently.
CLIPS = [
    ('sample_reel_a', (0.96, 0.52), (1.34, 0.44), 5.2, (255, 179, 92), {'OM','AE','SA','YE','IR','IN','PK','EG','JO'}),
    ('sample_reel_b', (1.55, 0.36), (1.78, 0.46), 6.0, (127, 179, 255), {'JP','KR','CN','PH','VN','TH','ID','MY'}),
    ('sample_reel_c', (0.82, 0.30), (0.62, 0.40), 5.0, (143, 214, 168), {'GB','FR','DE','ES','IT','MA','PT','NL','IE'}),
]


def ease(t):
    return t * t * (3 - 2 * t)


def render(name, start, end, zoom, tint, lit):
    frames_dir = os.path.join(OUT, '_frames_' + name)
    os.makedirs(frames_dir, exist_ok=True)
    total = FPS * LENGTHS[name]
    base_scale = min(W / ASPECT, H) * zoom

    for f in range(total):
        t = ease(f / (total - 1))
        cx = start[0] + (end[0] - start[0]) * t
        cy = start[1] + (end[1] - start[1]) * t

        img = Image.new('RGB', (W, H), (7, 10, 16))
        draw = ImageDraw.Draw(img)

        def to_px(p):
            return (round((p[0] - cx) * base_scale + W / 2),
                    round((p[1] - cy) * base_scale + H / 2))

        # graticule
        for lon in range(-180, 181, 20):
            pts = [to_px(project(lon, lat)) for lat in range(-90, 91, 5)]
            draw.line(pts, fill=(16, 22, 32), width=1)
        for lat in range(-60, 61, 20):
            pts = [to_px(project(lon, lat)) for lon in range(-180, 181, 5)]
            draw.line(pts, fill=(16, 22, 32), width=1)

        for code, polys in COUNTRIES.items():
            fill = (28, 38, 52) if code in lit else (20, 26, 36)
            for pts in polys:
                px = [to_px(p) for p in pts]
                xs = [p[0] for p in px]; ys = [p[1] for p in px]
                if max(xs) < -60 or min(xs) > W + 60 or max(ys) < -60 or min(ys) > H + 60:
                    continue
                if len(px) >= 3:
                    draw.polygon(px, fill=fill, outline=(44, 56, 72))

        # a light that drifts across, like a scan
        glow = Image.new('L', (W, H), 0)
        gd = ImageDraw.Draw(glow)
        gx = W * (0.15 + 0.75 * ((f / total * 1.6) % 1.0))
        gy = H * (0.30 + 0.25 * math.sin(f / total * math.pi * 2))
        gd.ellipse([gx - 140, gy - 140, gx + 140, gy + 140], fill=90)
        glow = glow.filter(ImageFilter.GaussianBlur(48))
        img = Image.composite(Image.new('RGB', (W, H), tint), img, glow.point(lambda v: v // 3))

        # vignette
        vig = Image.new('L', (W, H), 0)
        ImageDraw.Draw(vig).ellipse([-W * 0.3, -H * 0.15, W * 1.3, H * 1.15], fill=255)
        vig = vig.filter(ImageFilter.GaussianBlur(80))
        img = Image.composite(img, Image.new('RGB', (W, H), (4, 6, 10)), vig)

        img.save(os.path.join(frames_dir, f'{f:04d}.png'))

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    out = os.path.join(OUT, f'{name}.mp4')
    subprocess.run([
        ffmpeg, '-y', '-loglevel', 'error', '-framerate', str(FPS),
        '-i', os.path.join(frames_dir, '%04d.png'),
        '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1',
        '-pix_fmt', 'yuv420p', '-crf', '32', '-movflags', '+faststart',
        out,
    ], check=True)
    for f in os.listdir(frames_dir):
        os.remove(os.path.join(frames_dir, f))
    os.rmdir(frames_dir)
    print(name, os.path.getsize(out) // 1024, 'KB')


os.makedirs(OUT, exist_ok=True)
for name, start, end, zoom, tint, lit in CLIPS:
    render(name, start, end, zoom, tint, lit)
