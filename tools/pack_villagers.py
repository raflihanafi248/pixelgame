#!/usr/bin/env python3
"""Cuts the GREEN WOODS characters into the game's NPCs and villagers.

The sheet holds six people, three idle frames each, drawn in one five-step
green ramp. That ramp is what makes them re-colourable: every pixel is one of
five known values, so giving a character a palette is a straight substitution
and the shading survives untouched.

Each person also yields a portrait for the dialogue box, cropped from their own
head so the face in the box is the face on the road.

Usage:
    python3 tools/pack_villagers.py "<path to the GREEN_WOODS folder>"
"""

import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")

SCALE = 2           # source pixel -> screen pixels, same as the knight
FRAME_W, FRAME_H = 96, 120
PORTRAIT = 96

# The sheet's five-step ramp, darkest first.
RAMP = [(11, 49, 44), (33, 67, 59), (59, 89, 81), (110, 131, 121), (237, 241, 221)]

# Where each person's three frames sit in Characters.png.
PEOPLE = {
    "young":  [(132, 52, 146, 104), (190, 52, 204, 104), (238, 52, 252, 104)],
    "woman":  [(305, 52, 323, 104), (358, 52, 375, 104), (411, 52, 428, 104)],
    "old":    [(131, 132, 145, 188), (189, 132, 203, 188), (237, 132, 251, 188)],
    "farmer": [(287, 132, 324, 188), (354, 132, 391, 188), (402, 132, 439, 188)],
    "child":  [(155, 214, 167, 270), (203, 214, 215, 270), (235, 214, 247, 270)],
    "scythe": [(286, 214, 320, 270), (356, 214, 388, 270), (404, 214, 440, 270)],
}

# Who each person becomes, and the palette that makes them that person.
# Each palette is five colours, darkest to lightest, replacing RAMP in order.
CAST = {
    # --- the people the story stops for
    "maren":  ("old", [(38, 40, 58), (66, 70, 96), (102, 108, 138),
                       (198, 194, 186), (242, 238, 230)]),
    "bram":   ("farmer", [(44, 32, 22), (92, 62, 38), (140, 102, 58),
                          (200, 160, 104), (240, 202, 162)]),
    "merchant": ("scythe", [(40, 28, 34), (92, 48, 48), (146, 84, 62),
                            (198, 152, 108), (242, 206, 168)]),
    "gethin": ("young", [(26, 34, 52), (52, 68, 98), (86, 110, 148),
                         (170, 184, 206), (240, 214, 186)]),
    "yvane":  ("woman", [(44, 26, 38), (98, 44, 56), (152, 74, 82),
                         (208, 150, 134), (242, 214, 192)]),
    # --- the people who just live here
    "villager_child": ("child", [(42, 38, 28), (82, 86, 52), (124, 132, 78),
                                 (196, 188, 140), (244, 214, 180)]),
    "villager_man":   ("young", [(38, 30, 24), (84, 64, 44), (128, 104, 70),
                                 (190, 172, 138), (242, 210, 176)]),
    "villager_woman": ("woman", [(28, 38, 44), (54, 78, 88), (88, 120, 130),
                                 (178, 196, 198), (244, 216, 194)]),
    "villager_hand":  ("farmer", [(34, 34, 40), (70, 70, 80), (108, 108, 120),
                                  (176, 172, 168), (238, 210, 178)]),
    "villager_old":   ("old", [(36, 30, 34), (74, 58, 62), (112, 92, 92),
                               (192, 180, 172), (240, 232, 224)]),
}


def recolour(img, palette):
    lut = {RAMP[i]: palette[i] for i in range(5)}
    out = []
    for r, g, b, a in img.getdata():
        if a < 8:
            out.append((0, 0, 0, 0))
            continue
        # Semi-transparent edge pixels use the same ramp, so match on rgb only.
        out.append(lut.get((r, g, b), (r, g, b)) + (a,))
    res = Image.new("RGBA", img.size)
    res.putdata(out)
    return res


def build_sheet(sheet, who, palette, name):
    """Three frames, each scaled and stood on the bottom of its cell so every
    NPC's feet land on the same line however tall they are."""
    out = Image.new("RGBA", (FRAME_W * 3, FRAME_H), (0, 0, 0, 0))
    for i, box in enumerate(PEOPLE[who]):
        cell = sheet.crop(box)
        bb = cell.getbbox()
        if bb:
            cell = cell.crop(bb)
        cell = recolour(cell, palette)
        cell = cell.resize((cell.width * SCALE, cell.height * SCALE), Image.NEAREST)
        x = i * FRAME_W + (FRAME_W - cell.width) // 2
        out.alpha_composite(cell, (x, FRAME_H - cell.height))
    out.save(os.path.join(OUT, f"npc_{name}.png"))
    print(f"wrote npc_{name}.png {out.size}")


def build_portrait(sheet, who, palette, name):
    """The head and shoulders from the first frame, on a plain dark panel."""
    cell = sheet.crop(PEOPLE[who][0])
    bb = cell.getbbox()
    if bb:
        cell = cell.crop(bb)
    cell = recolour(cell, palette)
    head = cell.crop((0, 0, cell.width, min(cell.height, 20)))
    k = max(1, min(PORTRAIT // max(1, head.width), PORTRAIT // max(1, head.height)))
    head = head.resize((head.width * k, head.height * k), Image.NEAREST)

    panel = Image.new("RGBA", (PORTRAIT, PORTRAIT), (18, 14, 22, 255))
    for y in range(PORTRAIT):                    # a soft vignette behind them
        t = y / (PORTRAIT - 1)
        shade = int(26 + 18 * (1 - t))
        for x in range(PORTRAIT):
            panel.putpixel((x, y), (shade, shade - 4, shade + 6, 255))
    panel.alpha_composite(head, ((PORTRAIT - head.width) // 2,
                                 PORTRAIT - head.height))
    panel.save(os.path.join(OUT, f"portrait_{name}.png"))
    print(f"wrote portrait_{name}.png {panel.size}")


def main(src):
    sheet = Image.open(os.path.join(src, "Characters.png")).convert("RGBA")
    for name, (who, palette) in CAST.items():
        build_sheet(sheet, who, palette, name)
        build_portrait(sheet, who, palette, name)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: pack_villagers.py "<path to the GREEN_WOODS folder>"')
    main(sys.argv[1])
