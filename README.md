# The Last Knight

A 2D pixel-art action platformer in five levels, built with [Phaser.js](https://phaser.io/).

## Story

You are the last of the forest wardens. The leaves are falling too early, the warden's lanterns are going out on their own, and something very old is stirring at the heart of the wood.

The trail leads you out of the autumn forest, through the mist of the nightwood, down into the ruins of a crystal cave, up to a freezing peak — and finally to the lair of the **Forest Dragon**. The dragon is no mindless monster: it recognises the crest on your shield, and it means to collect on an oath that men once broke.

The ending is deliberately left open.

## Running it

Just open `index.html` in a browser (double-click it) — every image is embedded as a data URI, so no server is needed. The view scales to fill the window, and `F` toggles fullscreen.

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
| `E` | Talk to the person you are standing next to, or open a merchant's stall |
| `↑` `↓` / `ENTER` / `Q` | In the market: choose, buy, leave |
| `M` | Sound on / off |
| `F` | Fullscreen on / off |
| `ENTER` | Continue on the title and story screens |

## Levels

1. **The Autumn Wood** — the long opening chapter, 8800px of golden-hour valley across five pits and six checkpoints. It starts gently with slimes and goblins and keeps adding to the roster as you go east: wolves, bats, and finally wraiths. Two of Odrin's market stalls sit on the road.
2. **The Misted Nightwood** — dark, barely any sight line, wraiths start to appear.
3. **The Crystal Cave** — tiered platforming, bats, spikes.
4. **The Frozen Peak** — slippery footing and ice wolves.
5. **The Dragon's Lair** — a boss fight against a red, membrane-winged dragon: it hovers and breathes fire, dives at you, then lands exhausted — and that landing is your opening.

## Story mode

People are scattered along the road, marked with a floating `!`. Stand next to one and press `E` to talk: a portrait box types the line out, `E` or `ENTER` carries the conversation on, and play freezes until it ends. Talk to someone twice and they say something shorter the second time.

What they tell you is the plot the chapter cards only hint at:

- **Elder Maren** sends you east and explains that a warden's lantern only dies when the pact it was lit for is broken.
- **Bram** the woodcutter has stopped cutting: the oak he struck this morning bled warm.
- **The Wisp**, in the nightwood, was a warden once too — and points you at the stone beneath the roots.
- **Gethin** reads the cave reliefs: a dragon gave up its fire so the valley could grow, men swore to guard it, and the last panel was chiselled away.
- **Yvane**, freezing on the peak, reached the lair first. The dragon let her go, and asked her a question she could not answer.
- **Odrin the Pedlar** has set his stall up in the middle of the emptying forest, because everyone is running east past him and that is the best road he has had in years. Talk to him once and he introduces himself; after that, `E` goes straight to the stall.

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
- **Crystals** — the game's currency. You pick them up along the route and earn them for defeating enemies, and you spend them at a merchant.
- **Pits** — falling costs a life, **and 25 crystals**. They burst out of you and scatter across the ground where you fell, so you watch the loss happen.

## The market

Odrin's stalls sell timed abilities for crystals. Buffs survive a death and a change of chapter, and buying one that is still running extends it rather than restarting it. The HUD shows a countdown for each one you have.

| Ability | Cost | Lasts | Effect |
| --- | --- | --- | --- |
| Whetstone | 30 | 45s | Your sword does double damage |
| Swiftness Draught | 25 | 45s | Run faster, dash further |
| Warden's Ward | 35 | 60s | Armour refills now and holds five hits instead of three |
| Ember Flask | 40 | 45s | Every connecting swing bursts into everything within 180px |
| Heart of Oak | 20 | — | Restores two hearts on the spot |

Heart of Oak refuses the sale (and keeps your crystals) if you are already at full health.

## Cheat code

Type **`123456789`** at any point during play to switch on **invincible mode** — nothing takes health off you, and falling into a pit just lifts you back to safety. Type it again to switch it off. An `INVINCIBLE` badge shows in the HUD while it is on.

## Project layout

```
index.html           the game page
src/levels.js        the five levels, their story text and every conversation
src/audio.js         audio engine (music, effects, ambience, reverb)
src/dialogue.js      the conversation box and the NPCs who use it
src/entities.js      Player (combo, dash, health), Enemy, Dragon (boss)
src/market.js        the abilities, the buff timers and the stall UI
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
python3 tools/pack_valley.py <valley-pack-folder># chapter 1's valley theme
python3 tools/embed_assets.py                    # pack every PNG into src/assets_data.js
```

`generate_assets.py` draws chapters 2-5 procedurally per theme (night, cave, snow, lair), so recolouring a whole level means editing one entry in the `THEMES` dict. Chapter 1 and the title screen instead use the Pixel Valley art, cut and composed by `pack_valley.py`.

## Asset credits


- The main character uses the **2D SL Knight v1.0** sprite pack.
- Chapter 1 and the title screen use the **Pixel Valley - Revamp** pack: its parallax layers, terrain tiles and tree/pine/grass props, cut and recomposed by `tools/pack_valley.py` at the game's pixel scale.
- Everything else (chapters 2-5 backgrounds, enemies, the dragon, items, UI) is generated by `tools/generate_assets.py`.
