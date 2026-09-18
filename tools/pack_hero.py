#!/usr/bin/env python3
"""Repacks the '2D SL Knight' sprite pack into the single grid sheet the
game loads (assets/hero.png).

The source pack ships one PNG per animation, each a grid of 128x64 frames.
We only need a subset, so they are copied into one 8-column grid in the
frame order the game's animation table expects.

Usage:
    python3 tools/pack_hero.py <path-to-unzipped-knight-pack>

Source art: "2D SL Knight v1.0" - licence permits editing and commercial
use, forbids reselling the asset itself.
"""

import os
import sys

from PIL import Image

FRAME_W, FRAME_H = 128, 64
COLS = 8

# (source sheet, grid cols, grid rows, frame indices to take)
SEQUENCES = [
    ("idle", "Idle.png", 2, 4, range(8)),
    ("run", "Run.png", 2, 4, range(8)),
    ("jump", "Jump.png", 2, 4, range(4)),
    ("fall", "Jump.png", 2, 4, range(4, 8)),
    ("attack1", "Attacks.png", 8, 5, range(0, 8)),
    ("attack2", "Attacks.png", 8, 5, range(8, 16)),
    ("attack3", "Attacks.png", 8, 5, range(32, 40)),
    ("airattack", "attack_from_air.png", 2, 4, range(8)),
    ("roll", "Roll.png", 2, 2, range(4)),
    ("hurt", "Hurt.png", 2, 2, range(4)),
    ("death", "Death.png", 2, 2, range(4)),
]

def load_frames(path, cols, rows):
    img = Image.open(path).convert("RGBA")
    frames = []
    for r in range(rows):
        for c in range(cols):
            frames.append(img.crop((c * FRAME_W, r * FRAME_H,
                                    (c + 1) * FRAME_W, (r + 1) * FRAME_H)))
    return frames

def main(src_dir):
    out_frames = []
    ranges = {}
    for key, filename, cols, rows, indices in SEQUENCES:
        src = load_frames(os.path.join(src_dir, filename), cols, rows)
        start = len(out_frames)
        for i in indices:
            out_frames.append(src[i])
        ranges[key] = (start, len(out_frames) - 1)

    rows_needed = (len(out_frames) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * FRAME_W, rows_needed * FRAME_H), (0, 0, 0, 0))
    for i, frame in enumerate(out_frames):
        sheet.paste(frame, ((i % COLS) * FRAME_W, (i // COLS) * FRAME_H), frame)

    out_path = os.path.join(os.path.dirname(__file__), "..", "assets", "hero.png")
    sheet.save(out_path)
    print("wrote hero.png", sheet.size, f"({len(out_frames)} frames, {COLS}x{rows_needed} grid)")
    for key, (a, b) in ranges.items():
        print(f"  {key:10s} {a:3d}-{b:3d}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: pack_hero.py <path-to-unzipped-knight-pack>")
    main(sys.argv[1])
