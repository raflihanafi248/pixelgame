#!/usr/bin/env python3
"""Builds chapter 5's boss out of the free_cthulu pack.

The pack ships seven animations as loose 192x112 PNGs - idle, walk, fly,
1atk, 2atk, hurt and death - and nothing else. This turns them into the four
things the game needs:

  cthulhu.png          all 65 frames on one sheet, laid out nine to a row so
                       every animation's frames stay contiguous
  cthulhu_bolt.png     the green lance from 1atk, cut away from the body so
                       it can fly on its own as a projectile
  cthulhu_rift.png     the tentacles from 2atk, turned on their side so they
                       come up out of the floor instead of out in front
  portrait_cthulhu.png its face, for the one conversation it has

Nothing here is drawn from scratch: the lance and the rift are the pack's own
pixels re-cut, so the palette can never drift away from the sprite.

Usage:
    python3 tools/pack_cthulhu.py <path to free_cthulu>
"""

import os
import sys

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

FRAME_W, FRAME_H = 192, 112
COLS = 9

# The order the sheet is packed in, and the frame count of each. The game's
# animation ranges are derived from this, so the two can never fall apart.
ANIMS = [("idle", 15), ("walk", 12), ("fly", 6), ("1atk", 7),
         ("2atk", 9), ("hurt", 5), ("death", 11)]

BODY_RIGHT = 126     # the body never reaches past here; everything beyond is
                     # reach - the lance in 1atk, the tentacles in 2atk


def load(root, anim, n):
    path = os.path.join(root, "animations", "PNG", anim, f"{anim}_{n}.png")
    im = Image.open(path).convert("RGBA")
    if im.size != (FRAME_W, FRAME_H):
        raise SystemExit(f"{path}: expected {FRAME_W}x{FRAME_H}, got {im.size}")
    return im


def is_energy(arr):
    """The lance is the only thing in the pack that is bright and green. The
    body's greens are all either dark or as blue as they are green, so one
    threshold separates the two cleanly."""
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    return (arr[..., 3] > 8) & (g >= 90) & (g - b >= 35)


def masked(im, keep):
    out = np.array(im)
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return Image.fromarray(out)


# --------------------------------------------------------------- the sheet
def build_sheet(root):
    frames = []
    for anim, count in ANIMS:
        for n in range(1, count + 1):
            frames.append(load(root, anim, n))

    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (FRAME_W * COLS, FRAME_H * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, ((i % COLS) * FRAME_W, (i // COLS) * FRAME_H))
    sheet.save(os.path.join(OUT, "cthulhu.png"))

    start = 0
    ranges = []
    for anim, count in ANIMS:
        ranges.append(f"{anim} {start}-{start + count - 1}")
        start += count
    print(f"wrote cthulhu.png {sheet.size} ({len(frames)} frames of "
          f"{FRAME_W}x{FRAME_H}, {COLS} per row)")
    print("  ", ", ".join(ranges))


# ---------------------------------------------------------------- the lance
# The wings are lit the same bright green as the lance, so the cut has to
# clear them as well as the body: past the claw, and only the rows the lance
# itself travels in.
BOLT_BOX = (148, 46, 190, 74)             # 42x28


def build_bolt(root):
    """1atk throws a green lance forward over four frames and lets it break
    up. Cut clear of the wings and you have a projectile that already has a
    head, a body and a tail, plus two frames of it coming apart on impact -
    no drawing required."""
    out = []
    for n in (3, 4, 5, 6):
        im = load(root, "1atk", n)
        arr = np.array(im)
        im = masked(im, is_energy(arr))
        out.append(im.crop(BOLT_BOX))

    w, h = out[0].size
    sheet = Image.new("RGBA", (w * len(out), h), (0, 0, 0, 0))
    for i, f in enumerate(out):
        sheet.alpha_composite(f, (i * w, 0))
    sheet.save(os.path.join(OUT, "cthulhu_bolt.png"))
    print(f"wrote cthulhu_bolt.png {sheet.size} ({len(out)} frames of {w}x{h})")
    return w, h


# ----------------------------------------------------------------- the rift
RIFT_W, RIFT_H = 48, 96
TENT_BOX = (BODY_RIGHT, 36, 190, 74)      # 64x38, the whips and nothing else
GLOW = [(13, 94, 65), (20, 111, 54), (51, 143, 47), (118, 187, 57), (151, 232, 72)]


def tentacle_column(root, n):
    """One frame of the 2atk lash, stood on end so the tips point at the sky."""
    im = load(root, "2atk", n).crop(TENT_BOX)
    return im.transpose(Image.ROTATE_90)   # tips were to the right, now up


def rim_light(im, colour, alpha=200):
    """The whips are almost black, which is fine out in front of a lit body
    and useless coming out of an unlit floor. Trace the silhouette in the
    lance's own green so they read against the dark."""
    a = np.array(im)
    solid = a[..., 3] > 8
    grown = np.zeros_like(solid)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            shifted = np.roll(np.roll(solid, dy, 0), dx, 1)
            # np.roll wraps, which would post a stray rim on the far edge.
            if dy > 0:
                shifted[:dy] = False
            elif dy < 0:
                shifted[dy:] = False
            if dx > 0:
                shifted[:, :dx] = False
            elif dx < 0:
                shifted[:, dx:] = False
            grown |= shifted
    rim = grown & ~solid
    a[rim] = (*colour, alpha)
    return Image.fromarray(a)


def build_rift_frames(root):
    """Six frames of the floor splitting open and the wood's own roots - which
    is what the villagers have always told each other they are - coming up
    through it."""
    cols = [rim_light(tentacle_column(root, n), GLOW[3])
            for n in (4, 5, 6, 7)]
    cw, ch = cols[0].size

    # How far out of the ground the whips are on each frame, and how hard the
    # crack under them is burning.
    RISE = [0.0, 0.0, 0.55, 1.0, 1.0, 0.7]
    LIT = [0.35, 0.85, 1.0, 1.0, 0.85, 0.4]

    frames = []
    for i in range(6):
        canvas = Image.new("RGBA", (RIFT_W, RIFT_H), (0, 0, 0, 0))
        px = canvas.load()

        # The plume: light climbing out of the gap, brightest at the floor.
        half_top = 3 + 9 * LIT[i]
        for dy in range(int(30 * LIT[i])):
            y = RIFT_H - 1 - dy
            up = dy / max(1.0, 30 * LIT[i])
            half = half_top * (1 - up * 0.65)
            for dx in range(-int(half), int(half) + 1):
                x = RIFT_W // 2 + dx
                if not 0 <= x < RIFT_W:
                    continue
                edge = 1 - abs(dx) / (half + 1)
                a = int(150 * edge * (1 - up) ** 1.6 * LIT[i])
                if a <= 4:
                    continue
                shade = GLOW[min(len(GLOW) - 1, int(edge * 3))]
                px[x, y] = (*shade, a)

        # The crack itself: a hard bright seam right on the floor line.
        half = int(4 + 18 * LIT[i])
        for dx in range(-half, half + 1):
            x = RIFT_W // 2 + dx
            if not 0 <= x < RIFT_W:
                continue
            fade = 1 - abs(dx) / (half + 1)
            for dy in range(int(1 + 5 * fade * LIT[i])):
                y = RIFT_H - 1 - dy
                shade = GLOW[min(len(GLOW) - 1, 1 + int(fade * 3.2))]
                px[x, y] = (*shade, int(255 * min(1.0, fade * 1.6) * LIT[i]))

        if RISE[i] > 0:
            col = cols[min(len(cols) - 1, i - 2)]
            up = int(ch * RISE[i])
            part = col.crop((0, ch - up, cw, ch))       # only what has cleared
            canvas.alpha_composite(part, ((RIFT_W - cw) // 2, RIFT_H - up))

        frames.append(canvas)

    sheet = Image.new("RGBA", (RIFT_W * len(frames), RIFT_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * RIFT_W, 0))
    sheet.save(os.path.join(OUT, "cthulhu_rift.png"))
    print(f"wrote cthulhu_rift.png {sheet.size} ({len(frames)} frames of "
          f"{RIFT_W}x{RIFT_H})")


# -------------------------------------------------------------- the portrait
def build_portrait(root):
    """The face that speaks at the end is the face you fought: its head,
    lifted straight off an idle frame and stood on the same dark panel the
    villagers' portraits use."""
    # Its one lit eye sits at (96, 45) on every idle frame; the crop is hung
    # off that so the face lands where a face belongs on a portrait.
    head = load(root, "idle", 6).crop((82, 33, 114, 65))   # 32x32, face only
    lit = np.array(head).astype(int)
    lit[..., :3] = np.clip(lit[..., :3] * 1.35 + 10, 0, 255)  # dialogue is lit
    head = Image.fromarray(lit.astype(np.uint8)).resize((96, 96), Image.NEAREST)

    panel = Image.new("RGBA", (96, 96), (0, 0, 0, 255))
    for y in range(96):
        v = int(22 + 12 * (1 - y / 95))      # a colder vignette than the rest
        for x in range(96):
            panel.putpixel((x, y), (v - 6, v, v + 8, 255))
    panel.alpha_composite(head)
    panel.save(os.path.join(OUT, "portrait_cthulhu.png"))
    print("wrote portrait_cthulhu.png", panel.size)


def main(root):
    if not os.path.isdir(os.path.join(root, "animations", "PNG")):
        raise SystemExit(f"{root}: no animations/PNG in there")
    build_sheet(root)
    build_bolt(root)
    build_rift_frames(root)
    build_portrait(root)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
