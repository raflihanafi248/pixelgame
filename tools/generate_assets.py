#!/usr/bin/env python3
"""Generates every pixel-art asset for The Last Knight.

Everything is drawn on a low-res integer grid and upscaled with
nearest-neighbour (SCALE=2), so pixels stay small and dense while the
art keeps a hand-placed pixel look.

Run this, then tools/embed_assets.py to refresh the base64 bundle the
game actually loads.
"""

import math
import os
import random

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

SCALE = 2
OUTL = (20, 14, 18)  # shared near-black outline colour

def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def save(img, name, factor=SCALE):
    if factor > 1:
        img = img.resize((img.width * factor, img.height * factor), Image.NEAREST)
    img.save(os.path.join(OUT, name))
    print("wrote", name, img.size)

def sheet_of(frames, w, h, name):
    sheet = canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0), f)
    save(sheet, name)

# ==================================================================== THEMES
# Each theme drives one level's sky, background trees/pillars and ground.
THEMES = {
    "night": {
        "sky": ((26, 28, 56), (54, 50, 90)),
        "fog": (86, 92, 140, 150),
        "near": [(12, 12, 28), (24, 24, 50), (40, 38, 74), (58, 56, 100), (84, 80, 132)],
        "far": [(10, 10, 24), (18, 18, 40), (30, 30, 58), (44, 44, 80), (62, 60, 104)],
        "trunk": [(8, 8, 18), (16, 16, 32), (28, 28, 48), (44, 44, 70)],
        "ground": [(104, 112, 158), (72, 78, 118), (52, 56, 90), (34, 34, 58), (26, 26, 46), (18, 18, 34), (10, 10, 20)],
        "style": "tree",
        "accent": (130, 170, 255),
    },
    "cave": {
        "sky": ((24, 18, 32), (44, 32, 54)),
        "fog": (74, 58, 96, 140),
        "near": [(30, 22, 58), (52, 36, 96), (84, 58, 148), (124, 96, 200), (170, 150, 240)],
        "far": [(22, 16, 38), (36, 26, 62), (54, 40, 92), (78, 60, 128), (106, 86, 166)],
        "trunk": [(18, 14, 22), (32, 26, 38), (52, 42, 60), (76, 64, 84)],
        "ground": [(126, 108, 138), (94, 80, 106), (70, 58, 82), (48, 40, 56), (38, 32, 44), (26, 22, 30), (14, 12, 16)],
        "style": "crystal",
        "accent": (160, 130, 255),
    },
    "snow": {
        "sky": ((198, 214, 238), (156, 178, 212)),
        "fog": (236, 242, 252, 200),
        "near": [(92, 114, 146), (126, 148, 178), (172, 192, 216), (212, 226, 240), (247, 251, 255)],
        "far": [(122, 140, 168), (152, 170, 194), (186, 202, 222), (216, 228, 240), (244, 248, 254)],
        "trunk": [(32, 38, 52), (50, 56, 72), (72, 80, 98), (102, 110, 128)],
        "ground": [(250, 252, 255), (226, 234, 246), (188, 202, 222), (96, 106, 126), (74, 84, 102), (50, 58, 74), (28, 32, 44)],
        "style": "tree",
        "accent": (200, 230, 255),
    },
    "lair": {
        "sky": ((34, 12, 38), (68, 22, 56)),
        "fog": (128, 52, 108, 150),
        "near": [(18, 8, 24), (36, 14, 42), (60, 24, 64), (94, 40, 92), (138, 62, 126)],
        "far": [(14, 6, 20), (26, 10, 30), (44, 18, 46), (68, 28, 68), (100, 44, 96)],
        "trunk": [(14, 6, 18), (26, 12, 28), (42, 20, 42), (64, 32, 60)],
        "ground": [(170, 74, 92), (124, 50, 68), (92, 36, 54), (54, 22, 38), (40, 16, 30), (28, 10, 22), (14, 6, 12)],
        "style": "dead",
        "accent": (255, 110, 80),
    },
}

# ==================================================================== SKY
def gen_sky(name, th):
    w, h = 480, 270
    img = canvas(w, h)
    px = img.load()
    top, bot = th["sky"]
    for y in range(h):
        t = y / h
        px_row = tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)) + (255,)
        for x in range(w):
            px[x, y] = px_row
    d = ImageDraw.Draw(img)
    for cx0, cy, rx, ry in [(60, 190, 64, 30), (210, 210, 88, 36), (360, 184, 76, 32), (450, 200, 60, 26)]:
        for cx in (cx0 - w, cx0, cx0 + w):
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=th["fog"])
    # a few distant glints of the theme accent colour
    if name in ("night", "cave", "lair"):
        rnd = random.Random(len(name))
        glint = th["accent"] + (110,)
        for _ in range(26):
            gx, gy = rnd.randint(0, w - 1), rnd.randint(10, 150)
            d.point((gx, gy), fill=glint)
    save(img, f"sky_{name}.png")

# ==================================================================== FOLIAGE HELPERS
def blob_cluster(d, cx, cy, w, h, shades, seed=0):
    shadow, dark, mid, light, hi = shades
    rnd = random.Random(seed)
    d.ellipse([cx - w // 2, cy - h // 2 + 4, cx + w // 2, cy + h // 2 + 4], fill=shadow)
    for i in range(7):
        ang = (i / 7) * math.tau + rnd.uniform(-0.2, 0.2)
        rr = rnd.uniform(0.55, 0.85)
        bx = cx + int((w / 2) * rr * 0.8 * math.cos(ang))
        by = cy + int((h / 2) * rr * 0.8 * math.sin(ang))
        bw, bh = int(w * rnd.uniform(0.34, 0.5)), int(h * rnd.uniform(0.34, 0.5))
        d.ellipse([bx - bw // 2, by - bh // 2, bx + bw // 2, by + bh // 2], fill=dark)
    d.ellipse([cx - w // 2 + w // 8, cy - h // 2, cx + w // 2 - w // 10, cy + h // 3], fill=mid)
    for _ in range(4):
        ang = rnd.uniform(0, math.tau)
        bx = cx + int((w / 3) * math.cos(ang)) - w // 8
        by = cy + int((h / 3) * math.sin(ang)) - h // 4
        bw, bh = int(w * rnd.uniform(0.2, 0.32)), int(h * rnd.uniform(0.2, 0.32))
        d.ellipse([bx - bw // 2, by - bh // 2, bx + bw // 2, by + bh // 2], fill=light)
    hw, hh = int(w * 0.22), int(h * 0.2)
    d.ellipse([cx - w // 5 - hw // 2, cy - h // 3 - hh // 2, cx - w // 5 + hw // 2, cy - h // 3 + hh // 2], fill=hi)

def crystal_cluster(d, cx, cy, w, h, shades, seed=0):
    shadow, dark, mid, light, hi = shades
    rnd = random.Random(seed)
    for i in range(5):
        bw = int(w * rnd.uniform(0.16, 0.28))
        bh = int(h * rnd.uniform(0.5, 1.0))
        bx = cx + int((i - 2) * w * 0.17) + rnd.randint(-4, 4)
        by = cy + h // 2
        d.polygon([(bx, by - bh), (bx + bw, by - bh // 2), (bx + bw // 2, by), (bx - bw // 2, by), (bx - bw, by - bh // 2)], fill=dark)
        d.polygon([(bx, by - bh), (bx + bw // 2, by - bh // 2), (bx, by), (bx - bw // 3, by - bh // 2)], fill=mid)
        d.line([(bx, by - bh), (bx, by - 2)], fill=light, width=max(1, bw // 4))
        d.line([(bx - 1, by - bh + 2), (bx - 1, by - bh // 2)], fill=hi)
    d.ellipse([cx - w // 3, cy + h // 2 - 6, cx + w // 3, cy + h // 2 + 4], fill=shadow)

def dead_branches(d, cx, cy, w, h, shades, seed=0):
    """Bare, twisted branches - no canopy mass, so the lair reads as a dead
    forest rather than a row of mushrooms."""
    shadow, dark, mid, light, hi = shades
    rnd = random.Random(seed)
    for i in range(7):
        ang = -math.pi / 2 + rnd.uniform(-1.25, 1.25)
        ln = rnd.randint(int(h * 0.45), int(h * 0.95))
        ex = cx + int(ln * math.cos(ang))
        ey = cy + int(ln * math.sin(ang))
        d.line([(cx, cy), (ex, ey)], fill=dark, width=4)
        d.line([(cx, cy), (ex, ey)], fill=mid, width=2)
        for _ in range(3):
            a2 = ang + rnd.uniform(-0.9, 0.9)
            l2 = rnd.randint(10, 26)
            tx, ty = ex + int(l2 * math.cos(a2)), ey + int(l2 * math.sin(a2))
            d.line([(ex, ey), (tx, ty)], fill=dark, width=2)
            if rnd.random() < 0.4:
                a3 = a2 + rnd.uniform(-0.7, 0.7)
                l3 = rnd.randint(6, 14)
                d.line([(tx, ty), (tx + int(l3 * math.cos(a3)), ty + int(l3 * math.sin(a3)))], fill=light, width=1)

def draw_trunk(d, x, y_base, height, w_top, w_base, shades):
    shadow, dark, mid, hi = shades
    d.polygon([
        (x - w_base // 2, y_base), (x + w_base // 2, y_base),
        (x + w_top // 2, y_base - height), (x - w_top // 2, y_base - height),
    ], fill=mid)
    d.line([(x - w_base // 2, y_base), (x - w_top // 2, y_base - height)], fill=shadow, width=2)
    d.line([(x + w_base // 2, y_base), (x + w_top // 2, y_base - height)], fill=dark, width=2)
    d.line([(x - w_base // 6, y_base - 2), (x - w_top // 6, y_base - height + 4)], fill=hi, width=1)
    if height > 40:
        bx, by = x + w_top // 2, y_base - height + height // 3
        d.line([(bx, by), (bx + w_top, by - w_top)], fill=mid, width=3)
        d.line([(bx, by), (bx + w_top, by - w_top)], fill=shadow, width=1)

# ==================================================================== BACKGROUND LAYERS
def gen_far(name, th):
    w, h = 640, 240
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    for i, cx0 in enumerate([70, 210, 350, 490, 610]):
        trunk_h = 90 + (i % 3) * 12
        for cx in (cx0 - w, cx0, cx0 + w):
            if th["style"] == "crystal":
                crystal_cluster(d, cx, h - trunk_h - 20, 90, 120, th["far"], seed=i * 13 + 1)
            elif th["style"] == "dead":
                draw_trunk(d, cx, h - 10, trunk_h, 8, 14, th["trunk"])
                dead_branches(d, cx, h - trunk_h - 10, 90, 80, th["far"], seed=i * 13 + 1)
            else:
                draw_trunk(d, cx, h - 10, trunk_h, 10, 16, th["trunk"])
                blob_cluster(d, cx, h - trunk_h - 26, 110, 96, th["far"], seed=i * 13 + 1)
    save(img, f"far_{name}.png")

def gen_near(name, th):
    w, h = 640, 300
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    for i, cx0 in enumerate([70, 210, 350, 490, 610]):
        trunk_h = 150 + (i % 2) * 20
        for cx in (cx0 - w, cx0, cx0 + w):
            if th["style"] == "crystal":
                draw_trunk(d, cx, h - 6, trunk_h, 26, 40, th["trunk"])
                crystal_cluster(d, cx, h - trunk_h - 20, 130, 150, th["near"], seed=i * 17 + 3)
            elif th["style"] == "dead":
                draw_trunk(d, cx, h - 6, trunk_h, 12, 22, th["trunk"])
                dead_branches(d, cx, h - trunk_h - 6, 130, 110, th["near"], seed=i * 17 + 3)
            else:
                draw_trunk(d, cx, h - 6, trunk_h, 14, 22, th["trunk"])
                rnd = random.Random(i * 31 + 5)
                for _ in range(5):
                    bx = cx + rnd.randint(-8, 8)
                    by = h - 6 - rnd.randint(6, trunk_h - 6)
                    d.line([(bx, by), (bx, by + rnd.randint(8, 14))], fill=th["trunk"][0], width=1)
                blob_cluster(d, cx, h - trunk_h - 30, 130, 118, th["near"], seed=i * 17 + 3)
                rnd2 = random.Random(i * 53 + 9)
                for _ in range(3):
                    ang, rr = rnd2.uniform(0, math.tau), rnd2.uniform(0.25, 0.6)
                    lx = cx + int(50 * rr * math.cos(ang))
                    ly = (h - trunk_h - 30) + int(42 * rr * math.sin(ang))
                    lw = rnd2.randint(8, 14)
                    d.ellipse([lx - lw // 2, ly - lw // 3, lx + lw // 2, ly + lw // 3], fill=th["near"][4])
    save(img, f"near_{name}.png")

# ==================================================================== GROUND / PLATFORM
def gen_ground(name, th):
    w, h = 32, 32
    top3, top, top2, mid, mid2, dark, deep = th["ground"]
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, 4], fill=top)
    d.rectangle([0, 0, w - 1, 1], fill=top3)
    rnd = random.Random(hash(name) % 999)
    for x in range(0, w, 3):
        if rnd.random() < 0.5:
            d.point((x, 2), fill=top2)
    d.rectangle([0, 5, w - 1, 19], fill=mid)
    for _ in range(14):
        d.point((rnd.randint(0, w - 1), rnd.randint(6, 18)), fill=rnd.choice([mid2, dark]))
    d.rectangle([0, 20, w - 1, 27], fill=dark)
    d.rectangle([0, 28, w - 1, 31], fill=deep)
    save(img, f"ground_{name}.png")

def gen_ground_deep(name, th):
    """Soil only. The surface tile has a lit top edge, which would read as a
    second ground line if it repeated down through the rows below."""
    w, h = 32, 32
    _, _, _, mid, mid2, dark, deep = th["ground"]
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    rnd = random.Random(hash(name) % 777)
    d.rectangle([0, 0, w - 1, 12], fill=mid)
    d.rectangle([0, 13, w - 1, 23], fill=dark)
    d.rectangle([0, 24, w - 1, 31], fill=deep)
    for _ in range(26):
        d.point((rnd.randint(0, w - 1), rnd.randint(0, 27)), fill=rnd.choice([mid2, dark, deep]))
    save(img, f"ground_{name}_deep.png")

def gen_platform(name, th):
    w, h = 96, 28
    top3, top, top2, mid, mid2, dark, deep = th["ground"]
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=4, fill=mid)
    d.rectangle([0, 0, w - 1, 4], fill=top)
    d.rectangle([0, 0, w - 1, 1], fill=top3)
    d.rectangle([0, 5, w - 1, 7], fill=top2)
    rnd = random.Random(hash(name) % 555)
    for _ in range(18):
        d.point((rnd.randint(2, w - 3), rnd.randint(9, h - 5)), fill=rnd.choice([mid2, dark]))
    d.rectangle([0, h - 5, w - 1, h - 1], fill=dark)
    d.rectangle([0, h - 2, w - 1, h - 1], fill=deep)
    save(img, f"platform_{name}.png")

# ==================================================================== ENEMIES
def gen_goblin():
    w, h = 28, 36
    skin, skin_d, skin_h = (100, 144, 80), (66, 102, 56), (134, 172, 104)
    cloth, cloth_d = (80, 56, 42), (58, 40, 30)
    frames = []
    for step in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        d.ellipse([8, 4, 20, 14], fill=skin)
        d.ellipse([8, 4, 20, 9], fill=skin_h)
        d.polygon([(6, 6), (2, 3), (7, 10)], fill=skin)
        d.polygon([(22, 6), (26, 3), (21, 10)], fill=skin)
        d.ellipse([10, 7, 12, 9], fill=(255, 232, 96))
        d.ellipse([16, 7, 18, 9], fill=(255, 232, 96))
        d.line([(11, 12), (13, 13)], fill=OUTL)
        d.line([(15, 13), (17, 12)], fill=OUTL)
        d.rectangle([6, 14, 22, 26], fill=cloth)
        d.rectangle([6, 14, 22, 16], fill=cloth_d)
        d.rectangle([6, 22, 22, 26], fill=cloth_d)
        off = 2 if step else 0
        d.rectangle([7 + off, 26, 12 + off, 35], fill=skin_d)
        d.rectangle([16 - off, 26, 21 - off, 35], fill=skin_d)
        d.line([(22, 10), (27, 22)], fill=(150, 150, 150), width=2)
        d.line([(22, 10), (27, 22)], fill=(210, 210, 210), width=1)
        frames.append(img)
    sheet_of(frames, w, h, "goblin.png")

def gen_wolf(name, fur, fur_d, fur_h, eye):
    w, h = 44, 26
    frames = []
    for step in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        d.ellipse([6, 8, 36, 20], fill=fur)
        d.ellipse([6, 8, 36, 14], fill=fur_h)
        d.ellipse([6, 14, 36, 20], fill=fur_d)
        d.polygon([(34, 4), (42, 10), (33, 13)], fill=fur)
        d.polygon([(36, 6), (40, 8), (35, 9)], fill=fur_d)
        d.rectangle([37, 8, 39, 9], fill=eye)
        d.line([(38, 9), (43, 12)], fill=fur_d, width=2)
        off = 2 if step else 0
        for lx in (10 + off, 20 - off, 27 + off):
            d.rectangle([lx, 19, lx + 4, 25], fill=fur_d)
        d.rectangle([2, 19, 6, 25], fill=fur_d)
        frames.append(img)
    sheet_of(frames, w, h, f"{name}.png")

def gen_slime():
    w, h = 28, 22
    body, body_d, body_h = (128, 96, 176, 220), (96, 68, 140, 220), (176, 148, 216, 230)
    frames = []
    for squish in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        top = 4 + squish * 3
        d.ellipse([2, top, 25, 21], fill=body_d)
        d.ellipse([3, top + 1, 22, 19], fill=body)
        d.ellipse([5, top + 2, 15, top + 9], fill=body_h)
        d.ellipse([8, 13, 11, 16], fill=(26, 18, 36))
        d.ellipse([16, 13, 19, 16], fill=(26, 18, 36))
        d.ellipse([9, 14, 10, 15], fill=(255, 255, 255, 220))
        d.ellipse([17, 14, 18, 15], fill=(255, 255, 255, 220))
        frames.append(img)
    sheet_of(frames, w, h, "slime.png")

def gen_bat():
    w, h = 32, 24
    body, body_d = (72, 56, 92), (44, 32, 58)
    wing, wing_d = (96, 74, 124), (58, 44, 76)
    frames = []
    for up in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        wy = 6 if up else 15
        d.polygon([(14, 12), (2, wy), (0, wy + 6), (8, 15)], fill=wing)
        d.polygon([(14, 12), (2, wy), (5, wy + 3), (10, 13)], fill=wing_d)
        d.polygon([(18, 12), (30, wy), (32, wy + 6), (24, 15)], fill=wing)
        d.polygon([(18, 12), (30, wy), (27, wy + 3), (22, 13)], fill=wing_d)
        d.ellipse([12, 8, 20, 19], fill=body)
        d.ellipse([12, 8, 20, 13], fill=body_d)
        d.polygon([(13, 8), (12, 3), (16, 7)], fill=body)
        d.polygon([(19, 8), (20, 3), (16, 7)], fill=body)
        d.point((14, 12), fill=(255, 90, 90))
        d.point((18, 12), fill=(255, 90, 90))
        frames.append(img)
    sheet_of(frames, w, h, "bat.png")

def gen_wraith():
    w, h = 30, 40
    robe, robe_d, robe_h = (58, 30, 78), (36, 18, 52), (92, 54, 120)
    frames = []
    for phase in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        drift = 1 if phase else 0
        d.polygon([(15, 2 + drift), (26, 18), (24, 34), (15, 39), (6, 34), (4, 18)], fill=robe)
        d.polygon([(15, 2 + drift), (26, 18), (22, 30), (15, 33)], fill=robe_d)
        d.polygon([(10, 8 + drift), (15, 4 + drift), (18, 10)], fill=robe_h)
        d.ellipse([9, 10 + drift, 21, 22 + drift], fill=(14, 8, 20))
        d.ellipse([11, 14 + drift, 14, 17 + drift], fill=(255, 120, 90))
        d.ellipse([16, 14 + drift, 19, 17 + drift], fill=(255, 120, 90))
        for tx in (7, 15, 23):
            d.line([(tx, 32), (tx + (2 if phase else -2), 39)], fill=robe_d, width=2)
        frames.append(img)
    sheet_of(frames, w, h, "wraith.png")

# ==================================================================== BOSS: FOREST DRAGON
D_W, D_H = 128, 96

# Red dragon palette
DS_SHADOW = (58, 10, 16)
DS_DARK = (96, 20, 26)
DS_MID = (154, 38, 38)
DS_LIGHT = (198, 64, 52)
DS_HI = (236, 116, 86)
D_BELLY = (226, 180, 122)
D_BELLY_SH = (194, 144, 94)
D_MEMB = (150, 46, 50)
D_MEMB_LIGHT = (198, 92, 82)
D_BONE = (238, 226, 198)
D_EYE = (255, 208, 70)
D_FIRE = [(255, 244, 200), (255, 206, 96), (255, 150, 48), (226, 86, 30)]

def _rot(px, py, ox, oy, ang):
    c, s_ = math.cos(ang), math.sin(ang)
    dx, dy = px - ox, py - oy
    return (ox + dx * c - dy * s_, oy + dx * s_ + dy * c)

def _bez(p0, p1, p2, steps=10):
    """Quadratic curve, used as the spine for necks and tails."""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out

def _limb(d, pts, r0, r1, fill, hi=None):
    """A tapering chain of circles - reads as a neck, a tail or a leg."""
    n = len(pts) - 1
    for i, (x, y) in enumerate(pts):
        t = i / max(1, n)
        r = r0 + (r1 - r0) * t
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill)
        if hi and r > 2:
            d.ellipse([x - r * 0.55, y - r * 0.9, x + r * 0.15, y - r * 0.25], fill=hi)

def _wing(d, sx, sy, ang, span, front):
    """Membrane wing: four finger bones from the shoulder with a scalloped
    membrane stretched between them. `ang` sweeps the whole hand through the
    flap, so one parameter drives the entire cycle."""
    memb = D_MEMB_LIGHT if front else D_MEMB
    bone = DS_LIGHT if front else DS_DARK
    fingers = [(-0.95, 1.00), (-0.42, 1.05), (0.08, 0.94), (0.55, 0.70)]
    tips = [(sx + math.cos(ang + fa) * span * fl,
             sy + math.sin(ang + fa) * span * fl) for fa, fl in fingers]

    poly = [(sx, sy)]
    for i, tip in enumerate(tips):
        poly.append(tip)
        if i < len(tips) - 1:
            nxt = tips[i + 1]
            mx, my = (tip[0] + nxt[0]) / 2, (tip[1] + nxt[1]) / 2
            poly.append((mx + (sx - mx) * 0.22, my + (sy - my) * 0.22))  # scallop
    poly.append((sx + math.cos(ang + 0.9) * span * 0.3,
                 sy + math.sin(ang + 0.9) * span * 0.3))
    d.polygon(poly, fill=memb)

    # a lighter panel near the leading edge gives the membrane some depth
    d.polygon([(sx, sy), tips[0], tips[1],
               (sx + math.cos(ang - 0.4) * span * 0.35,
                sy + math.sin(ang - 0.4) * span * 0.35)],
              fill=D_MEMB_LIGHT if front else (168, 62, 62))

    for tip in tips:
        d.line([(sx, sy), tip], fill=bone, width=2)
        d.ellipse([tip[0] - 1.5, tip[1] - 1.5, tip[0] + 1.5, tip[1] + 1.5], fill=D_BONE)
    d.ellipse([sx - 5, sy - 5, sx + 5, sy + 5], fill=DS_MID if front else DS_DARK)

def dragon_frame(wing=0.0, neck=0.0, jaw=0.0, tail=0.0, bob=0.0, legs=0.0,
                 lean=0.0, breath=0.0, hurt=False, collapse=0.0):
    """One pose. Every limb is driven by a parameter so the animation frames
    are interpolated poses rather than hand-shifted copies."""
    img = canvas(D_W, D_H)
    d = ImageDraw.Draw(img)

    body_x, body_y = 54, 56 + bob + collapse * 26
    wing_ang = -2.0 + wing * 1.75          # -2.0 rad = raised, ~-0.25 = swept down
    lean_y = lean * 10

    # ---- far wing (behind the body, darker)
    _wing(d, body_x + 2, body_y - 12 + lean_y, wing_ang + 0.22, 40 - collapse * 14, front=False)

    # ---- tail: a long curve that lags behind the body
    tail_end = (4 + tail * 4, 34 + tail * 20 + collapse * 20)
    tail_pts = _bez((body_x - 14, body_y + 4), (30, body_y + 10 + tail * 10), tail_end, 12)
    _limb(d, tail_pts, 9, 1.5, DS_MID, DS_LIGHT)
    d.polygon([tail_end,
               (tail_end[0] - 9, tail_end[1] - 9),
               (tail_end[0] + 3, tail_end[1] - 3)], fill=D_MEMB)

    # ---- body
    d.ellipse([body_x - 25, body_y - 17 + lean_y, body_x + 25, body_y + 19 + lean_y], fill=DS_MID)
    d.ellipse([body_x - 25, body_y - 17 + lean_y, body_x + 22, body_y + 2 + lean_y], fill=DS_LIGHT)
    d.ellipse([body_x - 18, body_y + 1 + lean_y, body_x + 20, body_y + 19 + lean_y], fill=D_BELLY)
    for i in range(5):  # belly scutes
        sx0 = body_x - 15 + i * 8
        d.line([(sx0, body_y + 4 + lean_y), (sx0, body_y + 17 + lean_y)], fill=D_BELLY_SH)

    # ---- hind legs
    tuck = legs
    for i, (lx, spread) in enumerate([(body_x - 8, -1), (body_x + 12, 1)]):
        hip = (lx, body_y + 12 + lean_y)
        knee = (lx + spread * 6 - tuck * spread * 4, body_y + 22 + lean_y - tuck * 12)
        foot = (lx + spread * 4, body_y + 36 + lean_y - tuck * 22 + collapse * 6)
        _limb(d, _bez(hip, knee, foot, 6), 6, 3.5,
              DS_DARK if i == 0 else DS_MID)
        if tuck < 0.5:  # claws only read when the leg is extended
            for c in range(3):
                cx = foot[0] - 4 + c * 4
                d.line([(cx, foot[1]), (cx - 1, foot[1] + 4)], fill=D_BONE, width=1)

    # ---- neck and head
    head_x = 100 + neck * 6
    head_y = 26 - neck * 12 + lean_y + collapse * 30
    neck_pts = _bez((body_x + 16, body_y - 8 + lean_y),
                    (body_x + 34, body_y - 26 - neck * 8 + lean_y),
                    (head_x - 8, head_y + 4), 10)
    _limb(d, neck_pts, 10, 6, DS_MID, DS_LIGHT)

    d.ellipse([head_x - 11, head_y - 8, head_x + 11, head_y + 8], fill=DS_MID)
    d.ellipse([head_x - 11, head_y - 8, head_x + 7, head_y + 1], fill=DS_LIGHT)
    d.polygon([(head_x + 4, head_y - 4), (head_x + 20, head_y + 1),
               (head_x + 4, head_y + 5)], fill=DS_MID)  # snout
    d.polygon([(head_x + 4, head_y - 3), (head_x + 19, head_y + 1),
               (head_x + 6, head_y + 0)], fill=DS_LIGHT)

    # horns sweeping back
    for hy, hl in [(-6, 15), (-2, 11)]:
        d.polygon([(head_x - 4, head_y + hy), (head_x - 4 - hl, head_y + hy - hl * 0.55),
                   (head_x - 1, head_y + hy + 3)], fill=D_BONE)
    d.polygon([(head_x - 8, head_y + 4), (head_x - 17, head_y + 9),
               (head_x - 7, head_y + 8)], fill=D_MEMB)  # jaw frill

    # jaw
    jo = jaw * 11
    d.polygon([(head_x + 3, head_y + 3), (head_x + 19, head_y + 2 + jo * 0.5),
               (head_x + 4, head_y + 6 + jo)], fill=DS_DARK)
    if jaw > 0.12:
        d.polygon([(head_x + 4, head_y + 4), (head_x + 17, head_y + 3 + jo * 0.5),
                   (head_x + 5, head_y + 5 + jo)], fill=(72, 16, 20))
        for tx in range(6, 16, 4):  # teeth
            d.line([(head_x + tx, head_y + 4), (head_x + tx, head_y + 7)], fill=D_BONE)

    eye_h = 4 if not hurt else 2
    d.ellipse([head_x + 1, head_y - 4, head_x + 6, head_y - 4 + eye_h], fill=D_EYE)
    d.line([(head_x + 3, head_y - 4), (head_x + 3, head_y - 4 + eye_h)], fill=(30, 10, 10))
    d.ellipse([head_x + 13, head_y - 1, head_x + 15, head_y + 1], fill=DS_SHADOW)  # nostril

    # ---- spine ridge from head to tail
    ridge = neck_pts[2:] + [(body_x + 8, body_y - 16 + lean_y),
                            (body_x - 4, body_y - 17 + lean_y),
                            (body_x - 16, body_y - 12 + lean_y)]
    for i, (rx, ry) in enumerate(ridge[::2]):
        h = 5 + (i % 3)
        d.polygon([(rx - 3, ry), (rx, ry - h), (rx + 3, ry)], fill=D_BONE)

    # ---- near wing (in front, catches the light)
    _wing(d, body_x + 6, body_y - 14 + lean_y, wing_ang, 46 - collapse * 16, front=True)

    # ---- fire breath
    if breath > 0:
        mx, my = head_x + 18, head_y + 4 + jo * 0.6
        for i in range(int(6 * breath) + 1):
            t = i / 6
            rx = 5 + t * 16 * breath
            ry = 3 + t * 11 * breath
            cx = mx + t * 34 * breath
            col = D_FIRE[min(3, int(t * 3.2))]
            d.ellipse([cx - rx, my - ry + t * 3, cx + rx, my + ry + t * 3], fill=col)

    if hurt:
        overlay = Image.new("RGBA", (D_W, D_H), (255, 90, 80, 120))
        img = Image.alpha_composite(
            img, Image.composite(overlay, Image.new("RGBA", (D_W, D_H), (0, 0, 0, 0)), img.split()[3]))
    return img

def gen_dragon():
    frames = []

    # fly: a full flap cycle - the body rises as the wings come down
    for i in range(6):
        ph = i / 6
        w = math.sin(ph * math.tau)
        frames.append(dragon_frame(
            wing=w, bob=-w * 5, neck=0.12 * math.sin(ph * math.tau + 1.0),
            tail=0.5 * math.sin(ph * math.tau - 0.8), legs=0.65, jaw=0.05))

    # roar: rear back, chest up, jaw opens, fire
    roar = [
        dict(wing=-0.85, neck=-0.3, jaw=0.05, tail=-0.4, bob=2, legs=0.5),
        dict(wing=-0.2, neck=0.5, jaw=0.15, tail=-0.1, bob=-2, legs=0.6),
        dict(wing=0.6, neck=0.9, jaw=0.55, tail=0.3, bob=-5, legs=0.7),
        dict(wing=0.9, neck=0.8, jaw=1.0, tail=0.5, bob=-4, legs=0.7, breath=0.55),
        dict(wing=0.7, neck=0.6, jaw=1.0, tail=0.4, bob=-2, legs=0.65, breath=1.0),
        dict(wing=0.1, neck=0.25, jaw=0.5, tail=0.1, bob=0, legs=0.6, breath=0.35),
    ]
    frames += [dragon_frame(**p) for p in roar]

    # swoop: wings swept back, body pitched forward, legs tucked
    swoop = [
        dict(wing=-0.6, neck=0.4, jaw=0.3, tail=-0.5, legs=0.9, lean=-0.4, bob=-3),
        dict(wing=0.25, neck=0.15, jaw=0.5, tail=-0.2, legs=1.0, lean=-0.2, bob=0),
        dict(wing=0.95, neck=-0.1, jaw=0.6, tail=0.2, legs=1.0, lean=0.2, bob=3),
        dict(wing=0.4, neck=0.1, jaw=0.4, tail=0.5, legs=0.95, lean=0.0, bob=1),
    ]
    frames += [dragon_frame(**p) for p in swoop]

    # hurt
    frames.append(dragon_frame(wing=-0.5, neck=-0.55, jaw=0.7, tail=-0.6, bob=3, legs=0.5, hurt=True))
    frames.append(dragon_frame(wing=-0.2, neck=-0.3, jaw=0.4, tail=0.3, bob=1, legs=0.55, hurt=True))

    # death: wings fold, head drops, body sinks
    for i in range(4):
        t = (i + 1) / 4
        frames.append(dragon_frame(
            wing=-0.9 + t * 0.5, neck=-0.4 - t * 0.6, jaw=0.6 - t * 0.5,
            tail=0.3 * (1 - t), bob=t * 6, legs=0.2, collapse=t))

    # rest: grounded, wings folded, breathing
    frames.append(dragon_frame(wing=0.95, neck=-0.15, jaw=0.08, tail=0.15, bob=0, legs=0.05))
    frames.append(dragon_frame(wing=0.95, neck=-0.1, jaw=0.14, tail=0.25, bob=-2, legs=0.05))

    cols = 6
    rows = (len(frames) + cols - 1) // cols
    sheet = canvas(cols * D_W, rows * D_H)
    for i, f in enumerate(frames):
        sheet.paste(f, ((i % cols) * D_W, (i // cols) * D_H), f)
    save(sheet, "dragon.png")
    print(f"  dragon: {len(frames)} frames, {cols}x{rows} grid, frame {D_W*SCALE}x{D_H*SCALE}")
    print("  fly 0-5, roar 6-11, swoop 12-15, hurt 16-17, death 18-21, rest 22-23")

def gen_fireball():
    w, h = 20, 16
    frames = []
    for phase in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        wob = phase * 2
        d.ellipse([0, 4 + wob // 2, 12, 12 - wob // 2], fill=(255, 120, 40, 170))
        d.ellipse([4, 3, 17, 13], fill=(255, 150, 50))
        d.ellipse([7, 5, 16, 11], fill=(255, 208, 90))
        d.ellipse([10, 6, 15, 10], fill=(255, 250, 210))
        frames.append(img)
    sheet_of(frames, w, h, "fireball.png")

# ==================================================================== ITEMS / UI / PROPS
def gen_crystal():
    w, h = 18, 18
    frames = []
    widths = [7, 4, 2, 4]
    for i, ww in enumerate(widths):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        cx, cy = 9, 9
        d.polygon([(cx, 1), (cx + ww, cy - 2), (cx, 17), (cx - ww, cy - 2)], fill=(70, 190, 220))
        d.polygon([(cx, 1), (cx + ww, cy - 2), (cx, 17)], fill=(40, 150, 195))
        d.polygon([(cx, 3), (cx - ww + 1, cy - 2), (cx, 9)], fill=(180, 240, 255))
        d.point((cx - 1, 6), fill=(255, 255, 255))
        frames.append(img)
    sheet_of(frames, w, h, "crystal.png")

def gen_heart():
    w, h = 16, 14
    frames = []
    for full in (True, False):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        body = (222, 54, 66) if full else (58, 44, 50)
        hi = (255, 132, 128) if full else (80, 64, 70)
        d.ellipse([1, 1, 8, 8], fill=body)
        d.ellipse([7, 1, 14, 8], fill=body)
        d.polygon([(1, 6), (14, 6), (8, 13)], fill=body)
        d.ellipse([3, 3, 5, 5], fill=hi)
        d.polygon([(1, 1), (14, 1), (14, 6), (8, 13), (1, 6)], outline=(28, 16, 20))
        frames.append(img)
    sheet_of(frames, w, h, "heart.png")

def gen_checkpoint():
    w, h = 26, 44
    frames = []
    for lit in (False, True):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        d.rectangle([6, 36, 20, 43], fill=(52, 48, 50))
        d.rectangle([6, 36, 20, 37], fill=(76, 70, 72))
        d.rectangle([10, 14, 16, 37], fill=(44, 40, 42))
        d.rectangle([10, 14, 11, 37], fill=(28, 26, 28))
        d.rectangle([7, 10, 19, 15], fill=(34, 31, 32))
        glass = (255, 186, 80) if lit else (66, 70, 82)
        core = (255, 240, 180) if lit else (86, 90, 104)
        d.rectangle([9, 4, 17, 13], fill=glass)
        d.rectangle([11, 6, 15, 11], fill=core)
        d.rectangle([8, 3, 18, 4], fill=(24, 20, 19))
        d.rectangle([8, 13, 18, 14], fill=(24, 20, 19))
        for fx in (9, 13, 17):
            d.line([(fx, 4), (fx, 13)], fill=(24, 20, 19))
        d.polygon([(8, 3), (18, 3), (13, 0)], fill=(24, 20, 19))
        frames.append(img)
    sheet_of(frames, w, h, "checkpoint.png")

def gen_spike():
    w, h = 32, 16
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 12, w - 1, 15], fill=(54, 48, 56))
    for sx in range(0, w, 8):
        d.polygon([(sx, 14), (sx + 4, 0), (sx + 8, 14)], fill=(178, 186, 200))
        d.polygon([(sx + 4, 0), (sx + 8, 14), (sx + 5, 14)], fill=(112, 120, 136))
        d.line([(sx + 3, 12), (sx + 4, 3)], fill=(246, 250, 255))
    save(img, "spike.png")

def gen_gate():
    w, h = 48, 92
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    stone_s, stone_m, stone_h = (20, 18, 19), (52, 48, 50), (74, 69, 70)
    for side in (0, 1):
        x = 3 if side == 0 else w - 11
        d.rectangle([x, 8, x + 7, h - 4], fill=stone_m)
        d.rectangle([x, 8, x + 1, h - 4], fill=stone_s)
        d.rectangle([x + 6, 8, x + 7, h - 4], fill=stone_h)
        for y in range(12, h - 6, 10):
            d.rectangle([x, y, x + 7, y + 1], fill=stone_s)
    d.rectangle([2, 2, w - 3, 12], fill=stone_m)
    d.rectangle([2, 2, w - 3, 4], fill=stone_h)
    d.ellipse([10, 16, w - 11, h - 16], fill=(255, 140, 50))
    d.ellipse([14, 22, w - 15, h - 24], fill=(255, 179, 71))
    d.ellipse([18, 28, w - 19, h - 32], fill=(255, 230, 150))
    d.ellipse([21, 32, w - 22, h - 38], fill=(255, 255, 235))
    save(img, "gate.png")

def gen_fence():
    w, h = 64, 40
    sh, dk, md, hi, gr = (30, 24, 22), (48, 39, 34), (72, 59, 50), (100, 84, 68), (58, 47, 40)
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    for px in (4, 56):
        d.rectangle([px, 8, px + 7, h - 1], fill=md)
        d.rectangle([px, 8, px, h - 1], fill=sh)
        d.rectangle([px + 6, 8, px + 7, h - 1], fill=dk)
        d.rectangle([px + 1, 6, px + 6, 9], fill=dk)
        for y in range(12, h - 2, 6):
            d.line([(px + 2, y), (px + 5, y)], fill=gr)
    for rail_y in (12, 26):
        d.rectangle([0, rail_y, w - 1, rail_y + 7], fill=md)
        d.rectangle([0, rail_y, w - 1, rail_y], fill=hi)
        d.rectangle([0, rail_y + 6, w - 1, rail_y + 7], fill=sh)
        for x in range(6, w, 10):
            d.line([(x, rail_y + 2), (x + 4, rail_y + 2)], fill=gr)
    save(img, "fence.png")

def gen_lantern():
    w, h = 28, 68
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    sd, sm, sh_ = (34, 31, 32), (52, 48, 50), (74, 69, 70)
    frame, glow, glow2, core = (24, 20, 19), (255, 179, 71), (255, 140, 50), (255, 230, 150)
    d.rectangle([11, 20, 16, h - 1], fill=sm)
    d.rectangle([11, 20, 12, h - 1], fill=sd)
    d.rectangle([15, 20, 16, h - 1], fill=sh_)
    d.rectangle([8, 14, 19, 21], fill=sd)
    d.rectangle([8, 14, 19, 15], fill=sh_)
    d.line([(14, 14), (5, 8)], fill=frame, width=2)
    d.rectangle([1, 4, 8, 9], fill=frame)
    d.ellipse([0, 12, 10, 34], fill=glow2)
    d.rectangle([1, 15, 9, 31], fill=glow)
    d.rectangle([2, 18, 8, 27], fill=core)
    d.rectangle([3, 20, 6, 24], fill=(255, 255, 220))
    for fx in (0, 5, 9):
        d.line([(fx, 12), (fx, 34)], fill=frame)
    d.rectangle([0, 12, 9, 13], fill=frame)
    d.rectangle([0, 33, 9, 34], fill=frame)
    save(img, "lantern.png")

def gen_armor():
    """HUD pip for the armour the player earns from kills: a plated shield,
    lit when the charge is intact and dark once it is spent."""
    w, h = 15, 16
    frames = []
    for full in (True, False):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        rim = (188, 198, 214) if full else (62, 60, 66)
        face = (108, 148, 196) if full else (46, 46, 54)
        hi = (186, 222, 255) if full else (70, 70, 78)
        body = [(1, 1), (13, 1), (13, 8), (7, 15), (1, 8)]
        d.polygon(body, fill=rim)
        d.polygon([(3, 3), (11, 3), (11, 8), (7, 12), (3, 8)], fill=face)
        d.polygon([(3, 3), (7, 3), (7, 12), (3, 8)], fill=hi if full else face)
        d.line([(7, 3), (7, 12)], fill=rim)
        d.polygon(body, outline=(24, 22, 28))
        frames.append(img)
    sheet_of(frames, w, h, "armor.png")

def gen_shield_bubble():
    """The barrier drawn around the player while the armour holds: a soft
    dome with two crisp rims and a highlight, so it reads as a shell at pixel
    size instead of a scribble."""
    w, h = 62, 78
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    cx, cy = w // 2, h // 2
    rx, ry = 28, 36

    # faint interior so the shell encloses a volume
    for i in range(5):
        t = i / 4
        d.ellipse([cx - rx * (1 - t * 0.5), cy - ry * (1 - t * 0.5),
                   cx + rx * (1 - t * 0.5), cy + ry * (1 - t * 0.5)],
                  fill=(120, 190, 255, int(10 + t * 12)))
    # two rims
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(150, 212, 255, 120), width=2)
    d.ellipse([cx - rx + 4, cy - ry + 5, cx + rx - 4, cy + ry - 5],
              outline=(198, 234, 255, 70), width=1)
    # specular highlight on the upper left, like light catching glass
    d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 200, 265,
          fill=(240, 252, 255, 190), width=3)
    d.arc([cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1], 20, 55,
          fill=(210, 240, 255, 110), width=2)
    # a few panel nodes rather than radiating scratches
    for a in (15, 75, 135, 195, 255, 315):
        r = math.radians(a)
        nx, ny = cx + math.cos(r) * rx, cy + math.sin(r) * ry
        d.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=(226, 246, 255, 150))
    save(img, "shield.png")

# ==================================================================== NPCs
# Every NPC is drawn from one parameterised figure, so a new character is a
# palette plus a prop rather than a new drawing routine. Each also gets a
# portrait for the dialogue box - that is what sells a story-mode conversation.
N_W, N_H = 32, 40
P_W, P_H = 48, 48

NPCS = {
    "maren": {   # the old warden who sends you out
        "skin": (228, 188, 152), "skin_sh": (196, 152, 118),
        "hair": (222, 222, 228), "hair_sh": (176, 176, 186),
        "cloth": (58, 92, 70), "cloth_hi": (82, 122, 92), "cloth_sh": (38, 62, 48),
        "trim": (206, 168, 74), "prop": "staff", "hood": False,
    },
    "bram": {    # woodcutter, chapter 1
        "skin": (220, 172, 132), "skin_sh": (188, 140, 102),
        "hair": (96, 60, 34), "hair_sh": (68, 42, 24),
        "cloth": (122, 82, 48), "cloth_hi": (152, 108, 66), "cloth_sh": (86, 56, 32),
        "trim": (168, 150, 120), "prop": "axe", "hood": False,
    },
    "gethin": {  # archivist in the crystal cave
        "skin": (202, 164, 128), "skin_sh": (168, 132, 100),
        "hair": (140, 136, 150), "hair_sh": (104, 100, 116),
        "cloth": (74, 66, 102), "cloth_hi": (100, 92, 136), "cloth_sh": (50, 44, 72),
        "trim": (190, 176, 220), "prop": "scroll", "hood": True,
    },
    "merchant": {  # runs the roadside market
        "skin": (214, 168, 126), "skin_sh": (180, 136, 98),
        "hair": (72, 54, 38), "hair_sh": (48, 36, 26),
        "cloth": (128, 64, 52), "cloth_hi": (162, 92, 72), "cloth_sh": (92, 44, 36),
        "trim": (230, 190, 92), "prop": "pack", "hood": False,
    },
    "yvane": {   # a warden freezing on the peak
        "skin": (218, 192, 172), "skin_sh": (184, 156, 138),
        "hair": (236, 232, 222), "hair_sh": (196, 192, 186),
        "cloth": (146, 178, 206), "cloth_hi": (186, 212, 234), "cloth_sh": (104, 132, 160),
        "trim": (232, 244, 255), "prop": "none", "hood": True,
    },
}

def npc_frame(pal, bob=0, arm=0):
    img = canvas(N_W, N_H)
    d = ImageDraw.Draw(img)
    cx = N_W // 2
    y = bob

    # cloak / robe
    d.polygon([(cx - 8, 16 + y), (cx + 8, 16 + y), (cx + 10, 38), (cx - 10, 38)], fill=pal["cloth"])
    d.polygon([(cx - 8, 16 + y), (cx - 2, 16 + y), (cx - 3, 38), (cx - 10, 38)], fill=pal["cloth_hi"])
    d.polygon([(cx + 3, 16 + y), (cx + 8, 16 + y), (cx + 10, 38), (cx + 4, 38)], fill=pal["cloth_sh"])
    d.line([(cx - 9, 37), (cx + 9, 37)], fill=pal["trim"])

    if pal["hood"]:
        d.ellipse([cx - 9, 2 + y, cx + 9, 20 + y], fill=pal["cloth"])
        d.ellipse([cx - 9, 2 + y, cx + 2, 14 + y], fill=pal["cloth_hi"])
        d.ellipse([cx - 6, 8 + y, cx + 6, 19 + y], fill=(26, 22, 30))
        d.rectangle([cx - 4, 11 + y, cx + 4, 17 + y], fill=pal["skin_sh"])
        d.point((cx - 2, 13 + y), fill=(20, 16, 20))
        d.point((cx + 2, 13 + y), fill=(20, 16, 20))
    else:
        d.ellipse([cx - 7, 3 + y, cx + 7, 17 + y], fill=pal["skin"])
        d.ellipse([cx - 7, 3 + y, cx + 7, 11 + y], fill=pal["hair"])
        d.polygon([(cx - 7, 8 + y), (cx - 9, 18 + y), (cx - 5, 16 + y)], fill=pal["hair_sh"])
        d.polygon([(cx + 7, 8 + y), (cx + 9, 18 + y), (cx + 5, 16 + y)], fill=pal["hair_sh"])
        d.rectangle([cx - 5, 12 + y, cx + 5, 17 + y], fill=pal["skin"])
        d.rectangle([cx - 5, 16 + y, cx + 5, 17 + y], fill=pal["skin_sh"])
        d.point((cx - 3, 13 + y), fill=(30, 22, 22))
        d.point((cx + 3, 13 + y), fill=(30, 22, 22))

    # hands and prop
    d.rectangle([cx - 11, 22 + y + arm, cx - 8, 27 + y + arm], fill=pal["skin_sh"])
    d.rectangle([cx + 8, 22 + y - arm, cx + 11, 27 + y - arm], fill=pal["skin_sh"])
    if pal["prop"] == "staff":
        d.line([(cx + 10, 6 + y), (cx + 10, 38)], fill=(96, 68, 42), width=2)
        d.ellipse([cx + 6, 2 + y, cx + 14, 10 + y], fill=(255, 196, 96))
        d.ellipse([cx + 8, 4 + y, cx + 12, 8 + y], fill=(255, 240, 190))
    elif pal["prop"] == "axe":
        d.line([(cx + 10, 10 + y), (cx + 10, 36)], fill=(104, 72, 44), width=2)
        d.polygon([(cx + 10, 10 + y), (cx + 18, 12 + y), (cx + 10, 20 + y)], fill=(178, 182, 190))
        d.polygon([(cx + 10, 11 + y), (cx + 15, 13 + y), (cx + 10, 17 + y)], fill=(214, 220, 228))
    elif pal["prop"] == "pack":
        d.rectangle([cx - 17, 20 + y, cx - 7, 32 + y], fill=(112, 78, 46))
        d.rectangle([cx - 17, 20 + y, cx - 7, 22 + y], fill=(146, 106, 66))
        d.line([(cx - 17, 26 + y), (cx - 7, 26 + y)], fill=(70, 48, 28))
        d.rectangle([cx - 14, 16 + y, cx - 10, 20 + y], fill=(70, 48, 28))
        d.ellipse([cx - 16, 12 + y, cx - 11, 17 + y], fill=(90, 210, 230))   # wares on top
        d.ellipse([cx - 12, 14 + y, cx - 8, 18 + y], fill=(240, 190, 80))
    elif pal["prop"] == "scroll":
        d.rectangle([cx - 15, 22 + y, cx - 7, 28 + y], fill=(226, 212, 176))
        d.rectangle([cx - 15, 22 + y, cx - 7, 23 + y], fill=(188, 170, 134))
        for ly in range(24, 28, 2):
            d.line([(cx - 14, ly + y), (cx - 8, ly + y)], fill=(140, 122, 96))
    return img

def npc_portrait(pal, name):
    """A head-and-shoulders bust on a framed background."""
    img = canvas(P_W, P_H)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, P_W - 1, P_H - 1], fill=(34, 28, 38))
    d.rectangle([2, 2, P_W - 3, P_H - 3], fill=pal["cloth_sh"])
    cx, cy = P_W // 2, P_H // 2 + 4

    # shoulders
    d.ellipse([cx - 20, cy + 10, cx + 20, cy + 32], fill=pal["cloth"])
    d.ellipse([cx - 20, cy + 10, cx - 2, cy + 24], fill=pal["cloth_hi"])
    d.line([(cx - 16, cy + 14), (cx + 16, cy + 14)], fill=pal["trim"])

    if pal["hood"]:
        d.ellipse([cx - 17, cy - 22, cx + 17, cy + 16], fill=pal["cloth"])
        d.ellipse([cx - 17, cy - 22, cx + 2, cy + 2], fill=pal["cloth_hi"])
        d.ellipse([cx - 12, cy - 14, cx + 12, cy + 14], fill=(24, 20, 28))
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 11], fill=pal["skin_sh"])
    else:
        d.ellipse([cx - 14, cy - 20, cx + 14, cy + 12], fill=pal["skin"])
        d.ellipse([cx - 15, cy - 22, cx + 15, cy - 4], fill=pal["hair"])
        d.polygon([(cx - 15, cy - 12), (cx - 18, cy + 8), (cx - 10, cy + 4)], fill=pal["hair_sh"])
        d.polygon([(cx + 15, cy - 12), (cx + 18, cy + 8), (cx + 10, cy + 4)], fill=pal["hair_sh"])
        d.ellipse([cx - 14, cy - 2, cx + 14, cy + 12], fill=pal["skin"])
        d.ellipse([cx - 14, cy + 4, cx + 14, cy + 12], fill=pal["skin_sh"])

    # face
    for ex in (-6, 6):
        d.ellipse([cx + ex - 3, cy - 5, cx + ex + 3, cy + 1], fill=(240, 238, 232))
        d.ellipse([cx + ex - 1, cy - 4, cx + ex + 2, cy], fill=(38, 30, 34))
    d.line([(cx - 9, cy - 9), (cx - 3, cy - 10)], fill=pal["hair_sh"], width=2)
    d.line([(cx + 3, cy - 10), (cx + 9, cy - 9)], fill=pal["hair_sh"], width=2)
    d.line([(cx - 1, cy - 2), (cx - 1, cy + 3)], fill=pal["skin_sh"])
    d.line([(cx - 4, cy + 6), (cx + 4, cy + 6)], fill=(150, 104, 96))
    save(img, f"portrait_{name}.png")

def gen_knight_portrait():
    """The knight's own bust, matching the sprite: dark plate and a horned helm."""
    img = canvas(P_W, P_H)
    d = ImageDraw.Draw(img)
    steel, steel_hi, steel_sh = (118, 124, 136), (168, 176, 188), (72, 76, 88)
    tunic = (126, 58, 40)
    d.rectangle([0, 0, P_W - 1, P_H - 1], fill=(34, 28, 38))
    d.rectangle([2, 2, P_W - 3, P_H - 3], fill=(58, 48, 54))
    cx, cy = P_W // 2, P_H // 2 + 4

    d.ellipse([cx - 21, cy + 10, cx + 21, cy + 32], fill=steel_sh)
    d.ellipse([cx - 21, cy + 10, cx - 2, cy + 24], fill=steel)
    d.rectangle([cx - 6, cy + 12, cx + 6, cy + 30], fill=tunic)

    d.ellipse([cx - 14, cy - 20, cx + 14, cy + 12], fill=steel)
    d.ellipse([cx - 14, cy - 20, cx + 2, cy - 2], fill=steel_hi)
    d.polygon([(cx - 12, cy - 14), (cx - 22, cy - 24), (cx - 8, cy - 18)], fill=steel_hi)  # horns
    d.polygon([(cx + 12, cy - 14), (cx + 22, cy - 24), (cx + 8, cy - 18)], fill=steel_hi)
    d.rectangle([cx - 11, cy - 6, cx + 11, cy + 1], fill=(18, 16, 20))                     # visor slit
    d.ellipse([cx - 8, cy - 5, cx - 3, cy], fill=(255, 214, 120))
    d.ellipse([cx + 3, cy - 5, cx + 8, cy], fill=(255, 214, 120))
    for vx in range(cx - 8, cx + 9, 5):                                                    # breaths
        d.line([(vx, cy + 3), (vx, cy + 9)], fill=steel_sh)
    save(img, "portrait_knight.png")

def gen_wisp():
    """The chapter 2 spirit: no body, just a drifting light with two eyes."""
    frames = []
    for i in range(4):
        img = canvas(N_W, N_H)
        d = ImageDraw.Draw(img)
        cx, cy = N_W // 2, 20 + int(math.sin(i / 4 * math.tau) * 3)
        for r, col in [(13, (120, 190, 255, 40)), (10, (150, 210, 255, 80)),
                       (7, (198, 232, 255, 150)), (4, (240, 252, 255, 230))]:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        d.ellipse([cx - 3, cy - 2, cx - 1, cy + 1], fill=(40, 70, 110))
        d.ellipse([cx + 1, cy - 2, cx + 3, cy + 1], fill=(40, 70, 110))
        for t in range(3):                                   # trailing motes
            ty = cy + 12 + t * 5 + (i % 2)
            d.point((cx + (t - 1) * 3, ty), fill=(198, 232, 255, 180))
        frames.append(img)
    sheet_of(frames, N_W, N_H, "npc_wisp.png")

    img = canvas(P_W, P_H)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, P_W - 1, P_H - 1], fill=(34, 28, 38))
    d.rectangle([2, 2, P_W - 3, P_H - 3], fill=(30, 46, 72))
    cx, cy = P_W // 2, P_H // 2
    for r, col in [(20, (110, 170, 240, 60)), (15, (150, 210, 255, 120)),
                   (10, (200, 234, 255, 190)), (6, (245, 253, 255, 240))]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    d.ellipse([cx - 5, cy - 3, cx - 2, cy + 2], fill=(40, 70, 110))
    d.ellipse([cx + 2, cy - 3, cx + 5, cy + 2], fill=(40, 70, 110))
    save(img, "portrait_wisp.png")

def gen_npcs():
    for name, pal in NPCS.items():
        frames = [npc_frame(pal, bob=0, arm=0), npc_frame(pal, bob=1, arm=1)]
        sheet_of(frames, N_W, N_H, f"npc_{name}.png")
        npc_portrait(pal, name)
    gen_wisp()
    gen_knight_portrait()

# ==================================================================== COMPANION
# The knight's wolf: warmer fur than the enemy wolves and a collar, so at a
# glance you can tell your animal from theirs.
C_W, C_H = 48, 32
CF_DARK = (86, 66, 48)
CF_MID = (134, 106, 74)
CF_LIGHT = (176, 146, 106)
CF_BELLY = (208, 186, 150)
C_COLLAR = (150, 48, 42)
C_TAG = (238, 196, 88)
C_EYE = (232, 190, 74)

def companion_frame(legs=(0, 0, 0, 0), bob=0, head=0, jaw=0, tail=0, hurt=False):
    img = canvas(C_W, C_H)
    d = ImageDraw.Draw(img)
    y = bob

    # tail, drawn first so the body overlaps its root
    tx, ty = 6 - tail, 12 + y - abs(tail)
    d.line([(14, 16 + y), (tx, ty)], fill=CF_MID, width=5)
    d.line([(14, 16 + y), (tx, ty)], fill=CF_LIGHT, width=2)
    d.ellipse([tx - 3, ty - 3, tx + 3, ty + 3], fill=CF_LIGHT)

    # hind and fore legs
    for i, (lx, off) in enumerate([(16, legs[0]), (20, legs[1]), (30, legs[2]), (34, legs[3])]):
        shade = CF_DARK if i % 2 == 0 else CF_MID
        d.line([(lx, 20 + y), (lx + off, 30)], fill=shade, width=4)
        d.ellipse([lx + off - 3, 28, lx + off + 2, 31], fill=CF_DARK)

    # body
    d.ellipse([12, 11 + y, 36, 23 + y], fill=CF_MID)
    d.ellipse([12, 11 + y, 34, 17 + y], fill=CF_LIGHT)
    d.ellipse([16, 17 + y, 34, 23 + y], fill=CF_BELLY)

    # neck and head
    hx, hy = 38, 9 + y - head
    d.line([(32, 14 + y), (hx, hy + 3)], fill=CF_MID, width=8)
    d.ellipse([hx - 6, hy - 4, hx + 7, hy + 8], fill=CF_MID)
    d.ellipse([hx - 6, hy - 4, hx + 4, hy + 2], fill=CF_LIGHT)
    d.polygon([(hx - 4, hy - 3), (hx - 6, hy - 10), (hx + 1, hy - 4)], fill=CF_MID)   # ears
    d.polygon([(hx + 2, hy - 3), (hx + 4, hy - 10), (hx + 7, hy - 3)], fill=CF_DARK)
    d.polygon([(hx + 5, hy + 1), (hx + 13, hy + 3 + jaw), (hx + 5, hy + 6)], fill=CF_MID)  # muzzle
    d.ellipse([hx + 11, hy + 2 + jaw, hx + 13, hy + 4 + jaw], fill=(40, 30, 26))           # nose
    if jaw:
        d.polygon([(hx + 5, hy + 4), (hx + 12, hy + 6 + jaw), (hx + 5, hy + 7)], fill=(70, 26, 28))
        for t in range(6, 11, 3):
            d.line([(hx + t, hy + 4), (hx + t, hy + 6)], fill=(245, 240, 228))
    d.ellipse([hx + 1, hy, hx + 4, hy + 3], fill=C_EYE)
    d.point((hx + 2, hy + 1), fill=(30, 22, 20))

    # collar
    d.line([(hx - 6, hy + 5), (hx - 1, hy + 9)], fill=C_COLLAR, width=3)
    d.ellipse([hx - 4, hy + 8, hx - 1, hy + 11], fill=C_TAG)

    if hurt:
        overlay = Image.new("RGBA", (C_W, C_H), (255, 90, 80, 120))
        img = Image.alpha_composite(
            img, Image.composite(overlay, Image.new("RGBA", (C_W, C_H), (0, 0, 0, 0)), img.split()[3]))
    return img

def gen_companion():
    frames = []
    frames.append(companion_frame(bob=0, tail=0))                       # 0 idle
    frames.append(companion_frame(bob=1, tail=1, head=1))               # 1 idle
    # a four-beat gallop: gather, push, extend, land
    frames.append(companion_frame(legs=(3, 1, -2, -4), bob=-1, head=1, tail=2))   # 2 run
    frames.append(companion_frame(legs=(1, -2, 2, 4), bob=1, tail=1))             # 3
    frames.append(companion_frame(legs=(-3, -1, 4, 2), bob=-2, head=2, tail=2))   # 4
    frames.append(companion_frame(legs=(-1, 2, -1, -3), bob=0, tail=0))           # 5
    frames.append(companion_frame(legs=(4, 2, -4, -2), bob=-3, head=3, jaw=2, tail=3))  # 6 lunge
    frames.append(companion_frame(legs=(2, 4, -2, -4), bob=-1, head=2, jaw=3, tail=2))  # 7 bite
    frames.append(companion_frame(legs=(0, 0, 0, 0), bob=2, head=-3, tail=-2, hurt=True))  # 8 yelp
    sheet_of(frames, C_W, C_H, "companion.png")
    print("  companion: idle 0-1, run 2-5, attack 6-7, hurt 8")

# ==================================================================== ABILITY ICONS
def gen_ability_icons():
    """Market wares. Each icon is read at 48px on screen, so they lean on one
    strong silhouette rather than detail."""
    size = 24

    def frame(bg):
        img = canvas(size, size)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=4, fill=(26, 22, 30))
        d.rounded_rectangle([1, 1, size - 2, size - 2], radius=4, fill=bg)
        return img, d

    img, d = frame((58, 62, 74))                                  # whetstone: sharper sword
    d.polygon([(7, 18), (17, 6), (19, 8), (9, 20)], fill=(214, 220, 232))
    d.polygon([(7, 18), (17, 6), (18, 7), (8, 19)], fill=(250, 252, 255))
    d.line([(5, 20), (9, 16)], fill=(180, 140, 70), width=3)
    for i in range(3):
        d.line([(14 + i * 2, 4 + i), (16 + i * 2, 2 + i)], fill=(255, 246, 190))
    save(img, "icon_whet.png")

    img, d = frame((44, 68, 58))                                  # swiftness draught
    d.polygon([(9, 6), (15, 6), (15, 10), (18, 20), (6, 20), (9, 10)], fill=(126, 226, 168))
    d.polygon([(9, 13), (15, 13), (18, 20), (6, 20)], fill=(70, 190, 126))
    d.rectangle([9, 3, 15, 6], fill=(150, 120, 80))
    d.line([(11, 15), (13, 18)], fill=(214, 255, 232))
    save(img, "icon_swift.png")

    img, d = frame((48, 60, 86))                                  # warden's ward
    d.polygon([(12, 3), (20, 7), (20, 13), (12, 21), (4, 13), (4, 7)], fill=(188, 198, 214))
    d.polygon([(12, 5), (18, 8), (18, 13), (12, 19), (6, 13), (6, 8)], fill=(96, 138, 192))
    d.line([(12, 7), (12, 17)], fill=(226, 240, 255))
    d.line([(8, 11), (16, 11)], fill=(226, 240, 255))
    save(img, "icon_ward.png")

    img, d = frame((84, 46, 34))                                  # ember flask
    d.ellipse([6, 9, 18, 21], fill=(226, 92, 36))
    d.ellipse([8, 12, 16, 20], fill=(255, 158, 54))
    d.ellipse([10, 15, 14, 19], fill=(255, 232, 160))
    d.polygon([(12, 2), (16, 9), (8, 9)], fill=(255, 176, 66))
    save(img, "icon_ember.png")

    img, d = frame((86, 40, 50))                                  # heart of oak
    d.ellipse([4, 6, 12, 14], fill=(226, 64, 74))
    d.ellipse([11, 6, 19, 14], fill=(226, 64, 74))
    d.polygon([(4, 11), (19, 11), (12, 20)], fill=(226, 64, 74))
    d.ellipse([6, 8, 9, 11], fill=(255, 150, 148))
    save(img, "icon_heart.png")

def gen_light():
    """Radial falloff used to carve a lantern-lit hole in the darkness
    overlay on the night and cave levels."""
    size = 448
    img = canvas(size, size)
    px = img.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            dist = math.hypot(x - c, y - c) / c
            a = max(0.0, 1.0 - dist)
            a = a * a * (3 - 2 * a)  # smoothstep for a soft edge
            px[x, y] = (255, 255, 255, int(255 * a))
    save(img, "light.png", factor=1)

def gen_particle():
    size = 8
    img = canvas(size, size)
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, size - 1, size - 1], fill=(255, 255, 255, 90))
    d.ellipse([2, 2, size - 3, size - 3], fill=(255, 255, 255, 220))
    save(img, "particle.png", factor=1)

# ==================================================================== MAIN
if __name__ == "__main__":
    for theme_name, theme in THEMES.items():
        gen_sky(theme_name, theme)
        gen_far(theme_name, theme)
        gen_near(theme_name, theme)
        gen_ground(theme_name, theme)
        gen_ground_deep(theme_name, theme)
        gen_platform(theme_name, theme)
    gen_goblin()
    gen_wolf("wolf", (80, 74, 82), (52, 47, 56), (108, 100, 110), (222, 66, 44))
    gen_wolf("icewolf", (176, 196, 218), (118, 142, 172), (226, 238, 250), (90, 190, 240))
    gen_slime()
    gen_bat()
    gen_wraith()
    gen_dragon()
    gen_fireball()
    gen_crystal()
    gen_heart()
    gen_checkpoint()
    gen_spike()
    gen_gate()
    gen_fence()
    gen_lantern()
    gen_npcs()
    gen_companion()
    gen_ability_icons()
    gen_armor()
    gen_shield_bubble()
    gen_light()
    gen_particle()
    print("done")
