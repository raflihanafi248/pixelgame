#!/usr/bin/env python3
"""Builds the outdoor chapters' terrain and parallax from the GandalfHardcore
FREE Platformer Assets pack, and cuts its decor sheets into the props the game
places to make the world look lived in.

The pack ships three seasons of everything, which lines up with the game:
    autumn -> chapter 1, The Autumn Wood
    winter -> chapter 4, The Frozen Peak

Usage:
    python3 tools/pack_gandalf.py "<path to the GandalfHardcore folder>"
"""

import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

GAME_W, GAME_H = 960, 540
GROUND_Y = 412        # must match src/levels.js
GROUND_TILE = 64      # one ground sprite on screen
TILE = 32             # the pack's tile grid

BG_SCALE = 1.6        # lands the pack's treeline just above the ground line

# Rows 0-5 of Floor Tiles1 are the green set, 6-11 autumn, 12-17 winter.
SEASON_ROW = {"green": 0, "autumn": 6, "winter": 12}

# Which parallax layers the game's three are made of, back to front. Layer 5 is
# the sky, 4 the far mountains, 3 and 2 the mid treeline, 1 the near pines.
BG_GROUPS = {"sky": [5, 4], "far": [3, 2], "near": [1]}


def save(img, name):
    img.save(os.path.join(OUT, name))
    print(f"wrote {name} {img.size}")


# ------------------------------------------------------------------ parallax
def bg_layer(src, season_dir, n):
    path = os.path.join(src, "GandalfHardcore Background layers", season_dir,
                        f"GandalfHardcore Background layers_layer {n}.png")
    return Image.open(path).convert("RGBA")


def castle(src, season_dir):
    for name in ("Background Castle Autumn.png", "Background Castle  Winter.png",
                 "Background Castle .png"):
        path = os.path.join(src, "GandalfHardcore Background layers", season_dir, name)
        if os.path.exists(path):
            return Image.open(path).convert("RGBA")
    return None


def build_parallax(src, season_dir, theme):
    """Flatten the pack's five layers into the game's sky / far / near."""
    w, h = 1024, 346
    out_w, out_h = round(w * BG_SCALE), round(h * BG_SCALE)
    for group, layers in BG_GROUPS.items():
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for n in sorted(layers, reverse=True):     # 5 is furthest back
            img.alpha_composite(bg_layer(src, season_dir, n))
            if n == 5:
                # The castle sits between the sky and the far mountains.
                keep = castle(src, season_dir)
                if keep:
                    img.alpha_composite(keep)
        img = img.resize((out_w, out_h), Image.NEAREST)
        # Bottom-align: the game hangs far/near off the bottom of the screen.
        img = img.crop((0, out_h - GAME_H, out_w, out_h))
        if group == "sky":
            # The sky never scrolls and must be opaque - it is the backdrop.
            img = img.crop((0, 0, GAME_W, GAME_H))
            flat = Image.new("RGBA", img.size, (222, 200, 150, 255))
            flat.alpha_composite(img)
            img = flat.convert("RGB")
        save(img, f"{group}_{theme}.png")


# ------------------------------------------------------------------- terrain
def tiles(src):
    return Image.open(os.path.join(src, "Floor Tiles1.png")).convert("RGBA")


def at(sheet, col, row, season):
    y = (SEASON_ROW[season] + row) * TILE
    return sheet.crop((col * TILE, y, col * TILE + TILE, y + TILE))


def pair(tile):
    """A tile beside its own mirror image.

    Even the pack's interior tiles carry a hint of side shading, so butting two
    different ones together leaves a seam every 64px across a whole level.
    Mirroring means both outer edges of the 64px sprite are the same column, so
    it repeats invisibly - and the mirror also hides that it is one tile twice.
    """
    out = Image.new("RGBA", (TILE * 2, TILE), (0, 0, 0, 0))
    out.paste(tile, (0, 0))
    out.paste(tile.transpose(Image.FLIP_LEFT_RIGHT), (TILE, 0))
    return out


def build_terrain(sheet, season, theme):
    """One 64x64 ground sprite: a grass-topped row over a row of solid rock."""
    g = Image.new("RGBA", (GROUND_TILE, GROUND_TILE), (0, 0, 0, 0))
    g.paste(pair(at(sheet, 1, 0, season)), (0, 0))
    g.paste(pair(at(sheet, 1, 1, season)), (0, TILE))
    save(g, f"ground_{theme}.png")

    d = Image.new("RGBA", (GROUND_TILE, GROUND_TILE), (0, 0, 0, 0))
    d.paste(pair(at(sheet, 1, 1, season)), (0, 0))
    d.paste(pair(at(sheet, 1, 2, season)), (0, TILE))
    save(d, f"ground_{theme}_deep.png")


def build_platform(sheet, season, theme):
    """192x56, the size the level geometry and one-way collision already use:
    a capped six-tile ledge with a shallow rock underside."""
    p = Image.new("RGBA", (192, 56), (0, 0, 0, 0))
    top, fill = at(sheet, 1, 0, season), at(sheet, 1, 1, season)
    row = [at(sheet, 0, 0, season), top, top.transpose(Image.FLIP_LEFT_RIGHT),
           top, top.transpose(Image.FLIP_LEFT_RIGHT), at(sheet, 3, 0, season)]
    for i, t in enumerate(row):
        p.paste(t, (i * TILE, 0))
    under = [at(sheet, 0, 1, season), fill, fill.transpose(Image.FLIP_LEFT_RIGHT),
             fill, fill.transpose(Image.FLIP_LEFT_RIGHT), at(sheet, 3, 1, season)]
    for i, t in enumerate(under):
        p.paste(t.crop((0, 0, TILE, 24)), (i * TILE, TILE))
    save(p, f"platform_{theme}.png")


# ---------------------------------------------------------------- the world
# Boxes into Decor.png (32px grid). Each is cropped generously and then
# trimmed to its own alpha, so a prop can be placed by its real footprint.
DECOR = {
    "prop_crate":      (0, 0, 32, 32),
    "prop_crates":     (32, 0, 64, 64),
    "prop_barrel":     (64, 0, 96, 32),
    "prop_barrels":    (96, 0, 128, 32),
    "prop_stool":      (128, 0, 160, 32),
    "prop_pot":        (160, 0, 192, 32),
    "prop_chopblock":  (192, 0, 224, 64),
    "prop_apples":     (320, 0, 352, 32),
    "prop_bottles":    (384, 0, 416, 32),
    "prop_stall":      (256, 32, 320, 68),
    "prop_trestle":    (256, 68, 320, 96),
    "prop_tent":       (0, 32, 96, 102),
    "prop_tent_worn":  (96, 32, 192, 102),
    "prop_firewood":   (192, 64, 256, 96),
    "prop_basket":     (320, 64, 352, 96),
    "prop_cookfire":   (0, 96, 64, 128),
    "prop_grave_a":    (192, 96, 224, 128),
    "prop_grave_b":    (256, 96, 288, 128),
    "prop_cross":      (288, 96, 320, 128),
    "prop_mourner":    (320, 96, 352, 128),
    "prop_pumpkin":    (352, 96, 384, 128),
    "prop_reeds":      (288, 160, 352, 192),
    "prop_scarecrow":  (288, 192, 320, 256),
    "prop_wall":       (352, 128, 416, 192),
    "prop_washline":   (0, 320, 160, 384),
    "prop_statue":     (384, 288, 416, 320),
    "prop_leafpile":   (160, 320, 256, 352),
    "prop_snowpile":   (256, 320, 352, 352),
    "prop_rocks":      (0, 288, 96, 320),
    "prop_rocks_autumn": (192, 288, 288, 320),
    "prop_rocks_snow": (288, 288, 352, 320),
    "prop_bush_green":   (0, 416, 128, 448),
    "prop_bush_autumn":  (0, 448, 128, 480),
    "prop_bush_snow":    (0, 480, 128, 512),
}

# Whole-file props, and the bands to cut out of Pine Trees.png.
TREES = {
    "tree_green": "Tree1.png",
    "tree_autumn": "Tree3.png",
    "tree_snow": "Tree4.png",
    "birch_autumn": "Birch2.png",
    "birch_snow": "Birch3.png",
    "willow": "Weeping Willow1.png",
}
PINE_BANDS = {
    "pine_green": (1, 94),
    "pine_autumn": (225, 318),
    "pine_gold": (321, 414),
    "pine_snow": (449, 542),
    "trunk_bare": (194, 222),
}


def trimmed(img, box=None):
    piece = img.crop(box) if box else img.copy()
    bb = piece.getbbox()
    return piece.crop(bb) if bb else piece


# These boxes hold several loose items side by side; each becomes its own
# sprite so a level can scatter them instead of stamping the same clump.
SPLIT = {"prop_bush_green", "prop_bush_autumn", "prop_bush_snow",
         "prop_rocks", "prop_rocks_autumn", "prop_rocks_snow"}


def split_band(img):
    """Cut a row of loose props apart on its transparent columns."""
    import numpy as np
    a = np.asarray(img)[:, :, 3] > 8
    cols = np.where(a.any(axis=0))[0]
    if not len(cols):
        return [img]
    runs, start, prev = [], cols[0], cols[0]
    for v in cols[1:]:
        if v > prev + 2:
            runs.append((start, prev + 1))
            start = v
        prev = v
    runs.append((start, prev + 1))
    return [trimmed(img, (int(x0), 0, int(x1), img.height)) for x0, x1 in runs]


# Season recolours, as a rotation of the green clump's own hue and value.
SEASON_SHIFT = {
    # (hue target, saturation scale, value scale) in HSV terms
    "autumn": (28 / 360, 0.95, 1.12),
    "snow": (205 / 360, 0.16, 1.45),
}


def reseason(img, season):
    """Recolour green foliage into autumn gold or winter frost, keeping the
    shading. Only the hue and saturation move, so the clump keeps its form."""
    import colorsys
    hue, sat_k, val_k = SEASON_SHIFT[season]
    out = []
    for r, g, b, a in img.getdata():
        if a == 0:
            out.append((r, g, b, a))
            continue
        _, sv, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        nr, ng, nb = colorsys.hsv_to_rgb(hue, min(1, sv * sat_k), min(1, vv * val_k))
        out.append((int(nr * 255), int(ng * 255), int(nb * 255), a))
    res = Image.new("RGBA", img.size)
    res.putdata(out)
    return res


def build_props(src):
    decor = Image.open(os.path.join(src, "Decor.png")).convert("RGBA")
    for name, box in DECOR.items():
        piece = trimmed(decor, box)
        if name in SPLIT:
            for i, part in enumerate(split_band(piece)):
                save(part, f"{name}_{i}.png")
        else:
            save(piece, f"{name}.png")

    for name, fn in TREES.items():
        save(trimmed(Image.open(os.path.join(src, fn)).convert("RGBA")), f"{name}.png")

    pines = Image.open(os.path.join(src, "Pine Trees.png")).convert("RGBA")
    for name, (x0, x1) in PINE_BANDS.items():
        save(trimmed(pines, (x0, 0, x1, pines.height)), f"{name}.png")

    # Tall Grass.png is three poses of the same green clump, not three seasons,
    # so the autumn and winter chapters get recoloured copies.
    grass = Image.open(os.path.join(src, "Tall Grass.png")).convert("RGBA")
    for i in range(3):
        clump = trimmed(grass, (i * TILE, 0, (i + 1) * TILE, grass.height))
        save(clump, f"tallgrass_green_{i}.png")
        save(reseason(clump, "autumn"), f"tallgrass_autumn_{i}.png")
        save(reseason(clump, "snow"), f"tallgrass_snow_{i}.png")

    wheat = Image.open(os.path.join(src, "Wheat.png")).convert("RGBA")
    for i, stalk in enumerate(split_band(trimmed(wheat))):
        save(stalk, f"prop_wheat_{i}.png")


# Sheets that already sit on a clean grid go straight through - Phaser reads a
# grid row-major, so they need no rearranging.
PASSTHROUGH = {
    "campfire.png": "Animated Sprites/Campfire sheet.png",      # 40 x 32x32
    "portal.png": "Animated Sprites/GandalfHardcore Portal sheet.png",  # 10 x 64x64
    "sky_sun.png": "sun.png",
}
# One row of Torch.png is one torch burning; row 1 is the wall bracket, row 2
# the standing torch.
TORCH_ROWS = {"torch_wall": 1, "torch": 2}
SKY_BITS = {
    "bird_a": "birds1.png", "bird_b": "birds2.png",
    "bird_c": "birds3.png", "bird_d": "birds4.png",
    "cloud_a": "cloud2.png", "cloud_b": "cloud3.png",
    "cloud_c": "cloud4.png", "cloud_d": "cloud5.png",
}


def build_animated(src):
    for out_name, fn in PASSTHROUGH.items():
        save(Image.open(os.path.join(src, fn)).convert("RGBA"), out_name)

    torch = Image.open(os.path.join(src, "Torch.png")).convert("RGBA")
    for name, row in TORCH_ROWS.items():
        save(torch.crop((0, row * TILE, torch.width, (row + 1) * TILE)), f"{name}.png")

    for name, fn in SKY_BITS.items():
        save(trimmed(Image.open(os.path.join(src, fn)).convert("RGBA")), f"{name}.png")


# Which chapter gets which season. Chapter 2's backdrop comes from the
# BACKGROUND_FOREST pack instead (see pack_forest.py), so it only takes tiles.
CHAPTERS = [
    ("valley", "Autumn BG", "autumn"),
    ("snow", "Winter BG", "winter"),
    ("night", None, "green"),
]


# The HP bar pack: a frame with two holes and a ring, plus the three fills
# that sit behind it. The offsets are where each fill lines up inside it.
HUD_PARTS = {
    "hud_frame": ("Hp bar.png", None),
    "hud_orb": ("red bar.png", (1, 4)),
    "hud_bar_armour": ("yellow bar.png", (66, 47)),
    "hud_bar_time": ("Blue bar.png", (64, 55)),
}


def build_hud(hp_src):
    for name, (fn, _) in HUD_PARTS.items():
        save(Image.open(os.path.join(hp_src, fn)).convert("RGBA"), f"{name}.png")


def main(src):
    sheet = tiles(src)
    for theme, bg_dir, season in CHAPTERS:
        if bg_dir:
            build_parallax(src, bg_dir, theme)
        build_terrain(sheet, season, theme)
        build_platform(sheet, season, theme)
    build_props(src)
    build_animated(src)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: pack_gandalf.py "<GandalfHardcore assets folder>" '
                 '["<GandalfHardcore Hp bar folder>"]')
    main(sys.argv[1])
    if len(sys.argv) > 2:
        build_hud(sys.argv[2])
