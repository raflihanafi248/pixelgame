#!/usr/bin/env python3
"""Builds chapter 5's boss sheet from the supplied dragon sprite.

The pack is a set of finished, *static* dragons - no animation frames. So the
red one is cut into the parts a dragon actually moves (wing, tail, head and
neck, legs, body) and each frame poses those parts: the wing rotates about the
shoulder and foreshortens through the beat, the tail trails and whips, the neck
rears and strikes, the legs tuck in the air and plant on landing, and the whole
body leans, bobs and breathes.

The pack also has the *same* dragon with its maw open, so the roar frames swap
in that head - recoloured from its grey palette onto the red one - instead of
faking an open jaw.

Output: assets/dragon.png, 24 frames of 256x192, in the order the game's
animations already expect (fly 0-5, roar 6-11, swoop 12-15, hurt 16-17,
death 18-21, rest 22-23).

Usage:
    python3 tools/pack_dragon.py "<path to the dragon sprite sheet png>"
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

FRAME_W, FRAME_H = 256, 192
SCALE = 3                 # source pixel -> screen pixels
FEET_Y = 178              # where the base pose's feet sit inside a frame
CENTRE_X = 120            # where the base pose's body centre sits

# Cells in the supplied sheet. The red dragon is the boss; the grey one is the
# same pose with its mouth open and donates its head for the roar.
CELL_RED = (4, 71, 60, 122)
CELL_ROAR = (69, 6, 126, 58)

# Part outlines, traced over the red sprite (56x50, origin top-left).
POLYS = {
    "wing": [(21, 0), (56, 0), (56, 27), (46, 27), (38, 25), (30, 20), (23, 13)],
    "tail": [(39, 21), (48, 18), (56, 18), (56, 50), (42, 50), (35, 43), (36, 31)],
    "head": [(0, 3), (8, 0), (16, 0), (22, 4), (23, 14), (23, 25),
             (17, 31), (9, 31), (3, 25), (0, 16)],
}
LEG_TOP = 36        # body rows from here down also form the legs
BODY_BOTTOM = 40    # ...and the body itself stops here, so the legs show

# Joints, in source pixels.
PIVOT = {
    "wing": (25, 13),
    "tail": (37, 33),
    "head": (20, 27),
    "legs": (25, 38),
    "body": (25, 36),
}
# Painting order: back to front.
ORDER = ["wing", "tail", "legs", "body", "head"]


# ----------------------------------------------------------------- palette
def luma(px):
    return 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]


def is_gold(px):
    """Horns, teeth and the eye-glow: the one hue that must not be remapped."""
    r, g, b = px[:3]
    return r > 85 and g > 55 and b < 80 and r > b * 1.6 and g > b


def build_ramp(img, steps=64):
    """A luminance -> colour ramp taken from the red dragon's own shading."""
    px = [p for p in img.getdata() if p[3] > 0 and not is_gold(p)]
    px.sort(key=luma)
    ramp = []
    for i in range(steps):
        lo = int(i * len(px) / steps)
        hi = max(lo + 1, int((i + 1) * len(px) / steps))
        chunk = px[lo:hi]
        ramp.append(tuple(int(sum(c[j] for c in chunk) / len(chunk)) for j in range(3)))
    return ramp


def remap(img, ramp):
    """Push another palette's sprite through that ramp, by luminance rank."""
    data = list(img.getdata())
    solid = [p for p in data if p[3] > 0 and not is_gold(p)]
    order = sorted(range(len(solid)), key=lambda i: luma(solid[i]))
    rank = [0] * len(solid)
    for pos, i in enumerate(order):
        rank[i] = pos
    out, k = [], 0
    for p in data:
        if p[3] == 0 or is_gold(p):
            out.append(p)
            continue
        t = rank[k] / max(1, len(solid) - 1)
        k += 1
        out.append(ramp[min(len(ramp) - 1, int(t * len(ramp)))] + (p[3],))
    res = Image.new("RGBA", img.size)
    res.putdata(out)
    return res


# -------------------------------------------------------------------- parts
def cut(sheet, box):
    c = sheet.crop(box)
    return c.crop(c.getbbox())


def part_masks(base):
    w, h = base.size
    alpha = np.asarray(base)[:, :, 3] > 0
    owner = np.full((h, w), "body", dtype=object)
    for name in ("wing", "tail", "head"):
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon(POLYS[name], fill=255)
        owner[(np.asarray(m) > 0) & alpha] = name

    parts = {}
    for name in ("wing", "tail", "head"):
        parts[name] = apply_mask(base, owner == name)
    body_sel = owner == "body"
    legs_sel = body_sel.copy()
    legs_sel[:LEG_TOP, :] = False
    core_sel = body_sel.copy()
    core_sel[BODY_BOTTOM:, :] = False
    parts["legs"] = apply_mask(base, legs_sel)
    parts["body"] = apply_mask(base, core_sel)
    return parts


def apply_mask(img, sel):
    a = np.array(img)
    a[:, :, 3] = np.where(sel, a[:, :, 3], 0)
    return Image.fromarray(a, "RGBA")


def align(base, other):
    """Find the offset that best lines the roaring sprite up with the red one,
    scored on the body and wing only - the heads are meant to differ."""
    ba = np.asarray(base)[:, :, 3] > 0
    oa = np.asarray(other)[:, :, 3] > 0
    best, bestoff = -1, (0, 0)
    for dy in range(-3, 4):
        for dx in range(-4, 5):
            hits = 0
            for y in range(ba.shape[0]):
                sy = y - dy
                if not 0 <= sy < oa.shape[0]:
                    continue
                for x in range(24, ba.shape[1]):     # body + wing, not the head
                    sx = x - dx
                    if 0 <= sx < oa.shape[1] and ba[y, x] and oa[sy, sx]:
                        hits += 1
            if hits > best:
                best, bestoff = hits, (dx, dy)
    return bestoff


# ------------------------------------------------------------------- posing
def pose_part(img, pivot, rot=0.0, sx=1.0, sy=1.0, dx=0.0, dy=0.0):
    """Rotate/scale a part about its joint, and report where the joint ended up.

    Everything is done on the upscaled part so the rotation does not chew the
    small source pixels; the caller composites by the returned joint.
    """
    big = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
    px, py = pivot[0] * SCALE, pivot[1] * SCALE
    if sx != 1.0 or sy != 1.0:
        nw, nh = max(1, round(big.width * sx)), max(1, round(big.height * sy))
        big = big.resize((nw, nh), Image.BICUBIC)
        px, py = px * sx, py * sy
    if rot:
        # Rotate about the joint by putting the joint at the image centre first.
        cx, cy = big.width / 2, big.height / 2
        pad = int(max(big.size) * 0.8)
        canvas = Image.new("RGBA", (big.width + pad * 2, big.height + pad * 2))
        canvas.alpha_composite(big, (pad, pad))
        canvas = canvas.rotate(rot, resample=Image.BICUBIC,
                               center=(pad + px, pad + py))
        big = canvas
        px, py = pad + px, pad + py
    return big, (px - dx * SCALE, py - dy * SCALE)


def compose(parts, pose, body_shift=(0, 0), body_rot=0.0, body_scale=(1.0, 1.0)):
    """Lay the five parts into one 256x192 frame."""
    frame = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    for name in ORDER:
        p = pose.get(name, {})
        img, joint = pose_part(parts[name], PIVOT[name], **p)
        jx = CENTRE_X + (PIVOT[name][0] - PIVOT["body"][0]) * SCALE * body_scale[0]
        jy = FEET_Y + (PIVOT[name][1] - 50) * SCALE * body_scale[1]
        if body_rot:
            ox, oy = jx - CENTRE_X, jy - (FEET_Y - (50 - PIVOT["body"][1]) * SCALE)
            a = math.radians(-body_rot)
            jx = CENTRE_X + ox * math.cos(a) - oy * math.sin(a)
            jy = (FEET_Y - (50 - PIVOT["body"][1]) * SCALE) + ox * math.sin(a) + oy * math.cos(a)
        jx += body_shift[0]
        jy += body_shift[1]
        if body_rot:
            img = img.rotate(body_rot, resample=Image.BICUBIC, expand=True)
            joint = rotated_point(joint, body_rot, img.size, p)
        frame.alpha_composite(img, (int(round(jx - joint[0])), int(round(jy - joint[1]))))
    return frame


def rotated_point(joint, rot, newsize, _p):
    """Where a point lands after PIL's expanding rotate."""
    # PIL rotates about the old centre, then expands around the new bounds.
    return (newsize[0] / 2 + (joint[0] - newsize[0] / 2), newsize[1] / 2 + (joint[1] - newsize[1] / 2))
