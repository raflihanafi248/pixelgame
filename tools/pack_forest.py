#!/usr/bin/env python3
"""Turns the 'BACKGROUND_FOREST' pack into chapter 2's parallax layers.

The pack is one 1634x1080 scene split into nine aligned layers. The game only
draws three (a static sky, a slow far layer and a faster near layer), so the
nine are grouped by depth and flattened into those three.

Everything is scaled so the tree bases land on the game's ground line, and the
wrap seam of each scrolling layer is cross-faded so a tileSprite can repeat it
without a visible join.

A single dark forest scene in nine aligned layers is exactly what the Misted
Nightwood wants, and the game's lantern-and-darkness overlay does the rest.

Usage:
    python3 tools/pack_forest.py "<BACKGROUND_FOREST folder>"
"""

import os
import sys

from PIL import Image


OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

GAME_W, GAME_H = 960, 540
GROUND_Y = 412          # must match GROUND_Y in src/levels.js

SRC_W, SRC_H = 1634, 1080
SRC_GROUND = 693        # where the trunks meet the forest floor in the source

SCALE = GROUND_Y / SRC_GROUND                 # lands the trunks on the ground
CROP_H = int(round(GAME_H / SCALE))           # source rows the screen can show
OUT_W = int(round(SRC_W * SCALE))

# Which source layers make up each of the game's three. Back to front:
#   01 backdrop  02 haze  03 mist band  04 far bushes  05 tree line
#   06 light shafts  07 high canopy  08 grass specks  09 front bushes
GROUPS = {
    "sky_night.png":  ["01", "02", "07", "06-lights"],
    "far_night.png":  ["03", "05"],
    "near_night.png": ["04", "08", "09"],
}
SEAM = 90  # px of cross-fade used to close the horizontal wrap


def load(src, tag):
    path = os.path.join(src, "Background-layers", f"Background-forest_{tag}.png")
    return Image.open(path).convert("RGBA")


def flatten(src, tags):
    out = Image.new("RGBA", (SRC_W, SRC_H), (0, 0, 0, 0))
    for tag in tags:
        out.alpha_composite(load(src, tag))
    return out


def to_screen(img):
    """Crop to what the screen can show, then scale to the game's size."""
    img = img.crop((0, SRC_H - CROP_H, SRC_W, SRC_H))
    return img.resize((OUT_W, GAME_H), Image.LANCZOS)


def seamless(img, width=SEAM):
    """Cross-fade the right edge into the left so the layer can tile.

    The pack's layers very nearly line up already, so this only has to hide a
    few pixels of drift rather than invent new artwork.
    """
    w, h = img.size
    left = img.crop((0, 0, width, h))
    right = img.crop((w - width, 0, w, h))
    blended = right.copy()
    for x in range(width):
        k = x / (width - 1)          # 0 at the far edge, 1 where it meets left
        col_r = right.crop((x, 0, x + 1, h))
        col_l = left.crop((x, 0, x + 1, h))
        blended.paste(Image.blend(col_r, col_l, k * 0.5), (x, 0))
    img = img.copy()
    img.paste(blended, (w - width, 0))
    return img


def save(img, name):
    img.save(os.path.join(OUT, name))
    print(f"wrote {name} {img.size}")


def main(src):
    for name, tags in GROUPS.items():
        img = to_screen(flatten(src, tags))
        if name == "sky_night.png":
            # The sky never scrolls, so it is cropped to the screen instead of
            # tiled - and it must be opaque, it is the bottom of the stack.
            img = img.crop((0, 0, GAME_W, GAME_H))
            flat = Image.new("RGBA", img.size, (11, 26, 22, 255))
            flat.alpha_composite(img)
            img = flat.convert("RGB")
        else:
            img = seamless(img)
        save(img, name)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: pack_forest.py "<BACKGROUND_FOREST folder>"')
    main(sys.argv[1])
