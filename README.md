# The Last Knight

A 2D pixel-art action platformer in five levels, built with [Phaser.js](https://phaser.io/).

## Story

You are the last of the forest wardens. The leaves are falling too early, the warden's lanterns are going out on their own, and something very old is stirring at the heart of the wood.

The trail leads you out of the autumn forest, through the mist of the nightwood, down into the ruins of a crystal cave, up to a freezing peak — and finally to the lair of the **Forest Dragon**. The dragon is no mindless monster: it recognises the crest on your shield, and it means to collect on an oath that men once broke.

The ending is deliberately left open.

## Running it

Just open `index.html` in a browser (double-click it) — every image is embedded as a data URI, so no server is needed.

If you would rather serve it:

```bash
npm start          # or: python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or `←` `→` | Move |
| `W` / `↑` / `SPACE` | Jump (hold for a higher jump) |
| `J` or `X` | Attack — three-hit sword combo, air attack while jumping |
| `SHIFT` or `L` | Dash (brief invulnerability) |
| `M` | Sound on / off |
| `ENTER` | Continue on the title and story screens |

## Levels

1. **The Autumn Wood** — a gentle opening: goblins, slimes, wolves.
2. **The Misted Nightwood** — dark, barely any sight line, wraiths start to appear.
3. **The Crystal Cave** — tiered platforming, bats, spikes.
4. **The Frozen Peak** — slippery footing and ice wolves.
5. **The Dragon's Lair** — a boss fight against a red, membrane-winged dragon: it hovers and breathes fire, dives at you, then lands exhausted — and that landing is your opening.

## Audio

Every sound is synthesised live through the Web Audio API — there is not a single audio file, so the game costs nothing extra to download and still runs from `file://`.

- **Music** is scored per level from pad layers (detuned saws through a moving filter), sub bass, an arpeggio and percussion (taiko in the lair, water drips in the cave).
- **Layered sound effects**, built the way a sound designer builds one: transient, then body, then tail. Metal clangs come from inharmonic partials; the dragon's roar is a distorted saw stack pushed through vowel-like formant filters.
- **Convolution reverb** with an impulse response generated per environment — the cave rings for 3.4 seconds and dark, snow is nearly dry at 0.9.
- **Per-surface footsteps** — leaf litter, damp earth, stone, squeaking snow, ash — triggered by distance travelled so they always match the run.
- **Stereo placement** from world position: an enemy to your left sounds to your left, and grows quieter and more muffled with distance.
- **Ambience** per level: wind through leaves, night crickets, cave drips, a snow storm, a low drone in the lair.
- Every sound is randomised slightly in pitch and level so repeats never sound identical.

## Systems

- **Health and lives** — 5 hearts, 3 lives, brief invulnerability after a hit.
- **Armour** — every enemy you defeat grants three plates of armour. While it holds (a shell around the knight, three shield pips in the HUD) hits land on the armour instead of your health. The third hit shatters it; defeat another enemy to earn it back. Pits stay lethal — armour will not save you there.
- **Checkpoints** — stone lanterns along the way; dying returns you to the last one.
- **Crystals** — collected for score along the route, and defeating enemies adds to it too.
- **Pits** — falling costs a life.

## Cheat code

Type **`123456789`** at any point during play to switch on **invincible mode** — nothing takes health off you, and falling into a pit just lifts you back to safety. Type it again to switch it off. An `INVINCIBLE` badge shows in the HUD while it is on.

## Project layout

```
index.html           the game page
src/levels.js        the five levels and their story text
src/audio.js         audio engine (music, effects, ambience, reverb)
src/entities.js      Player (combo, dash, health), Enemy, Dragon (boss)
src/scenes.js        boot, title, story cards, gameplay, game over, ending
src/main.js          Phaser configuration
src/assets_data.js   every asset as base64 (generated - do not hand-edit)
assets/              the raw PNGs
vendor/phaser.min.js Phaser, bundled locally
tools/               asset generation and packing scripts
```

### Regenerating the assets

```bash
python3 tools/generate_assets.py                 # backgrounds, enemies, items, boss (Pillow)
python3 tools/pack_hero.py <sprite-pack-folder>  # the main character's sheet
python3 tools/embed_assets.py                    # pack every PNG into src/assets_data.js
```

`generate_assets.py` draws everything procedurally per level theme (autumn, night, cave, snow, lair), so recolouring a whole level means editing one entry in the `THEMES` dict.

## Asset credits

The main character uses the **2D SL Knight v1.0** sprite pack — its licence permits editing and commercial use, and forbids reselling the asset itself. Everything else (backgrounds, enemies, the boss, items, UI) is generated by `tools/generate_assets.py`.
