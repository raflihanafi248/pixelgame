#!/usr/bin/env python3
"""Generates pixel-art assets for the game by drawing on a low-res grid
and upscaling with nearest-neighbor, mimicking the hand-placed-pixel look
of the reference screenshot (autumn forest, lantern post, fence, hero).

SCALE=2 keeps individual pixels small/dense (finer detail, less blocky)
while everything is still built on an integer pixel grid."""

import random
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)
random.seed(7)

SCALE = 2  # unified pixel scale for every asset

def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def upscale(img, factor):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)

def save(img, name, factor=SCALE):
    if factor > 1:
        img = upscale(img, factor)
    img.save(os.path.join(OUT, name))
    print("wrote", name, img.size)

# ---------------------------------------------------------------- palette
SKY_TOP = (222, 214, 227, 255)
SKY_BOT = (191, 184, 212, 255)
FOG = (216, 216, 232, 190)

PLUM_SHADOW = (46, 30, 50, 255)
PLUM_DARK = (66, 44, 68, 255)
PLUM_MID = (98, 66, 96, 255)
PLUM_LIGHT = (144, 100, 136, 255)
PLUM_HI = (176, 130, 162, 255)

RUST_SHADOW = (58, 24, 30, 255)
RUST_DARK = (86, 38, 34, 255)
ORANGE_MID = (162, 72, 44, 255)
ORANGE_LIGHT = (206, 118, 58, 255)
ORANGE_HI = (232, 160, 74, 255)
ORANGE_HI2 = (247, 197, 110, 255)

TRUNK_SHADOW = (28, 20, 30, 255)
TRUNK_DARK = (44, 32, 42, 255)
TRUNK_MID = (70, 51, 58, 255)
TRUNK_HI = (102, 76, 74, 255)
TRUNK_HI2 = (132, 100, 92, 255)

GROUND_TOP = (224, 150, 72, 255)
GROUND_TOP2 = (188, 110, 56, 255)
GROUND_TOP3 = (245, 190, 110, 255)
GROUND_MID = (94, 58, 50, 255)
GROUND_MID2 = (74, 46, 42, 255)
GROUND_DARK = (50, 30, 32, 255)
GROUND_DEEP = (26, 17, 21, 255)

FENCE_SHADOW = (30, 24, 22, 255)
FENCE_DARK = (48, 39, 34, 255)
FENCE_MID = (72, 59, 50, 255)
FENCE_HI = (100, 84, 68, 255)
FENCE_GRAIN = (58, 47, 40, 255)

STONE_SHADOW = (20, 18, 19, 255)
STONE_DARK = (34, 31, 32, 255)
STONE_MID = (52, 48, 50, 255)
STONE_HI = (74, 69, 70, 255)
LANTERN_GLOW = (255, 179, 71, 255)
LANTERN_GLOW2 = (255, 140, 50, 255)
LANTERN_CORE = (255, 230, 150, 255)
LANTERN_FRAME = (24, 20, 19, 255)

HAIR = (172, 178, 186, 255)
HAIR_MID = (140, 146, 154, 255)
HAIR_DARK = (100, 106, 114, 255)
SKIN = (224, 175, 136, 255)
SKIN_SHADE = (196, 146, 110, 255)
TUNIC = (39, 68, 104, 255)
TUNIC_MID = (54, 90, 132, 255)
TUNIC_HI = (82, 124, 172, 255)
CLOAK = (30, 42, 58, 255)
PANTS = (64, 46, 36, 255)
PANTS_HI = (86, 62, 48, 255)
BOOT = (30, 22, 20, 255)
BOOT_HI = (52, 38, 34, 255)
SHIELD_WOOD = (118, 80, 46, 255)
SHIELD_WOOD_DARK = (88, 58, 32, 255)
SHIELD_RIM = (188, 190, 196, 255)
SHIELD_RIM_DARK = (140, 142, 150, 255)
SHIELD_BOSS = (222, 224, 228, 255)
BLADE = (214, 218, 224, 255)
BLADE_EDGE = (244, 246, 250, 255)
BLADE_DARK = (158, 162, 170, 255)
HILT = (100, 68, 44, 255)
GUARD = (196, 178, 120, 255)
OUTLINE = (16, 12, 16, 255)

# ============================================================== SKY
def gen_sky():
    w, h = 480, 270
    img = canvas(w, h)
    px = img.load()
    for y in range(h):
        t = y / h
        r = int(SKY_TOP[0] * (1 - t) + SKY_BOT[0] * t)
        g = int(SKY_TOP[1] * (1 - t) + SKY_BOT[1] * t)
        b = int(SKY_TOP[2] * (1 - t) + SKY_BOT[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b, 255)
    d = ImageDraw.Draw(img)
    fog_spots = [(60, 190, 64, 30), (210, 210, 88, 36), (360, 184, 76, 32), (450, 200, 60, 26)]
    for cx0, cy, rx, ry in fog_spots:
        for cx in (cx0 - w, cx0, cx0 + w):
            d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=FOG)
    save(img, "bg_sky.png")

# ============================================================== ORGANIC CANOPY HELPERS
def blob_cluster(d, cx, cy, w, h, shadow, dark, mid, light, hi, seed_offset=0):
    """Draws a foliage clump out of overlapping soft-edged blobs so the
    silhouette reads as leaves rather than a single perfect ellipse."""
    rnd = random.Random(seed_offset)
    d.ellipse([cx - w // 2, cy - h // 2 + 4, cx + w // 2, cy + h // 2 + 4], fill=shadow)
    n = 7
    for i in range(n):
        ang = (i / n) * 6.283 + rnd.uniform(-0.2, 0.2)
        rr = rnd.uniform(0.55, 0.85)
        bx = cx + int((w / 2) * rr * 0.8 * _cos(ang))
        by = cy + int((h / 2) * rr * 0.8 * _sin(ang))
        bw = int(w * rnd.uniform(0.34, 0.5))
        bh = int(h * rnd.uniform(0.34, 0.5))
        d.ellipse([bx - bw // 2, by - bh // 2, bx + bw // 2, by + bh // 2], fill=dark)
    d.ellipse([cx - w // 2 + w // 8, cy - h // 2, cx + w // 2 - w // 10, cy + h // 3], fill=mid)
    for i in range(4):
        ang = rnd.uniform(0, 6.283)
        bx = cx + int((w / 3) * _cos(ang)) - w // 8
        by = cy + int((h / 3) * _sin(ang)) - h // 4
        bw = int(w * rnd.uniform(0.2, 0.32))
        bh = int(h * rnd.uniform(0.2, 0.32))
        d.ellipse([bx - bw // 2, by - bh // 2, bx + bw // 2, by + bh // 2], fill=light)
    hx = cx - w // 5
    hy = cy - h // 3
    hw = int(w * 0.22)
    hh = int(h * 0.2)
    d.ellipse([hx - hw // 2, hy - hh // 2, hx + hw // 2, hy + hh // 2], fill=hi)

import math
def _cos(a):
    return math.cos(a)
def _sin(a):
    return math.sin(a)

def draw_trunk(d, x, y_base, height, w_top, w_base, dark, mid, hi, shadow):
    d.polygon([
        (x - w_base // 2, y_base), (x + w_base // 2, y_base),
        (x + w_top // 2, y_base - height), (x - w_top // 2, y_base - height),
    ], fill=mid)
    d.line([(x - w_base // 2, y_base), (x - w_top // 2, y_base - height)], fill=shadow, width=2)
    d.line([(x + w_base // 2, y_base), (x + w_top // 2, y_base - height)], fill=dark, width=2)
    d.line([(x - w_base // 6, y_base - 2), (x - w_top // 6, y_base - height + 4)], fill=hi, width=1)
    if height > 40:
        bx = x + w_top // 2
        by = y_base - height + height // 3
        d.line([(bx, by), (bx + w_top, by - w_top)], fill=mid, width=3)
        d.line([(bx, by), (bx + w_top, by - w_top)], fill=shadow, width=1)

# ============================================================== FAR TREE LAYER (plum silhouettes)
def gen_trees_back():
    w, h = 640, 240
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    positions = [70, 210, 350, 490, 610]
    for i, cx0 in enumerate(positions):
        trunk_h = 90 + (i % 3) * 12
        for cx in (cx0 - w, cx0, cx0 + w):
            draw_trunk(d, cx, h - 10, trunk_h, 10, 16, PLUM_SHADOW, PLUM_DARK, PLUM_MID, PLUM_SHADOW)
            blob_cluster(d, cx, h - trunk_h - 26, 110, 96, PLUM_SHADOW, PLUM_DARK, PLUM_MID, PLUM_LIGHT, PLUM_HI, seed_offset=i * 13 + 1)
    save(img, "bg_trees_far.png")

# ============================================================== NEAR TREE LAYER (autumn orange)
def gen_trees_near():
    w, h = 640, 300
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    positions = [70, 210, 350, 490, 610]
    for i, cx0 in enumerate(positions):
        trunk_h = 150 + (i % 2) * 20
        for cx in (cx0 - w, cx0, cx0 + w):
            draw_trunk(d, cx, h - 6, trunk_h, 14, 22, TRUNK_DARK, TRUNK_MID, TRUNK_HI, TRUNK_SHADOW)
            rnd = random.Random(i * 31 + 5)
            for _ in range(5):
                bx = cx + rnd.randint(-8, 8)
                by = h - 6 - rnd.randint(6, trunk_h - 6)
                d.line([(bx, by), (bx, by + rnd.randint(8, 14))], fill=TRUNK_SHADOW, width=1)
            blob_cluster(d, cx, h - trunk_h - 30, 130, 118, RUST_SHADOW, RUST_DARK, ORANGE_MID, ORANGE_LIGHT, ORANGE_HI, seed_offset=i * 17 + 3)
            rnd2 = random.Random(i * 53 + 9)
            for _ in range(3):
                ang = rnd2.uniform(0, 6.283)
                rr = rnd2.uniform(0.25, 0.6)
                lx = cx + int(50 * rr * _cos(ang))
                ly = (h - trunk_h - 30) + int(42 * rr * _sin(ang))
                lw = rnd2.randint(8, 14)
                d.ellipse([lx - lw // 2, ly - lw // 3, lx + lw // 2, ly + lw // 3], fill=ORANGE_HI2)
    save(img, "bg_trees_near.png")

# ============================================================== GROUND TILE
def gen_ground():
    w, h = 32, 32
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, 4], fill=GROUND_TOP)
    d.rectangle([0, 0, w - 1, 1], fill=GROUND_TOP3)
    rnd = random.Random(42)
    for x in range(0, w, 3):
        if rnd.random() < 0.5:
            d.point((x, 2), fill=GROUND_TOP2)
    d.rectangle([0, 5, w - 1, 19], fill=GROUND_MID)
    for _ in range(14):
        x = rnd.randint(0, w - 1)
        y = rnd.randint(6, 18)
        d.point((x, y), fill=rnd.choice([GROUND_MID2, GROUND_DARK]))
    d.rectangle([0, 20, w - 1, 27], fill=GROUND_DARK)
    d.rectangle([0, 28, w - 1, 31], fill=GROUND_DEEP)
    save(img, "ground.png")

# ============================================================== WOODEN FENCE TILE
def gen_fence():
    w, h = 64, 40
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    for px in (4, 56):
        d.rectangle([px, 8, px + 7, h - 1], fill=FENCE_MID)
        d.rectangle([px, 8, px, h - 1], fill=FENCE_SHADOW)
        d.rectangle([px + 6, 8, px + 7, h - 1], fill=FENCE_DARK)
        d.rectangle([px + 1, 6, px + 6, 9], fill=FENCE_DARK)
        for y in range(12, h - 2, 6):
            d.line([(px + 2, y), (px + 5, y)], fill=FENCE_GRAIN)
    for rail_y in (12, 26):
        d.rectangle([0, rail_y, w - 1, rail_y + 7], fill=FENCE_MID)
        d.rectangle([0, rail_y, w - 1, rail_y], fill=FENCE_HI)
        d.rectangle([0, rail_y + 6, w - 1, rail_y + 7], fill=FENCE_SHADOW)
        for x in range(6, w, 10):
            d.line([(x, rail_y + 2), (x + 4, rail_y + 2)], fill=FENCE_GRAIN)
    save(img, "fence.png")

# ============================================================== LANTERN POST
def gen_lantern():
    w, h = 28, 68
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    d.rectangle([11, 20, 16, h - 1], fill=STONE_MID)
    d.rectangle([11, 20, 12, h - 1], fill=STONE_DARK)
    d.rectangle([15, 20, 16, h - 1], fill=STONE_HI)
    d.rectangle([8, 14, 19, 21], fill=STONE_DARK)
    d.rectangle([8, 14, 19, 15], fill=STONE_HI)
    d.line([(14, 14), (5, 8)], fill=LANTERN_FRAME, width=2)
    d.rectangle([1, 4, 8, 9], fill=LANTERN_FRAME)
    # lantern glass with warm gradient glow
    d.ellipse([0, 12, 10, 34], fill=LANTERN_GLOW2)
    d.rectangle([1, 15, 9, 31], fill=LANTERN_GLOW)
    d.rectangle([2, 18, 8, 27], fill=LANTERN_CORE)
    d.rectangle([3, 20, 6, 24], fill=(255, 255, 220, 255))
    for fx in (0, 5, 9):
        d.line([(fx, 12), (fx, 34)], fill=LANTERN_FRAME, width=1)
    d.rectangle([0, 12, 9, 13], fill=LANTERN_FRAME)
    d.rectangle([0, 33, 9, 34], fill=LANTERN_FRAME)
    d.polygon([(0, 12), (9, 12), (5, 6)], outline=LANTERN_FRAME, fill=None)
    save(img, "lantern.png")

# ============================================================== HERO SPRITESHEET
FRAME_W, FRAME_H = 32, 48

def hero_base(d, leg_offset=(0, 0), arm_swing=0, bob=0):
    lx1, lx2 = leg_offset
    y0 = bob
    cx = FRAME_W // 2
    # cloak behind
    d.polygon([(cx - 6, 12 + y0), (cx + 9, 12 + y0), (cx + 12, 34 + y0), (cx - 9, 34 + y0)], fill=CLOAK)
    # hair / helmet
    d.ellipse([cx - 8, 2 + y0, cx + 8, 14 + y0], fill=HAIR)
    d.ellipse([cx - 8, 2 + y0, cx + 8, 8 + y0], fill=HAIR_MID)
    d.rectangle([cx - 8, 6 + y0, cx - 6, 12 + y0], fill=HAIR_DARK)
    # face
    d.rectangle([cx - 5, 9 + y0, cx + 5, 15 + y0], fill=SKIN)
    d.rectangle([cx - 5, 13 + y0, cx + 5, 15 + y0], fill=SKIN_SHADE)
    d.point((cx + 2, 11 + y0), fill=OUTLINE)
    # torso / tunic
    d.rectangle([cx - 7, 15 + y0, cx + 7, 30 + y0], fill=TUNIC)
    d.rectangle([cx - 7, 15 + y0, cx - 2, 22 + y0], fill=TUNIC_HI)
    for ly in range(17, 29, 4):
        d.line([(cx - 6, ly + y0), (cx + 6, ly + y0)], fill=TUNIC_MID)
    d.rectangle([cx - 7, 28 + y0, cx + 7, 30 + y0], fill=TUNIC_MID)
    # belt
    d.rectangle([cx - 7, 29 + y0, cx + 7, 31 + y0], fill=HILT)
    # shield (left hand)
    sx = cx - 15
    d.ellipse([sx - 8, 16 + y0, sx + 8, 32 + y0], fill=SHIELD_RIM)
    d.ellipse([sx - 6, 18 + y0, sx + 6, 30 + y0], fill=SHIELD_WOOD)
    d.ellipse([sx - 6, 18 + y0, sx + 1, 24 + y0], fill=SHIELD_WOOD_DARK)
    d.ellipse([sx - 3, 22 + y0, sx + 3, 28 + y0], fill=SHIELD_BOSS)
    d.ellipse([sx - 8, 16 + y0, sx + 8, 32 + y0], outline=SHIELD_RIM_DARK)
    # legs
    d.rectangle([cx - 6, 31 + y0, cx - 1, 42 + y0], fill=PANTS)
    d.rectangle([cx + 1, 31 + y0, cx + 6, 42 + y0], fill=PANTS)
    d.line([(cx - 6, 31 + y0), (cx - 6, 42 + y0)], fill=PANTS_HI)
    # boots (offset for walk cycle)
    d.rectangle([cx - 7 + lx1, 42 + y0, cx - 1 + lx1, 47 + y0], fill=BOOT)
    d.rectangle([cx - 7 + lx1, 42 + y0, cx - 6 + lx1, 47 + y0], fill=BOOT_HI)
    d.rectangle([cx + 1 + lx2, 42 + y0, cx + 7 + lx2, 47 + y0], fill=BOOT)
    d.rectangle([cx + 1 + lx2, 42 + y0, cx + 2 + lx2, 47 + y0], fill=BOOT_HI)
    # sword arm (right side), swings with arm_swing
    sx2 = cx + 12 + arm_swing
    sy2 = 14 + y0 - arm_swing // 2
    d.line([(cx + 8, 17 + y0), (sx2, sy2 + 14)], fill=GUARD, width=2)
    d.line([(sx2, sy2), (sx2 + 3, sy2 + 24)], fill=BLADE, width=3)
    d.line([(sx2 + 1, sy2), (sx2 + 3, sy2 + 22)], fill=BLADE_EDGE, width=1)
    d.line([(sx2 - 1, sy2 + 14), (sx2 + 5, sy2 + 14)], fill=GUARD, width=2)
    d.line([(sx2, sy2 + 14), (sx2 + 1, sy2 + 20)], fill=HILT, width=2)

def gen_hero():
    frames = []
    for bob in (0, 1):
        img = canvas(FRAME_W, FRAME_H)
        d = ImageDraw.Draw(img)
        hero_base(d, leg_offset=(0, 0), arm_swing=0, bob=bob)
        frames.append(img)
    walk_cycle = [((2, -2), 2), ((0, 0), 0), ((-2, 2), -2), ((0, 0), 0)]
    for legs, arm in walk_cycle:
        img = canvas(FRAME_W, FRAME_H)
        d = ImageDraw.Draw(img)
        hero_base(d, leg_offset=legs, arm_swing=arm, bob=0)
        frames.append(img)
    img = canvas(FRAME_W, FRAME_H)
    d = ImageDraw.Draw(img)
    hero_base(d, leg_offset=(-2, -2), arm_swing=2, bob=-2)
    frames.append(img)
    for arm in (6, 9):
        img = canvas(FRAME_W, FRAME_H)
        d = ImageDraw.Draw(img)
        hero_base(d, leg_offset=(0, 0), arm_swing=arm, bob=0)
        frames.append(img)

    sheet = canvas(FRAME_W * len(frames), FRAME_H)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * FRAME_W, 0), f)
    save(sheet, "hero.png")
    print("frame layout: idle[0-1] walk[2-5] jump[6] attack[7-8], frame size",
          FRAME_W * SCALE, "x", FRAME_H * SCALE)

# ============================================================== ENEMIES
GOBLIN_SKIN = (100, 144, 80, 255)
GOBLIN_SKIN_DARK = (66, 102, 56, 255)
GOBLIN_SKIN_HI = (134, 172, 104, 255)
GOBLIN_CLOTH = (80, 56, 42, 255)
GOBLIN_CLOTH_DARK = (58, 40, 30, 255)
WOLF_FUR = (80, 74, 82, 255)
WOLF_FUR_DARK = (52, 47, 56, 255)
WOLF_FUR_HI = (108, 100, 110, 255)
WOLF_EYE = (222, 66, 44, 255)
SLIME_BODY = (128, 96, 176, 220)
SLIME_BODY_DARK = (96, 68, 140, 220)
SLIME_BODY_HI = (176, 148, 216, 230)
SLIME_EYE = (26, 18, 36, 255)

def gen_goblin():
    w, h = 28, 36
    frames = []
    for step in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        d.ellipse([8, 4, 20, 14], fill=GOBLIN_SKIN)
        d.ellipse([8, 4, 20, 9], fill=GOBLIN_SKIN_HI)
        d.polygon([(6, 6), (2, 3), (7, 10)], fill=GOBLIN_SKIN)
        d.polygon([(22, 6), (26, 3), (21, 10)], fill=GOBLIN_SKIN)
        d.ellipse([10, 7, 12, 9], fill=(255, 232, 96, 255))
        d.ellipse([16, 7, 18, 9], fill=(255, 232, 96, 255))
        d.line([(11, 12), (13, 13)], fill=OUTLINE)
        d.line([(15, 13), (17, 12)], fill=OUTLINE)
        d.rectangle([6, 14, 22, 26], fill=GOBLIN_CLOTH)
        d.rectangle([6, 14, 22, 16], fill=GOBLIN_CLOTH_DARK)
        d.rectangle([6, 22, 22, 26], fill=GOBLIN_CLOTH_DARK)
        off = 2 if step else 0
        d.rectangle([7 + off, 26, 12 + off, 35], fill=GOBLIN_SKIN_DARK)
        d.rectangle([16 - off, 26, 21 - off, 35], fill=GOBLIN_SKIN_DARK)
        d.line([(22, 10), (27, 22)], fill=(150, 150, 150, 255), width=2)
        d.line([(22, 10), (27, 22)], fill=(210, 210, 210, 255), width=1)
        frames.append(img)
    sheet = canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0), f)
    save(sheet, "goblin.png")

def gen_wolf():
    w, h = 44, 26
    frames = []
    for step in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        d.ellipse([6, 8, 36, 20], fill=WOLF_FUR)
        d.ellipse([6, 8, 36, 14], fill=WOLF_FUR_HI)
        d.ellipse([6, 14, 36, 20], fill=WOLF_FUR_DARK)
        d.polygon([(34, 4), (42, 10), (33, 13)], fill=WOLF_FUR)
        d.polygon([(36, 6), (40, 8), (35, 9)], fill=WOLF_FUR_DARK)
        d.rectangle([37, 8, 39, 9], fill=WOLF_EYE)
        d.line([(38, 9), (43, 12)], fill=WOLF_FUR_DARK, width=2)
        off = 2 if step else 0
        for lx in (10 + off, 20 - off, 27 + off):
            d.rectangle([lx, 19, lx + 4, 25], fill=WOLF_FUR_DARK)
        d.rectangle([2, 19, 6, 25], fill=WOLF_FUR_DARK)
        frames.append(img)
    sheet = canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0), f)
    save(sheet, "wolf.png")

def gen_slime():
    w, h = 28, 22
    frames = []
    for squish in (0, 1):
        img = canvas(w, h)
        d = ImageDraw.Draw(img)
        top = 4 + squish * 3
        d.ellipse([2, top, 25, 21], fill=SLIME_BODY_DARK)
        d.ellipse([3, top + 1, 22, 19], fill=SLIME_BODY)
        d.ellipse([5, top + 2, 15, top + 9], fill=SLIME_BODY_HI)
        d.ellipse([8, 13, 11, 16], fill=SLIME_EYE)
        d.ellipse([16, 13, 19, 16], fill=SLIME_EYE)
        d.ellipse([9, 14, 10, 15], fill=(255, 255, 255, 220))
        d.ellipse([17, 14, 18, 15], fill=(255, 255, 255, 220))
        frames.append(img)
    sheet = canvas(w * len(frames), h)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0), f)
    save(sheet, "slime.png")

# ============================================================== VICTORY GATE
def gen_gate():
    w, h = 48, 92
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    for side in (0, 1):
        x = 3 if side == 0 else w - 11
        d.rectangle([x, 8, x + 7, h - 4], fill=STONE_MID)
        d.rectangle([x, 8, x + 1, h - 4], fill=STONE_SHADOW)
        d.rectangle([x + 6, 8, x + 7, h - 4], fill=STONE_HI)
        for y in range(12, h - 6, 10):
            d.rectangle([x, y, x + 7, y + 1], fill=STONE_SHADOW)
    d.rectangle([2, 2, w - 3, 12], fill=STONE_MID)
    d.rectangle([2, 2, w - 3, 4], fill=STONE_HI)
    d.ellipse([10, 16, w - 11, h - 16], fill=LANTERN_GLOW2)
    d.ellipse([14, 22, w - 15, h - 24], fill=LANTERN_GLOW)
    d.ellipse([18, 28, w - 19, h - 32], fill=LANTERN_CORE)
    d.ellipse([21, 32, w - 22, h - 38], fill=(255, 255, 235, 255))
    save(img, "gate.png")

if __name__ == "__main__":
    gen_sky()
    gen_trees_back()
    gen_trees_near()
    gen_ground()
    gen_fence()
    gen_lantern()
    gen_hero()
    gen_goblin()
    gen_wolf()
    gen_slime()
    gen_gate()
    print("done")
