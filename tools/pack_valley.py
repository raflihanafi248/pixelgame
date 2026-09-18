#!/usr/bin/env python3
"""Turns the 'Pixel Valley - Revamp' pack into the chapter 1 (valley) theme.

The pack ships parallax layers, a 16px terrain tileset and a pile of props.
This script cuts and composes exactly what the game needs, at the same pixel
scale as the rest of the art (one source pixel = 2 screen pixels), so the
valley theme sits alongside the generated themes without looking chunkier.

Usage:
    python3 tools/pack_valley.py "<path to 'Pixel Valley Revamp' folder>"
"""

import os
import random
import sys

from PIL import Image

SCALE = 2
TILE = 16  # the pack's terrain grid

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

# Terrain tiles, by pixel position in Enviroment.png. Rows 4-7 of the rust
# block are the filled variant (rows 0-3 have hollow centres, which would show
# the sky through the ground).
TOP_A = (16, 64)
TOP_B = (64, 64)
FILL = (80, 112)  # the one genuinely flat soil tile in the sheet

def save(img, name, scale=SCALE):
    if scale > 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(os.path.join(OUT, name))
    print(f"wrote {name} {img.size}")

def tile_at(env, pos):
    x, y = pos
    return env.crop((x, y, x + TILE, y + TILE))

def gen_sky():
    """The pack has no sky, so build a golden-hour gradient for the silhouettes
    to sit against - it only shows through the gap between the two layers."""
    w, h = 480, 270
    img = Image.new("RGBA", (w, h))
    px = img.load()
    top, mid, bot = (250, 231, 183), (243, 199, 129), (206, 141, 84)
    for y in range(h):
        t = y / (h - 1)
        if t < 0.55:
            k = t / 0.55
            c = tuple(int(top[i] * (1 - k) + mid[i] * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            c = tuple(int(mid[i] * (1 - k) + bot[i] * k) for i in range(3))
        for x in range(w):
            px[x, y] = c + (255,)
    save(img, "sky_valley.png")

def gen_layers(src):
    """Both parallax layers already loop horizontally, so they only need
    scaling to match the game's pixel size."""
    for filename, out in [("Background.png", "far_valley.png"),
                          ("Midleground.png", "near_valley.png")]:
        img = Image.open(os.path.join(src, filename)).convert("RGBA")
        save(img, out)

def speckle(img, seed=0):
    """The pack's soil tile is a single flat colour; a little grit stops a
    whole level of it from reading as a blank slab."""
    rnd = random.Random(seed)
    px = img.load()
    for _ in range(img.width * img.height // 11):
        x, y = rnd.randrange(img.width), rnd.randrange(img.height)
        r, g, b, a = px[x, y]
        if a < 250:
            continue
        k = rnd.choice((-8, -5, 7, 12))
        px[x, y] = (max(0, min(255, r + k)), max(0, min(255, g + k)),
                    max(0, min(255, b + k)), a)
    return img

def gen_ground(env):
    """A 32x32 block: two different grass-topped tiles over flat soil, so the
    surface does not visibly repeat every tile."""
    g = Image.new("RGBA", (TILE * 2, TILE * 2), (0, 0, 0, 0))
    g.paste(tile_at(env, TOP_A), (0, 0))
    g.paste(tile_at(env, TOP_B), (TILE, 0))
    fill = speckle(tile_at(env, FILL).copy(), seed=3)
    g.paste(fill, (0, TILE))
    g.paste(speckle(tile_at(env, FILL).copy(), seed=9), (TILE, TILE))
    save(g, "ground_valley.png")

def gen_ground_deep(env):
    """Soil only, for the rows under the surface tile."""
    g = Image.new("RGBA", (TILE * 2, TILE * 2), (0, 0, 0, 0))
    for i, pos in enumerate([(0, 0), (TILE, 0), (0, TILE), (TILE, TILE)]):
        g.paste(speckle(tile_at(env, FILL).copy(), seed=20 + i), pos)
    save(g, "ground_valley_deep.png")

def gen_platform(env):
    """96x28 to match the other themes' platform sprite exactly, so level
    geometry and the one-way collision boxes stay unchanged."""
    p = Image.new("RGBA", (96, 32), (0, 0, 0, 0))
    for i in range(6):
        p.paste(tile_at(env, TOP_A if i % 2 == 0 else TOP_B), (i * TILE, 0))
        p.paste(speckle(tile_at(env, FILL).copy(), seed=i), (i * TILE, TILE))
    save(p.crop((0, 0, 96, 28)), "platform_valley.png")

def cut(env, box, name):
    """Crop a prop and trim the transparent margin so it can be placed by its
    own footprint rather than by a padded box."""
    piece = env.crop(box)
    bbox = piece.getbbox()
    if bbox:
        piece = piece.crop(bbox)
    save(piece, name)
    return piece.size

def gen_props(env):
    cut(env, (440, 0, 610, 180), "valley_tree.png")     # the big oak
    cut(env, (392, 110, 472, 250), "valley_pine.png")   # tall pine
    cut(env, (290, 85, 415, 112), "valley_grass.png")   # olive grass band

def main(src):
    env = Image.open(os.path.join(src, "Enviroment.png")).convert("RGBA")
    gen_sky()
    gen_layers(src)
    gen_ground(env)
    gen_ground_deep(env)
    gen_platform(env)
    gen_props(env)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: pack_valley.py "<path to Pixel Valley Revamp folder>"')
    main(sys.argv[1])
