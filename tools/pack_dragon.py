#!/usr/bin/env python3
"""Builds chapter 5's boss sheet from the supplied dragon sprite.

The pack is a set of finished, *static* dragons - no animation frames. So the
red one is cut into the parts a dragon actually moves (wing, tail, head and
neck, legs, body) and every frame poses those parts: the wing turns about the
shoulder and foreshortens through the beat, the tail trails and whips, the neck
rears and strikes, the legs tuck in the air and plant on landing, and the whole
animal leans, bobs and breathes.

The pack also has the *same* dragon with its maw open, so the roar frames swap
in that head - recoloured from its grey palette onto the red one - rather than
faking an open jaw.

Output: assets/dragon.png, 24 frames of 288x216, in the order the game's
animations already expect: fly 0-5, roar 6-11, swoop 12-15, hurt 16-17,
death 18-21, rest 22-23.

Usage:
    python3 tools/pack_dragon.py "<the dragon sprite sheet png>"
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

SCALE = 3
CANVAS_W, CANVAS_H = 96, 72          # working space, in source pixels
FRAME_W, FRAME_H = CANVAS_W * SCALE, CANVAS_H * SCALE
BASE_AT = (20, 16)                   # where the untouched sprite sits on it

CELL_RED = (4, 71, 60, 122)          # the boss
CELL_ROAR = (69, 6, 126, 58)         # the same pose, mouth open

# Part outlines, traced over the red sprite (56x50, origin top-left).
POLYS = {
    "wing": [(21, 0), (56, 0), (56, 27), (46, 27), (38, 25), (30, 20), (23, 13)],
    "tail": [(39, 21), (48, 18), (56, 18), (56, 50), (42, 50), (35, 43), (36, 31)],
    "head": [(0, 3), (8, 0), (16, 0), (22, 4), (23, 14), (23, 25),
             (17, 31), (9, 31), (3, 25), (0, 16)],
}
LEG_TOP = 36        # body rows from here down also form the legs...
BODY_BOTTOM = 40    # ...and the body stops here, so the legs show below it

PIVOT = {"wing": (25, 13), "tail": (37, 33), "head": (20, 27),
         "legs": (25, 38), "body": (25, 36)}
ORDER = ["wing", "tail", "legs", "body", "head"]   # back to front


# ----------------------------------------------------------------- palette
def luma(px):
    return 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]


def is_gold(px):
    """Horns, teeth and the eye-glow: the one hue that must not be remapped."""
    r, g, b = px[:3]
    return r > 85 and g > 55 and b < 80 and r > b * 1.6 and g > b


def build_ramp(img, steps=48):
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
    """Push the grey dragon's head through the red one's shading, by rank."""
    data = list(img.getdata())
    solid = [i for i, p in enumerate(data) if p[3] > 0 and not is_gold(p)]
    order = sorted(solid, key=lambda i: luma(data[i]))
    out = list(data)
    for pos, i in enumerate(order):
        t = pos / max(1, len(order) - 1)
        out[i] = ramp[min(len(ramp) - 1, int(t * len(ramp)))] + (data[i][3],)
    res = Image.new("RGBA", img.size)
    res.putdata(out)
    return res


# -------------------------------------------------------------------- parts
def trimmed(sheet, box):
    c = sheet.crop(box)
    bb = c.getbbox()
    return c.crop(bb) if bb else c


def apply_mask(img, sel):
    a = np.array(img)
    a[:, :, 3] = np.where(sel, a[:, :, 3], 0)
    return Image.fromarray(a, "RGBA")


def cut_parts(base):
    w, h = base.size
    alpha = np.asarray(base)[:, :, 3] > 0
    owner = np.full((h, w), "body", dtype=object)
    for name in ("wing", "tail", "head"):
        m = Image.new("L", (w, h), 0)
        ImageDraw.Draw(m).polygon(POLYS[name], fill=255)
        owner[(np.asarray(m) > 0) & alpha] = name

    parts = {n: apply_mask(base, owner == n) for n in ("wing", "tail", "head")}
    body_sel = owner == "body"
    legs_sel = body_sel.copy()
    legs_sel[:LEG_TOP, :] = False        # legs overlap the body by four rows,
    core_sel = body_sel.copy()           # so the hip joint never shows a tear
    core_sel[BODY_BOTTOM:, :] = False
    parts["legs"] = apply_mask(base, legs_sel)
    parts["body"] = apply_mask(base, core_sel)
    return parts


def align_heads(base, roar):
    """Offset that lines the roaring sprite up with the red one, scored on the
    body and wing only - the heads are meant to differ."""
    ba = np.asarray(base)[:, :, 3] > 0
    oa = np.asarray(roar)[:, :, 3] > 0
    best, off = -1, (0, 0)
    for dy in range(-3, 4):
        for dx in range(-4, 5):
            ys = slice(max(0, dy), min(ba.shape[0], oa.shape[0] + dy))
            hits = 0
            for y in range(ys.start, ys.stop):
                for x in range(24, ba.shape[1]):
                    sx, sy = x - dx, y - dy
                    if 0 <= sx < oa.shape[1] and 0 <= sy < oa.shape[0] \
                            and ba[y, x] and oa[sy, sx]:
                        hits += 1
            if hits > best:
                best, off = hits, (dx, dy)
    return off


# ------------------------------------------------------------------- posing
def place(canvas, img, pivot, at, rot=0.0, sx=1.0, sy=1.0, dx=0.0, dy=0.0):
    """Rotate and scale a part about its own joint, then set that joint down at
    `at` on the canvas. Working in source pixels keeps every part on the same
    grid, so nothing drifts a half-pixel out of its socket."""
    if sx != 1.0 or sy != 1.0:
        nw, nh = max(1, round(img.width * sx)), max(1, round(img.height * sy))
        img = img.resize((nw, nh), Image.NEAREST)
        pivot = (pivot[0] * sx, pivot[1] * sy)
    px, py = pivot
    if rot:
        pad = int(max(img.size))
        big = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2))
        big.alpha_composite(img, (pad, pad))
        img = big.rotate(rot, resample=Image.NEAREST, center=(pad + px, pad + py))
        px, py = pad + px, pad + py
    canvas.alpha_composite(img, (int(round(at[0] + dx - px)), int(round(at[1] + dy - py))))


def rotate_about(point, origin, deg):
    a = math.radians(-deg)
    dx, dy = point[0] - origin[0], point[1] - origin[1]
    return (origin[0] + dx * math.cos(a) - dy * math.sin(a),
            origin[1] + dx * math.sin(a) + dy * math.cos(a))


def frame(parts, pose, lean=0.0, shift=(0, 0), squash=1.0, head_img=None):
    """One animation frame: pose every part, then lean the whole animal."""
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    origin = (BASE_AT[0] + PIVOT["body"][0] + shift[0],
              BASE_AT[1] + PIVOT["body"][1] + shift[1])
    for name in ORDER:
        p = dict(pose.get(name, {}))
        img = head_img if (name == "head" and head_img is not None) else parts[name]
        # Where this joint sits before the body moves...
        at = (BASE_AT[0] + PIVOT[name][0] + shift[0],
              BASE_AT[1] + (PIVOT[name][1] - PIVOT["body"][1]) * squash
              + PIVOT["body"][1] + shift[1])
        # ...and where the lean carries it.
        at = rotate_about(at, origin, lean)
        p["rot"] = p.get("rot", 0.0) + lean
        p["sy"] = p.get("sy", 1.0) * squash
        place(canvas, img, PIVOT[name], at, **p)
    return canvas.resize((FRAME_W, FRAME_H), Image.NEAREST)


# ------------------------------------------------------------------ the set
def build_frames(parts, roar_head):
    out = []

    # --- fly 0-5: airborne, legs tucked, one full wingbeat.
    beat = [(-38, 0.70), (-12, 0.88), (14, 1.00), (26, 0.94), (2, 0.90), (-24, 0.76)]
    lift = [2, 0, -3, -4, -1, 1]
    for i, (wr, wsx) in enumerate(beat):
        out.append(frame(parts, {
            "wing": {"rot": wr, "sx": wsx},
            "tail": {"rot": 7 - i * 2.4},
            "head": {"rot": -4 + math.sin(i) * 3},
            "legs": {"rot": -7, "dy": -5, "dx": 3},
        }, lean=-6, shift=(0, -16 + lift[i])))

    # --- roar 6-11: rear back, then throw the head forward and breathe.
    # The fire leaves on frame 4 of this run, which is where the jaw is widest.
    roar = [
        (dict(wing={"rot": 18, "sx": 1.02}, head={"rot": -12}, tail={"rot": -6},
              legs={"rot": -2, "dy": -1}), -4, (0, -12), None),
        (dict(wing={"rot": 34, "sx": 1.06}, head={"rot": -24}, tail={"rot": -12},
              legs={"rot": -3, "dy": -2}), -9, (0, -14), None),
        (dict(wing={"rot": 30, "sx": 1.04}, head={"rot": -18}, tail={"rot": -10},
              legs={"rot": -3, "dy": -2}), -7, (0, -13), True),
        (dict(wing={"rot": 12, "sx": 0.96}, head={"rot": 6}, tail={"rot": 2},
              legs={"rot": -3, "dy": -2}), 2, (2, -13), True),
        (dict(wing={"rot": -4, "sx": 0.9}, head={"rot": 16}, tail={"rot": 10},
              legs={"rot": -4, "dy": -2}), 6, (4, -13), True),
        (dict(wing={"rot": 6, "sx": 0.95}, head={"rot": 8}, tail={"rot": 4},
              legs={"rot": -3, "dy": -2}), 3, (2, -13), True),
    ]
    for pose, lean, shift, open_maw in roar:
        out.append(frame(parts, pose, lean=lean, shift=shift,
                         head_img=roar_head if open_maw else None))

    # --- swoop 12-15: wings swept back, pitched into the dive.
    for i, flick in enumerate([46, 52, 44, 50]):
        out.append(frame(parts, {
            "wing": {"rot": flick, "sx": 0.54},
            "tail": {"rot": -16 + i * 1.5},
            "head": {"rot": 10},
            "legs": {"rot": -9, "dy": -7, "dx": 4},
        }, lean=-19, shift=(0, -18)))

    # --- hurt 16-17: thrown back, wings splayed.
    out.append(frame(parts, {"wing": {"rot": 40, "sx": 1.06}, "head": {"rot": -26},
                             "tail": {"rot": -14}, "legs": {"rot": -5, "dy": -4}},
                     lean=11, shift=(-4, -14)))
    out.append(frame(parts, {"wing": {"rot": 22, "sx": 1.0}, "head": {"rot": -14},
                             "tail": {"rot": -7}, "legs": {"rot": -3, "dy": -3}},
                     lean=5, shift=(-2, -14)))

    # --- death 18-21: the wings give out, the head goes down, it settles.
    out.append(frame(parts, {"wing": {"rot": -26, "sx": 0.92}, "head": {"rot": -20},
                             "tail": {"rot": -8}, "legs": {"rot": -2, "dy": -2}},
                     lean=7, shift=(0, -10)))
    out.append(frame(parts, {"wing": {"rot": -6, "sx": 0.96}, "head": {"rot": 14},
                             "tail": {"rot": 6}, "legs": {"rot": 4}},
                     lean=13, shift=(-2, -4)))
    out.append(frame(parts, {"wing": {"rot": 2, "sx": 0.98}, "head": {"rot": 34},
                             "tail": {"rot": 14}, "legs": {"rot": 10}},
                     lean=20, shift=(-4, 2), squash=0.93))
    out.append(frame(parts, {"wing": {"rot": 4, "sx": 0.9}, "head": {"rot": 46},
                             "tail": {"rot": 20}, "legs": {"rot": 14}},
                     lean=25, shift=(-6, 5), squash=0.84))

    # --- rest 22-23: perched, breathing.
    out.append(frame(parts, {}))
    out.append(frame(parts, {"wing": {"rot": -4}, "tail": {"rot": 3},
                             "head": {"rot": 2}}, shift=(0, 1), squash=1.02))
    return out


def main(src):
    sheet = Image.open(src).convert("RGBA")
    base = trimmed(sheet, CELL_RED)
    roar = trimmed(sheet, CELL_ROAR)

    parts = cut_parts(base)

    # The open maw, recoloured onto the red dragon and lined up with its neck.
    roar_red = remap(roar, build_ramp(base))
    dx, dy = align_heads(base, roar_red)
    head_canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    head_canvas.alpha_composite(roar_red, (dx, dy))
    head_mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(head_mask).polygon(POLYS["head"], fill=255)
    roar_head = apply_mask(head_canvas, np.asarray(head_mask) > 0)

    frames = build_frames(parts, roar_head)
    sheet_out = Image.new("RGBA", (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet_out.alpha_composite(f, (i * FRAME_W, 0))
    sheet_out.save(os.path.join(OUT, "dragon.png"))
    print(f"wrote dragon.png {sheet_out.size} ({len(frames)} frames "
          f"of {FRAME_W}x{FRAME_H}), head offset {(dx, dy)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: pack_dragon.py "<the dragon sprite sheet png>"')
    main(sys.argv[1])
