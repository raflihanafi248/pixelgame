#!/usr/bin/env python3
"""Generates every pixel-art asset for Pixel Forest Adventure.

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
    "autumn": {
        "sky": ((222, 214, 227), (191, 184, 212)),
        "fog": (216, 216, 232, 190),
        "near": [(58, 24, 30), (86, 38, 34), (162, 72, 44), (206, 118, 58), (232, 160, 74)],
        "far": [(46, 30, 50), (66, 44, 68), (98, 66, 96), (144, 100, 136), (176, 130, 162)],
        "trunk": [(28, 20, 30), (44, 32, 42), (70, 51, 58), (102, 76, 74)],
        "ground": [(245, 190, 110), (224, 150, 72), (188, 110, 56), (94, 58, 50), (74, 46, 42), (50, 30, 32), (26, 17, 21)],
        "style": "tree",
        "accent": (255, 196, 110),
    },
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
D_W, D_H = 96, 76

def dragon_frame(mouth_open=False, wing_up=True, hurt=False, rear=False):
    img = canvas(D_W, D_H)
    d = ImageDraw.Draw(img)
    scale_d, scale_m, scale_h = (28, 58, 40), (48, 96, 62), (82, 140, 88)
    belly = (176, 156, 96)
    horn = (222, 208, 170)
    membrane = (118, 62, 52)
    membrane_d = (78, 38, 34)
    eye = (255, 190, 60)

    lift = -6 if rear else 0
    # tail
    d.line([(14, 60 + lift), (2, 46 + lift)], fill=scale_d, width=7)
    d.line([(14, 60 + lift), (2, 46 + lift)], fill=scale_m, width=3)
    d.polygon([(2, 46 + lift), (0, 38 + lift), (7, 44 + lift)], fill=membrane)
    # wing
    wy = 8 if wing_up else 26
    d.polygon([(44, 32 + lift), (26, wy), (12, wy + 4), (24, 30 + lift), (18, 40 + lift), (40, 40 + lift)], fill=membrane)
    d.polygon([(44, 32 + lift), (26, wy), (30, wy + 8), (40, 36 + lift)], fill=membrane_d)
    d.line([(44, 32 + lift), (26, wy)], fill=scale_d, width=2)
    d.line([(44, 32 + lift), (18, 40 + lift)], fill=scale_d, width=2)
    # body
    d.ellipse([16, 34 + lift, 62, 66 + lift], fill=scale_m)
    d.ellipse([16, 34 + lift, 62, 48 + lift], fill=scale_h)
    d.ellipse([22, 48 + lift, 56, 66 + lift], fill=belly)
    # legs
    d.rectangle([24, 60 + lift, 32, 74], fill=scale_d)
    d.rectangle([46, 60 + lift, 54, 74], fill=scale_m)
    for fx in (24, 46):
        d.polygon([(fx - 2, 74), (fx + 10, 74), (fx + 10, 70), (fx - 2, 70)], fill=scale_d)
        for cxx in range(fx, fx + 10, 4):
            d.line([(cxx, 74), (cxx, 71)], fill=horn)
    # neck + head
    d.line([(52, 44 + lift), (74, 24 + lift)], fill=scale_m, width=11)
    d.line([(52, 44 + lift), (74, 24 + lift)], fill=scale_h, width=5)
    d.ellipse([68, 12 + lift, 92, 32 + lift], fill=scale_m)
    d.ellipse([68, 12 + lift, 92, 22 + lift], fill=scale_h)
    d.polygon([(70, 16 + lift), (60, 6 + lift), (72, 12 + lift)], fill=horn)
    d.polygon([(78, 12 + lift), (74, 2 + lift), (84, 11 + lift)], fill=horn)
    d.ellipse([80, 18 + lift, 84, 22 + lift], fill=eye)
    d.point((82, 20 + lift), fill=OUTL)
    if mouth_open:
        d.polygon([(86, 24 + lift), (96, 30 + lift), (86, 32 + lift)], fill=(60, 20, 24))
        d.polygon([(86, 24 + lift), (92, 27 + lift), (86, 27 + lift)], fill=(255, 210, 120))
        for tx in range(87, 94, 3):
            d.line([(tx, 26 + lift), (tx, 29 + lift)], fill=horn)
    else:
        d.line([(86, 27 + lift), (94, 29 + lift)], fill=scale_d, width=2)
    # back spikes
    for i, sx in enumerate(range(22, 58, 8)):
        d.polygon([(sx, 36 + lift), (sx + 4, 26 + lift - i), (sx + 8, 36 + lift)], fill=horn)

    if hurt:
        overlay = Image.new("RGBA", (D_W, D_H), (255, 80, 80, 110))
        img = Image.alpha_composite(img, Image.composite(overlay, Image.new("RGBA", (D_W, D_H), (0, 0, 0, 0)), img.split()[3]))
    return img

def gen_dragon():
    frames = [
        dragon_frame(wing_up=True),                    # 0 idle
        dragon_frame(wing_up=False),                   # 1 idle
        dragon_frame(mouth_open=True, rear=True),      # 2 attack
        dragon_frame(mouth_open=True, wing_up=False, rear=True),  # 3 attack
        dragon_frame(hurt=True),                       # 4 hurt
    ]
    sheet_of(frames, D_W, D_H, "dragon.png")
    print("  dragon frame size:", D_W * SCALE, "x", D_H * SCALE)

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
    gen_light()
    gen_particle()
    print("done")
