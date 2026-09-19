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
| `1` – `5` | Drink an ability out of your satchel |
| `↑` `↓` / `ENTER` / `U` / `Q` | In the market: choose, buy, use, leave |
| `↑` `↓` / `ENTER` | When someone asks you something: choose an answer |
| `M` | Sound on / off |
| `F` | Fullscreen on / off |
| `ENTER` | Continue on the title and story screens |

The title screen is a menu: `↑` `↓` to choose, `ENTER` to select. **CONTROLS** and **CREDITS** open their own panel.

## Levels

1. **The Autumn Wood** — the long opening chapter, 8800px of golden-hour valley across five pits and six checkpoints. It starts gently with slimes and goblins and keeps adding to the roster as you go east: wolves, bats, and finally wraiths. Two of Odrin's market stalls sit on the road.
2. **The Misted Nightwood** — a dark forest you can barely see across, lit only by your lantern and what somebody else left burning. There is a graveyard, and a gravedigger who will tell you how many he has buried this month.
3. **The Crystal Cave** — tiered platforming, bats, spikes, and two digs where people are still working.
4. **The Frozen Peak** — slippery footing, ice wolves, and a snow forest under a distant castle.
5. **The Dragon's Lair** — a boss fight against a red, membrane-winged dragon: it hovers and breathes fire, dives at you, then lands exhausted — and that landing is your opening. Odrin's stall is still standing at the mouth of it, with nobody behind it. The score builds as the dragon weakens, and stops dead the moment it goes down.

At zero health the dragon does not die. It kneels, the music cuts out, and it asks you one question. What you answer is the end of the game.

## A world that is going about its business

The chapters are not corridors with monsters in them.

- **Places.** Camps with tents, a fire someone lit, a washing line and a chopping block. Odrin's market stalls. A graveyard in the nightwood, digs in the cave. Torches burn along the road, and both they and the campfires throw real light — in the dark chapters they carve holes in the darkness overlay.
- **People.** Villagers stroll their own patch of road, turn to watch you go past, and run when something with teeth comes near — then walk home again once it has gone. They will not walk off a ledge. The story NPCs hold their ground but still turn to face you.
- **Camps are safe ground.** Nothing hunts inside one: an enemy placed in a camp is pushed to its edge when the chapter is built.
- **Scenery.** Trees, bushes, grass and rocks are scattered by a generator seeded on the chapter name — so it looks hand-placed, and it is identical every time you replay it. One sparse band sits in front of the action, so the ground has depth.
- **Sky.** Clouds drift, flocks of birds cross now and then, and each chapter has its own weather falling through it: leaves turning in the valley, snow on the peak, dust in the cave, mist in the nightwood, ash rising off the lair floor.
- **The way out** of each chapter is a turning portal, not just a gate.

## Three endings

The dragon stops fighting at zero and asks whether the order ever meant the oath it swore. There are normally two answers. A third is only offered to a knight who earned it.

| | How you get it |
| --- | --- |
| **THE LAST LIE** | Tell it the order meant every word. It knows better — it has been lied to before. It gets back up, and the fight was over in the other direction. A real ending: no life lost, straight back to the title. |
| **THE TRUTH, LATE** | Admit nobody ever meant it. It accepts that, and lets go. The forest recovers — but you never learn what it was. |
| **SEVERUS** | Name it. Only appears if you heard all six people who hold a piece of the story **and** put the chiselled-out panel back together. |

Each ending has its own title card, its own closing music and its own colour. Nothing is tracked between runs — to see another one you play again.

### The relief shards

Gethin says the last panel of the cave reliefs was deliberately chiselled away. Four pieces of it are hidden, one per chapter, genuinely out of sight: behind foliage on open ground, or up on a ledge in the dark where your lantern has to reach before you can see anything at all.

The game says nothing about them until you find your first. After that the HUD counts them and Gethin has more to say. The only thing that gives one away is a soft chime and a single spark when you are within about 150px — no marker, no arrow. Hearing it twice in the same place is the hint.

## Story mode

People are scattered along the road, marked with a floating `!`. Stand next to one and press `E` to talk: a portrait box types the line out, `E` or `ENTER` carries the conversation on, and play freezes until it ends. Talk to someone twice and they say something shorter the second time.

What they tell you is the plot the chapter cards only hint at:

- **Elder Maren** sends you east and explains that a warden's lantern only dies when the pact it was lit for is broken.
- **Bram** the woodcutter has stopped cutting: the oak he struck this morning bled warm.
- **The Wisp**, in the nightwood, was a warden once too — and points you at the stone beneath the roots.
- **Gethin** reads the cave reliefs: a dragon gave up its fire so the valley could grow, men swore to guard it, and the last panel was chiselled away.
- **Yvane**, freezing on the peak, reached the lair first. The dragon let her go, and asked her a question she could not answer.
- **The Gravedigger**, in the nightwood, has buried nine this month, and not one of them from an animal. They walk in from the west and lie down.
- **Odrin the Pedlar** keeps a stall in every chapter — including one at the mouth of the dragon's lair, where he tells you to spend it all, because you cannot take crystals where you are going. Talk to him once and he introduces himself; after that, `E` goes straight to the stall.

The cast all come from one sheet of six villagers, recoloured character by character, and each portrait is cropped from that character's own head — so the face in the dialogue box is the face standing on the road.

## Audio

Every sound is synthesised live through the Web Audio API — there is not a single audio file, so the game costs nothing extra to download and still runs from `file://`.

- **Music** is scored per level from pad layers (detuned saws through a moving filter), sub bass, an arpeggio and percussion (taiko in the lair, water drips in the cave).
- **The lair theme grows.** It opens as a drone and a slow taiko, and lets another part in each time the dragon loses ground — a low choir at a quarter, a sub an octave down and four-to-the-bar taiko at a half, a thin line an octave up in the last quarter. When the dragon kneels it stops completely, and a single held tone carries the conversation.
- **Layered sound effects**, built the way a sound designer builds one: transient, then body, then tail. Metal clangs come from inharmonic partials; the dragon's roar is a distorted saw stack pushed through vowel-like formant filters.
- **Convolution reverb** with an impulse response generated per environment — the cave rings for 3.4 seconds and dark, snow is nearly dry at 0.9.
- **Per-surface footsteps** — leaf litter, damp earth, stone, squeaking snow, ash — triggered by distance travelled so they always match the run.
- **Stereo placement** from world position: an enemy to your left sounds to your left, and grows quieter and more muffled with distance.
- **Ambience** per level: wind through leaves, night crickets, cave drips, a snow storm, a low drone in the lair.
- Every sound is randomised slightly in pitch and level so repeats never sound identical.

## Systems

- **The HUD** — a framed orb that drains from the top as you take damage, with the count inside it; a yellow bar for armour that is only as long as the plates you can hold; and a segmented blue bar for how long the ability you drank has left. Below it, the satchel: five slots showing what you are carrying and which key drinks it.
- **Health and lives** — 5 health, 3 lives, brief invulnerability after a hit.
- **Armour** — every enemy you defeat grants three plates of armour. While it holds (a shell around the knight, and the yellow bar in the HUD) hits land on the armour instead of your health. The third hit shatters it; defeat another enemy to earn it back. Pits stay lethal — armour will not save you there.
- **Checkpoints** — stone lanterns along the way; dying returns you to the last one.
- **Crystals** — the game's currency. You pick them up along the route and earn them for defeating enemies, and you spend them at a merchant.
- **Pits** — falling costs a life, **and 25 crystals**. They burst out of you and scatter across the ground where you fell, so you watch the loss happen.

## The market and the satchel

Odrin's stalls sell abilities for crystals — one in every chapter, including the last one before the lair.

**Buying does not use it.** What you buy goes into your satchel and waits there, so the clock does not start while you are still standing at the stall. Drink one with the `U` button next to it in the market, or with keys `1`–`5` in the field without anything pausing. You can carry five of any one thing, and the satchel survives a death and a change of chapter.

| Ability | Cost | Lasts | Effect |
| --- | --- | --- | --- |
| Whetstone | 30 | 45s | Your sword does double damage |
| Swiftness Draught | 25 | 45s | Run faster, dash further |
| Warden's Ward | 35 | 60s | Armour refills now and holds five hits instead of three |
| Ember Flask | 40 | 45s | Every connecting swing bursts into everything within 180px |
| Heart of Oak | 20 | — | Restores two hearts on the spot |

Heart of Oak refuses to be drunk (and stays in your satchel) if you are already at full health.

## Cheat code

Type **`123456789`** at any point during play to switch on **invincible mode** — nothing takes health off you, and falling into a pit just lifts you back to safety. Type it again to switch it off. An `INVINCIBLE` badge shows in the HUD while it is on.

## Project layout

```
index.html           the game page
src/levels.js        the five levels, their story text and every conversation
src/audio.js         audio engine (music, effects, ambience, reverb)
src/dialogue.js      the conversation box, and the NPCs and villagers who live on the road
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
python3 tools/generate_assets.py                      # enemies, items, effects (Pillow)
python3 tools/pack_hero.py      <knight-pack>         # the main character's sheet
python3 tools/pack_gandalf.py   <gandalf-pack> <hp-bar-pack>
                                                      # chapters 1 and 4, all the decor, the HUD
python3 tools/pack_forest.py    <background-forest>   # chapter 2's parallax
python3 tools/pack_villagers.py <green-woods-pack>    # every NPC and their portrait
python3 tools/pack_dragon.py    <dragon-sprite.png>   # the boss, cut into parts and animated
python3 tools/embed_assets.py                         # pack every PNG into src/assets_data.js
```

Each packer is written to be re-runnable: they always rebuild from the original pack rather than from what is already in `assets/`, so running one twice gives the same result as running it once.

`generate_assets.py` still draws the cave and the lair procedurally per theme, so recolouring one of those means editing a single entry in its `THEMES` dict.

## Asset credits

- The main character uses the **2D SL Knight v1.0** sprite pack.
- **Chapters 1 and 4, all the set dressing and the HUD** come from the **GandalfHardcore Free Platformer Assets** and **GandalfHardcore HP bar** packs — the Autumn and Winter parallax stacks, the floor tiles, the decor sheet (tents, crates, gravestones, boulders, bushes), the animated campfire, torches and portal, the clouds and birds, and the orb-and-bars HUD.
- **Chapter 2** uses **BACKGROUND FOREST** by Ilaria Lazzarotto: nine aligned layers of one dark forest scene, flattened into the game's three.
- **Every person in the game** comes from **GREEN WOODS Part II** by Ilaria Lazzarotto — six villagers in a five-step ramp, which is what makes them re-colourable into a whole cast.
- **The dragon** is the supplied sprite, cut into wing, tail, head, legs and body and animated joint by joint; its roar borrows the open maw from the same pack's grey variant, recoloured onto the red palette.
- Everything else (enemies, items, effects, the cave and lair themes) is generated by `tools/generate_assets.py`.
