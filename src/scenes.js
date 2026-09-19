// Scenes: boot/loading, title, story cards, gameplay, game over, ending.

const GameState = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  checkpointX: null, // survives the scene restart that follows a death
  godMode: false,    // cheat: set by typing the code below, survives restarts

  // What the dragon will weigh at the end. Both survive a death and a change
  // of chapter, and both are wiped when a new game starts - you cannot carry
  // last run's knowledge into this one.
  heard: {},   // story NPCs the knight has finished a conversation with
  shards: {},  // pieces of the chiselled-out relief he is carrying

  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.checkpointX = null;
    this.heard = {};
    this.shards = {};
    Buffs.clear();
    Satchel.clear();
  },

  shardCount() {
    return Object.keys(this.shards).length;
  },

  // The whole truth: every one of them told you a piece of it, and the panel
  // they chiselled out is back together.
  knowsEverything() {
    return STORY_VOICES.every((id) => this.heard[id]) &&
           this.shardCount() >= SHARD_TOTAL;
  },
};

// Cheat code: type 123456789 anywhere to toggle invincibility. The listener
// lives on the window rather than a scene so it answers on every screen, and
// it keeps a rolling buffer so the digits only have to arrive in order.
const CHEAT_CODE = "123456789";
const Cheats = {
  buffer: "",
  installed: false,
  install(game) {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener("keydown", (e) => {
      if (!/^[0-9]$/.test(e.key)) return;
      this.buffer = (this.buffer + e.key).slice(-CHEAT_CODE.length);
      if (this.buffer !== CHEAT_CODE) return;
      this.buffer = "";
      GameState.godMode = !GameState.godMode;
      Sound.play(GameState.godMode ? "checkpoint" : "select");
      const scene = game.scene.getScene("game");
      if (scene && game.scene.isActive("game")) scene.showCheatToast();
    });
  },
};

// Global hotkeys. These live on the window for the same reason the cheat does:
// a listener registered on a scene dies when that scene shuts down, which is
// what silently broke the mute key.
const Hotkeys = {
  installed: false,
  install(game) {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key === "m") {
        Sound.toggleMute();
      } else if (key === "f") {
        // Must run inside the gesture, so toggle straight from the handler.
        if (game.scale.isFullscreen) game.scale.stopFullscreen();
        else game.scale.startFullscreen();
      }
    });
  },
};

// What each chapter is dressed with, back to front. The packs ship three
// seasons of the same props, which lines up with the chapters almost exactly;
// the cave and the lair have no plant life, so they are dressed in stone.
const SCENERY = {
  valley: {
    back: ["pine_autumn", "pine_gold", "tree_autumn"],
    mid: ["birch_autumn", "trunk_bare"],
    bush: ["prop_bush_autumn_0", "prop_bush_autumn_1", "prop_bush_autumn_2"],
    grass: ["tallgrass_autumn_0", "tallgrass_autumn_1", "tallgrass_autumn_2",
            "prop_wheat_2", "prop_wheat_3", "prop_wheat_4",
            "prop_wheat_5", "prop_wheat_6", "prop_wheat_7"],
    rocks: ["prop_rocks_autumn_0", "prop_leafpile", "prop_scarecrow"],
  },
  night: {
    back: ["pine_green", "trunk_bare"],
    mid: ["trunk_bare", "birch_autumn"],
    bush: ["prop_bush_green_0", "prop_bush_green_1", "prop_bush_green_2"],
    grass: ["tallgrass_green_0", "tallgrass_green_1", "tallgrass_green_2", "prop_reeds"],
    rocks: ["prop_rocks_0", "prop_grave_a"],
    tint: 0x8fa2d8, // moonlight, so the green pack reads as night
  },
  cave: {
    back: [], mid: ["prop_wall"],
    bush: [], grass: [],
    rocks: ["prop_rocks_0", "prop_statue"],
    tint: 0xb9a9d6,
  },
  snow: {
    back: ["pine_snow", "tree_snow"],
    mid: ["birch_snow", "trunk_bare"],
    bush: ["prop_bush_snow_0", "prop_bush_snow_1", "prop_bush_snow_2"],
    grass: ["tallgrass_snow_0", "tallgrass_snow_1", "tallgrass_snow_2", "prop_snowpile"],
    rocks: ["prop_rocks_snow_0"],
  },
  lair: {
    back: [], mid: ["trunk_bare"],
    bush: [], grass: [],
    rocks: ["prop_rocks_0"],
    tint: 0xd98a72,
  },
};

// Weather, per chapter. Leaves turn and tumble, snow falls straight and fast,
// cave dust barely moves, mist hangs, ash rises off the lair floor.
const WEATHER = {
  valley: { life: 8200, speedY: { min: 26, max: 62 }, speedX: { min: -58, max: -6 },
            scale: { min: 0.5, max: 1.5 }, alpha: 0.85, every: 200,
            tint: [0xd98b3a, 0xc26a2a, 0xe0b45c], spin: true },
  night:  { life: 9000, speedY: { min: 10, max: 26 }, speedX: { min: -22, max: 10 },
            scale: { min: 0.8, max: 2.4 }, alpha: 0.28, every: 320,
            tint: 0x9fb2e0, spin: false },
  cave:   { life: 9500, speedY: { min: 12, max: 30 }, speedX: { min: -14, max: 14 },
            scale: { min: 0.3, max: 0.9 }, alpha: 0.5, every: 380,
            tint: 0xb79bff, spin: false },
  snow:   { life: 7000, speedY: { min: 55, max: 110 }, speedX: { min: -50, max: 14 },
            scale: { min: 0.4, max: 1.2 }, alpha: 0.95, every: 70,
            tint: 0xffffff, spin: false },
  lair:   { life: 6000, speedY: { min: -70, max: -18 }, speedX: { min: -24, max: 24 },
            scale: { min: 0.35, max: 1.1 }, alpha: 0.7, every: 150,
            tint: [0xff7a3c, 0x8a3a20], spin: true },
};

// Only the chapters with an actual sky get one.
const SKIES = {
  valley: { clouds: 5, cloudAlpha: 0.85, birds: true, tint: 0xffffff },
  night:  { clouds: 3, cloudAlpha: 0.16, birds: false, tint: 0x6b7ba8 },
  snow:   { clouds: 6, cloudAlpha: 0.7, birds: true, tint: 0xdfe9f5 },
};

// What the two title-screen panels hold. The controls are a table rather than
// a paragraph: a key column and an action column, so nothing has to wrap.
const PANEL_CONTROLS = [
  ["A / D    ← →", "move"],
  ["W / ↑ / SPACE", "jump — hold it for a higher jump"],
  ["J   or   X", "attack — a three-hit combo, and in the air"],
  ["SHIFT   or   L", "dash, with a moment of invulnerability"],
  ["E", "talk to someone, or open a stall"],
  ["1 – 5", "drink an ability from your satchel"],
  ["ENTER", "carry a conversation on"],
  ["M   /   F", "sound on-off   /   fullscreen"],
];

const PANEL_NOTES = [
  "Defeat an enemy and you earn ARMOUR: three plates that take the",
  "hit instead of your health.  Merchants sell abilities for crystals,",
  "and they wait in your satchel until you drink one.",
  "Falling into a pit costs a life — and 25 crystals.",
];

const PANEL_CREDITS = [
  ["The knight", "2D SL Knight v1.0"],
  ["Chapters 1 and 4", "GandalfHardcore Free Platformer Assets"],
  ["Chapter 2", "BACKGROUND FOREST — Ilaria Lazzarotto"],
  ["The people", "GREEN WOODS Part II — Ilaria Lazzarotto"],
  ["The HUD", "GandalfHardcore HP bar"],
  ["The dragon", "the supplied sprite, cut into parts"],
  ["", "and animated joint by joint"],
  ["Everything else", "generated by the scripts in tools/"],
];

const CREDITS_NOTES = [
  "THE LAST KNIGHT — a pixel forest adventure, built with Phaser.",
  "",
  "Every sound in the game is synthesised live in the browser.",
  "There is not a single audio file.",
];

const FONT = "monospace";
// The six who each hold a piece of what happened here. Talking to all of them
// is half of what the dragon is listening for at the end.
const STORY_VOICES = ["maren", "bram", "wisp", "gravedigger", "gethin", "yvane"];
const SHARD_TOTAL = 4;

// Everyone cut from the GREEN WOODS sheet: the five the story stops for, and
// the villagers who just live here.
const CAST_FOLK = [
  "maren", "bram", "merchant", "gethin", "yvane",
  "villager_child", "villager_man", "villager_woman", "villager_hand", "villager_old",
];

const THEME_TINT = {
  valley: 0xffc27a, night: 0x93a6ff, cave: 0xb79bff, snow: 0xffffff, lair: 0xff8a6a,
};

// ======================================================= BOOT
class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    // Every image is an embedded base64 data URI (src/assets_data.js), so the
    // game runs from file:// with no server and no CORS trouble.
    for (const theme of ["valley", "night", "cave", "snow", "lair"]) {
      this.load.image(`sky_${theme}`, ASSET_DATA[`sky_${theme}`]);
      this.load.image(`far_${theme}`, ASSET_DATA[`far_${theme}`]);
      this.load.image(`near_${theme}`, ASSET_DATA[`near_${theme}`]);
      this.load.image(`ground_${theme}`, ASSET_DATA[`ground_${theme}`]);
      this.load.image(`ground_${theme}_deep`, ASSET_DATA[`ground_${theme}_deep`]);
      this.load.image(`platform_${theme}`, ASSET_DATA[`platform_${theme}`]);
    }
    this.load.image("gate", ASSET_DATA.gate);
    this.load.image("fence", ASSET_DATA.fence);
    this.load.image("lantern", ASSET_DATA.lantern);
    this.load.image("spike", ASSET_DATA.spike);
    this.load.image("light", ASSET_DATA.light);
    for (const part of ["hud_frame", "hud_orb", "hud_bar_armour", "hud_bar_time"]) {
      this.load.image(part, ASSET_DATA[part]);
    }
    // Scenery and set dressing: dozens of loose props, loaded by prefix so
    // adding one to the pack script does not also mean editing this list.
    for (const key of Object.keys(ASSET_DATA)) {
      if (/^(prop_|tree_|pine_|birch_|tallgrass_|trunk_|cloud_|bird_|willow|sky_sun)/.test(key)) {
        this.load.image(key, ASSET_DATA[key]);
      }
    }
    this.load.spritesheet("campfire", ASSET_DATA.campfire, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("torch", ASSET_DATA.torch, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("torch_wall", ASSET_DATA.torch_wall, { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("portal", ASSET_DATA.portal, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("shard", ASSET_DATA.shard, { frameWidth: 36, frameHeight: 36 });
    this.load.image("particle", ASSET_DATA.particle);

    this.load.spritesheet("hero", ASSET_DATA.hero, { frameWidth: 128, frameHeight: 64 });
    this.load.spritesheet("goblin", ASSET_DATA.goblin, { frameWidth: 56, frameHeight: 72 });
    this.load.spritesheet("wolf", ASSET_DATA.wolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("icewolf", ASSET_DATA.icewolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("slime", ASSET_DATA.slime, { frameWidth: 56, frameHeight: 44 });
    this.load.spritesheet("bat", ASSET_DATA.bat, { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet("wraith", ASSET_DATA.wraith, { frameWidth: 60, frameHeight: 80 });
    this.load.spritesheet("dragon", ASSET_DATA.dragon, { frameWidth: 288, frameHeight: 216 });
    this.load.spritesheet("fireball", ASSET_DATA.fireball, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet("crystal", ASSET_DATA.crystal, { frameWidth: 36, frameHeight: 36 });
    this.load.image("shield", ASSET_DATA.shield);
    // The villagers come from one sheet of people, three idle frames each.
    for (const npc of CAST_FOLK) {
      this.load.spritesheet(`npc_${npc}`, ASSET_DATA[`npc_${npc}`], { frameWidth: 96, frameHeight: 120 });
      this.load.image(`portrait_${npc}`, ASSET_DATA[`portrait_${npc}`]);
    }
    // The wisp is not a person and keeps its own drifting sheet.
    this.load.spritesheet("npc_wisp", ASSET_DATA.npc_wisp, { frameWidth: 64, frameHeight: 80 });
    this.load.image("portrait_wisp", ASSET_DATA.portrait_wisp);
    this.load.image("portrait_knight", ASSET_DATA.portrait_knight);
    // The dragon speaks once, at the end, and needs a face for it.
    this.load.image("portrait_dragon", ASSET_DATA.portrait_dragon);
    for (const icon of ["whet", "swift", "ward", "ember", "heart"]) {
      this.load.image(`icon_${icon}`, ASSET_DATA[`icon_${icon}`]);
    }
    this.load.spritesheet("checkpoint", ASSET_DATA.checkpoint, { frameWidth: 52, frameHeight: 88 });
  }

  create() {
    // Browsers keep audio suspended until the player interacts, so hook
    // both key and pointer input and resume from there.
    Sound.init();
    Cheats.install(this.game);
    Hotkeys.install(this.game);
    const wake = () => Sound.resume();
    this.input.keyboard.on("keydown", wake);
    this.input.on("pointerdown", wake);

    const A = this.anims;
    const hero = (key, start, end, frameRate, repeat = 0) =>
      A.create({ key, frames: A.generateFrameNumbers("hero", { start, end }), frameRate, repeat });

    hero("hero-idle", 0, 7, 8, -1);
    hero("hero-run", 8, 15, 14, -1);
    hero("hero-jump", 16, 19, 12);
    hero("hero-fall", 20, 23, 10);
    hero("hero-attack1", 24, 31, 24);
    hero("hero-attack2", 32, 39, 24);
    hero("hero-attack3", 40, 47, 20);
    hero("hero-airattack", 48, 55, 22);
    hero("hero-roll", 56, 59, 14);
    hero("hero-hurt", 60, 63, 12);
    hero("hero-death", 64, 67, 8);

    const walker = (key, rate) => A.create({
      key: `${key}-move`, frames: A.generateFrameNumbers(key, { start: 0, end: 1 }),
      frameRate: rate, repeat: -1,
    });
    walker("goblin", 4); walker("wolf", 6); walker("icewolf", 6);
    walker("slime", 3); walker("bat", 10); walker("wraith", 4);

    A.create({ key: "dragon-fly", frames: A.generateFrameNumbers("dragon", { start: 0, end: 5 }), frameRate: 11, repeat: -1 });
    A.create({ key: "dragon-roar", frames: A.generateFrameNumbers("dragon", { start: 6, end: 11 }), frameRate: 9 });
    A.create({ key: "dragon-swoop", frames: A.generateFrameNumbers("dragon", { start: 12, end: 15 }), frameRate: 13, repeat: -1 });
    A.create({ key: "dragon-hurt", frames: A.generateFrameNumbers("dragon", { start: 16, end: 17 }), frameRate: 12 });
    A.create({ key: "dragon-death", frames: A.generateFrameNumbers("dragon", { start: 18, end: 21 }), frameRate: 5 });
    A.create({ key: "dragon-rest", frames: A.generateFrameNumbers("dragon", { start: 22, end: 23 }), frameRate: 1.6, repeat: -1 });
    A.create({ key: "fireball-fly", frames: A.generateFrameNumbers("fireball", { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
    for (const npc of CAST_FOLK) {
      A.create({ key: `npc-${npc}`, frames: A.generateFrameNumbers(`npc_${npc}`, { start: 0, end: 2 }),
                 frameRate: 2, repeat: -1 });
    }
    A.create({ key: "npc-wisp", frames: A.generateFrameNumbers("npc_wisp", { start: 0, end: 3 }),
               frameRate: 6, repeat: -1 });
    A.create({ key: "crystal-spin", frames: A.generateFrameNumbers("crystal", { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

    // Set dressing that moves on its own.
    A.create({ key: "campfire-burn", frames: A.generateFrameNumbers("campfire", { start: 0, end: 39 }), frameRate: 14, repeat: -1 });
    A.create({ key: "torch-burn", frames: A.generateFrameNumbers("torch", { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    A.create({ key: "torch-wall-burn", frames: A.generateFrameNumbers("torch_wall", { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    A.create({ key: "portal-turn", frames: A.generateFrameNumbers("portal", { start: 0, end: 9 }), frameRate: 12, repeat: -1 });
    A.create({ key: "shard-glint", frames: A.generateFrameNumbers("shard", { start: 0, end: 3 }), frameRate: 4, repeat: -1 });

    this.scene.start("title");
  }
}

// ======================================================= TITLE
class TitleScene extends Phaser.Scene {
  constructor() { super("title"); }

  create() {
    // --- the world behind the menu, still moving -------------------------
    this.add.image(0, 0, "sky_valley").setOrigin(0);
    this.far = this.add.tileSprite(0, GAME_H - 540, GAME_W, 540, "far_valley")
      .setOrigin(0).setAlpha(0.9);
    this.near = this.add.tileSprite(0, GAME_H - 540, GAME_W, 540, "near_valley")
      .setOrigin(0);

    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const c = this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(30, 170),
        Phaser.Utils.Array.GetRandom(["cloud_a", "cloud_b", "cloud_c", "cloud_d"]))
        .setScale(Phaser.Math.FloatBetween(1.4, 2.8)).setAlpha(0.8).setDepth(1);
      c.drift = Phaser.Math.FloatBetween(-5, -13);
      this.clouds.push(c);
    }
    this.bird = null;
    this.time.delayedCall(2200, () => this.sendBird());

    // Leaves come off the trees and across the whole screen.
    this.add.particles(0, 0, "particle", {
      x: { min: -20, max: GAME_W }, y: { min: -20, max: 200 },
      lifespan: 9000, speedY: { min: 20, max: 54 }, speedX: { min: -70, max: -18 },
      rotate: { min: -180, max: 180 }, scale: { min: 0.5, max: 1.5 },
      alpha: { start: 0.9, end: 0.1 }, frequency: 260,
      tint: [0xd98b3a, 0xc26a2a, 0xe0b45c],
    }).setDepth(3);

    // A dark wash on the left only, so the menu reads without flattening the
    // art the knight is standing in. One gradient, not a stack of strips -
    // strips band visibly against a flat sky.
    const wash = this.add.graphics().setDepth(4);
    wash.fillGradientStyle(0x140c08, 0x140c08, 0x140c08, 0x140c08, 0.82, 0, 0.82, 0);
    wash.fillRect(0, 0, 620, GAME_H);
    // ...and a shallow one along the bottom, to seat the footer line.
    wash.fillGradientStyle(0x140c08, 0x140c08, 0x140c08, 0x140c08, 0, 0, 0.7, 0.7);
    wash.fillRect(0, GAME_H - 110, GAME_W, 110);

    // --- the knight, who is the point ------------------------------------
    const hx = GAME_W - 236, hy = 452;
    this.add.image(hx, hy - 46, "light").setTint(0xffb66a).setScale(0.62)
      .setAlpha(0.3).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.ellipse(hx, hy + 4, 150, 26, 0x1a0f08, 0.45).setDepth(5);
    const knight = this.add.sprite(hx, hy, "hero").setScale(HERO_SCALE * 1.7)
      .setOrigin(0.5, 1).setDepth(6);
    knight.play("hero-idle");
    // He breathes, and the light on him breathes with him.
    this.tweens.add({ targets: knight, y: hy - 5, duration: 2400,
                      yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // --- the masthead ------------------------------------------------------
    const LX = 74;
    this.add.text(LX + 3, 95, "THE LAST KNIGHT", {
      fontFamily: FONT, fontSize: "52px", color: "#3a1d10",
    }).setOrigin(0, 0.5).setDepth(7).setAlpha(0.7);
    const title = this.add.text(LX, 92, "THE LAST KNIGHT", {
      fontFamily: FONT, fontSize: "52px", color: "#ffd9a0",
      stroke: "#2a1410", strokeThickness: 9,
    }).setOrigin(0, 0.5).setDepth(8);
    this.tweens.add({ targets: title, alpha: 0.86, duration: 2600,
                      yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.add.rectangle(LX, 126, 430, 3, 0xb99b6a, 0.9).setOrigin(0, 0.5).setDepth(8);
    this.add.text(LX, 152, "The forest guardian, and the wrath of the dragon", {
      fontFamily: FONT, fontSize: "15px", color: "#e4d6c2",
      stroke: "#1c1108", strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(8);

    // --- the menu ----------------------------------------------------------
    this.cursor = 0;
    this.items = [
      { label: "PLAY", run: () => this.startGame() },
      { label: "CONTROLS", run: () => this.openPanel("controls") },
      { label: "CREDITS", run: () => this.openPanel("credits") },
    ];
    this.entries = this.items.map((item, i) => {
      const y = 232 + i * 52;
      const bar = this.add.rectangle(LX - 14, y, 330, 42, 0x2a2036, 0)
        .setOrigin(0, 0.5).setDepth(7);
      const edge = this.add.rectangle(LX - 14, y, 4, 42, 0xffd9a0, 0)
        .setOrigin(0, 0.5).setDepth(8);
      const text = this.add.text(LX + 10, y, item.label, {
        fontFamily: FONT, fontSize: "27px", color: "#e8dccb",
        stroke: "#1c1108", strokeThickness: 5,
      }).setOrigin(0, 0.5).setDepth(8);
      return { bar, edge, text };
    });

    this.add.text(LX, GAME_H - 34, "↑ ↓  choose      ENTER  select      F  fullscreen      M  sound", {
      fontFamily: FONT, fontSize: "13px", color: "#a99c8c",
      stroke: "#1c1108", strokeThickness: 4,
    }).setOrigin(0, 0.5).setDepth(8);

    this.buildPanel();
    this.refreshMenu();

    Sound.resume();
    Sound.setEnvironment("title");
    Sound.startMusic("title");

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      up: K.W, down: K.S, enter: K.ENTER, space: K.SPACE,
      esc: K.ESC, quit: K.Q,
    });
    this.arrows = this.input.keyboard.createCursorKeys();
  }

  sendBird() {
    if (!this.scene.isActive()) return;
    const fromLeft = Math.random() < 0.5;
    const b = this.add.image(fromLeft ? -90 : GAME_W + 90, Phaser.Math.Between(40, 150),
      Phaser.Utils.Array.GetRandom(["bird_a", "bird_b"]))
      .setScale(Phaser.Math.FloatBetween(1.8, 3)).setAlpha(0.85)
      .setDepth(2).setFlipX(!fromLeft);
    b.drift = (fromLeft ? 1 : -1) * Phaser.Math.FloatBetween(34, 60);
    b.baseY = b.y; b.bobT = 0;
    this.bird = b;
    this.time.delayedCall(Phaser.Math.Between(8000, 17000), () => this.sendBird());
  }

  // One panel, reused for both CONTROLS and CREDITS. Both are a key column
  // and a value column plus a short note, so neither ever has to word-wrap.
  buildPanel() {
    const w = 716, h = 428, x = (GAME_W - w) / 2, y = (GAME_H - h) / 2;
    const d = 40;
    this.panelOpen = null;
    this.panelBox = { x, y, w, h };

    this.shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05040a, 0.74)
      .setOrigin(0).setDepth(d - 1).setVisible(false);
    this.panel = this.add.graphics().setDepth(d).setVisible(false);
    this.panel.fillStyle(0x100b14, 0.97);
    this.panel.fillRect(x, y, w, h);
    this.panel.lineStyle(3, 0xb99b6a, 1);
    this.panel.strokeRect(x, y, w, h);
    this.panel.lineStyle(1, 0x4a3a28, 1);
    this.panel.strokeRect(x + 5, y + 5, w - 10, h - 10);

    this.panelTitle = this.add.text(x + w / 2, y + 20, "", {
      fontFamily: FONT, fontSize: "20px", color: "#ffd9a0",
    }).setOrigin(0.5, 0).setDepth(d + 1).setVisible(false);
    this.panelRule = this.add.rectangle(x + w / 2, y + 52, w - 96, 1, 0x4a3a28)
      .setDepth(d + 1).setVisible(false);

    this.colKeys = this.add.text(x + 46, y + 70, "", {
      fontFamily: FONT, fontSize: "15px", color: "#ffd9a0", lineSpacing: 11,
    }).setOrigin(0, 0).setDepth(d + 1).setVisible(false);
    this.colVals = this.add.text(x + 250, y + 70, "", {
      fontFamily: FONT, fontSize: "15px", color: "#e4d6c2", lineSpacing: 11,
    }).setOrigin(0, 0).setDepth(d + 1).setVisible(false);
    this.panelNote = this.add.text(x + w / 2, y + h - 116, "", {
      fontFamily: FONT, fontSize: "13px", color: "#a99c8c", align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5, 0).setDepth(d + 1).setVisible(false);
    this.panelHint = this.add.text(x + w / 2, y + h - 30, "ESC  /  ENTER   back", {
      fontFamily: FONT, fontSize: "13px", color: "#9c8f7f",
    }).setOrigin(0.5, 0).setDepth(d + 1).setVisible(false);

    this.panelBits = [this.shade, this.panel, this.panelTitle, this.panelRule,
                      this.colKeys, this.colVals, this.panelNote, this.panelHint];
  }

  openPanel(which) {
    this.panelOpen = which;
    Sound.play("shopOpen");
    const rows = which === "controls" ? PANEL_CONTROLS : PANEL_CREDITS;
    const notes = which === "controls" ? PANEL_NOTES : CREDITS_NOTES;
    this.panelTitle.setText(which === "controls" ? "CONTROLS" : "CREDITS");
    this.colKeys.setText(rows.map((r) => r[0]).join("\n"));
    this.colVals.setText(rows.map((r) => r[1]).join("\n"));
    this.panelNote.setText(notes.join("\n"));
    this.panelBits.forEach((o) => o.setVisible(true));
  }

  closePanel() {
    this.panelOpen = null;
    Sound.play("select");
    this.panelBits.forEach((o) => o.setVisible(false));
  }

  refreshMenu() {
    this.entries.forEach((e, i) => {
      const on = i === this.cursor;
      e.bar.setFillStyle(0x2a2036, on ? 0.82 : 0);
      e.edge.setFillStyle(0xffd9a0, on ? 1 : 0);
      e.text.setColor(on ? "#ffd9a0" : "#bcae9c");
      e.text.setX(74 + 10 + (on ? 12 : 0));
    });
  }

  move(step) {
    this.cursor = (this.cursor + step + this.items.length) % this.items.length;
    Sound.play("select");
    this.refreshMenu();
  }

  startGame() {
    Sound.resume();
    Sound.play("checkpoint");
    GameState.reset();
    this.scene.start("story");
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.far.tilePositionX += 5 * dt;
    this.near.tilePositionX += 13 * dt;
    for (const c of this.clouds) {
      c.x += c.drift * dt;
      if (c.x < -c.displayWidth) { c.x = GAME_W + c.displayWidth; c.y = Phaser.Math.Between(30, 170); }
    }
    if (this.bird && this.bird.active) {
      this.bird.x += this.bird.drift * dt;
      this.bird.bobT += dt * 1.5;
      this.bird.y = this.bird.baseY + Math.sin(this.bird.bobT) * 9;
      if (this.bird.x < -150 || this.bird.x > GAME_W + 150) { this.bird.destroy(); this.bird = null; }
    }

    const k = this.keys, a = this.arrows;
    const down = (key) => Phaser.Input.Keyboard.JustDown(key);
    if (this.panelOpen) {
      if (down(k.esc) || down(k.enter) || down(k.quit) || down(k.space)) this.closePanel();
      return;
    }
    if (down(a.up) || down(k.up)) this.move(-1);
    if (down(a.down) || down(k.down)) this.move(1);
    if (down(k.enter) || down(k.space)) this.items[this.cursor].run();
  }
}

class StoryScene extends Phaser.Scene {
  constructor() { super("story"); }

  create() {
    const level = LEVELS[GameState.levelIndex];
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x080610).setOrigin(0);

    this.add.text(GAME_W / 2, 120, `CHAPTER ${GameState.levelIndex + 1}`, {
      fontFamily: FONT, fontSize: "18px", color: "#8c7f9c", letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 164, level.name, {
      fontFamily: FONT, fontSize: "36px", color: "#ffd9a0",
    }).setOrigin(0.5);

    level.story.forEach((line, i) => {
      const t = this.add.text(GAME_W / 2, 250 + i * 40, line, {
        fontFamily: FONT, fontSize: "17px", color: "#ddd2c4", align: "center",
        wordWrap: { width: GAME_W - 180 },
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 600, delay: 400 + i * 700 });
    });

    const go = this.add.text(GAME_W / 2, 450, "ENTER  to continue", {
      fontFamily: FONT, fontSize: "18px", color: "#ffe6b3",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: go, alpha: 1, duration: 500, delay: 400 + level.story.length * 700 });

    Sound.startMusic(level.theme);

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.play("select");
      this.scene.start("game");
    });
  }
}

// ======================================================= GAME
class GameScene extends Phaser.Scene {
  constructor() { super("game"); }

  create() {
    // Phaser reuses the scene instance between levels, so anything held from
    // the previous run has to be cleared or we end up drawing into destroyed
    // objects.
    this.darkness = null;
    this.boss = null;
    this.gate = null;
    this.bossBar = null;
    this.bossBarBg = null;
    this.bossName = null;
    this.lanterns = [];

    const level = LEVELS[GameState.levelIndex];
    this.level = level;
    this.levelWidth = level.width;
    this.theme = level.theme;
    this.levelComplete = false;
    this.spawnX = GameState.checkpointX ?? 180;

    this.physics.world.setBounds(0, -200, level.width, GAME_H + 400);
    this.cameras.main.setBounds(0, 0, level.width, GAME_H);

    this.buildBackground();
    this.buildTerrain();
    this.buildProps();
    this.buildPickups();
    this.spawnActors();
    // After the player exists: the shard overlaps with him.
    this.buildShard();
    this.buildHud();
    this.bindInput();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.fadeIn(400);
    Sound.setEnvironment(this.theme);
    Sound.startMusic(this.theme);
    Sound.startAmbience(this.theme);
    this.events.once("shutdown", () => Sound.stopAmbience());

    if (level.dark) {
      this.darkness = this.add.renderTexture(0, 0, GAME_W, GAME_H)
        .setOrigin(0).setScrollFactor(0).setDepth(45);
    }
    this.buildSky();
    this.buildWeather();
  }

  // ---------------------------------------------------- world construction
  buildBackground() {
    const t = this.theme;
    this.add.image(0, 0, `sky_${t}`).setOrigin(0).setScrollFactor(0).setDepth(0);
    // Themes come from different sources, so take each layer's height from the
    // texture itself rather than assuming one size fits all.
    const layerH = (key) => this.textures.get(key).getSourceImage().height;
    const farH = layerH(`far_${t}`);
    const nearH = layerH(`near_${t}`);
    this.farLayer = this.add.tileSprite(0, GAME_H - farH, GAME_W, farH, `far_${t}`)
      .setOrigin(0).setScrollFactor(0).setDepth(1);
    this.nearLayer = this.add.tileSprite(0, GAME_H - nearH, GAME_W, nearH, `near_${t}`)
      .setOrigin(0).setScrollFactor(0).setDepth(2);
  }

  // A tile is removed only if it sits entirely inside the pit. Dropping every
  // tile that merely touches the pit would widen the hole by up to two tiles
  // and push it past the player's jump range.
  inGap(x) {
    return (this.level.gaps || []).some(([gx, gw]) => x >= gx && x + GROUND_TILE <= gx + gw);
  }

  buildTerrain() {
    const t = this.theme;
    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < this.level.width; x += GROUND_TILE) {
      if (this.inGap(x)) continue;
      for (let r = 0; r < GROUND_ROWS; r++) {
        const tex = r === 0 ? `ground_${t}` : `ground_${t}_deep`;
        this.ground.create(x + GROUND_TILE / 2, GROUND_Y + r * GROUND_TILE + GROUND_TILE / 2, tex)
          .setDepth(8).refreshBody();
      }
    }
    // Floating platforms are one-way: you land on them from above and jump up
    // through them, and they never block a run at ground level.
    this.platforms = this.physics.add.staticGroup();
    for (const p of this.level.platforms || []) {
      const plat = this.platforms.create(p.x, p.y, `platform_${t}`).setDepth(8);
      plat.refreshBody();
      plat.body.checkCollision.down = false;
      plat.body.checkCollision.left = false;
      plat.body.checkCollision.right = false;
    }

    this.spikes = this.physics.add.staticGroup();
    for (const s of this.level.spikes || []) {
      for (let i = 0; i < s.count; i++) {
        this.spikes.create(s.x + i * 64 + 32, GROUND_Y - 16, "spike").setDepth(9).refreshBody();
      }
    }
  }

  buildProps() {
    // Every light source in the chapter collects here, and the darkness
    // overlay erases a hole for each one. It has to be emptied *before* the
    // camps are built: they add their own fires and torches to it, and
    // resetting it afterwards threw all of them away - which is why the camps
    // in the dark chapters stood in the dark next to a burning fire.
    this.lanterns = [];
    this.buildScenery();
    this.buildCamps();

    for (const t of this.level.torches || []) {
      this.add.sprite(t, GROUND_Y - 4, "torch").setOrigin(0.5, 1)
        .setScale(2).setDepth(7).play("torch-burn");
      this.lanterns.push({ x: t, y: GROUND_Y - 76 });
    }
  }

  // Trees, bushes and grass, scattered with a seeded generator so a chapter
  // looks hand-dressed but comes out identical every time you replay it.
  buildScenery() {
    const set = SCENERY[this.theme];
    if (!set) return;
    const rnd = new Phaser.Math.RandomDataGenerator([this.level.key]);
    const clear = (x, pad) => !this.inGap(x) && !this.nearCamp(x, pad);

    const scatter = (keys, from, step, jitter, depth, scale, alpha, y, pad = 150) => {
      if (!keys || !keys.length) return;
      for (let x = from; x < this.level.width - 160; x += step) {
        const px = Math.round(x + rnd.between(-jitter, jitter));
        if (px < 120 || !clear(px, pad)) continue;
        this.add.image(px, y, rnd.pick(keys))
          .setOrigin(0.5, 1).setDepth(depth)
          .setScale(rnd.realInRange(scale[0], scale[1]))
          .setAlpha(alpha).setFlipX(rnd.frac() < 0.5)
          .setTint(set.tint || 0xffffff);
      }
    };

    // Back to front: distant trees, then nearer ones, then ground cover.
    scatter(set.back, 260, 520, 150, 3, [0.62, 0.86], 0.72, GROUND_Y + 10);
    scatter(set.mid, 560, 690, 190, 5, [0.85, 1.12], 0.95, GROUND_Y + 8);
    scatter(set.rocks, 900, 1300, 260, 6, [0.9, 1.4], 1, GROUND_Y + 6);
    // Ground cover is allowed right up to a camp - people trample paths, they
    // do not clear the whole meadow.
    scatter(set.bush, 420, 300, 100, 7, [0.9, 1.5], 1, GROUND_Y + 6, -80);
    scatter(set.grass, 200, 170, 70, 7, [0.9, 1.6], 1, GROUND_Y + 6, -110);
    // One sparse band in front of everything, so the ground has depth.
    scatter(set.grass, 340, 560, 180, 22, [1.7, 2.4], 0.95, GROUND_Y + 26, -110);
  }

  // People camp where it is safe, so nothing hunts inside one. An enemy placed
  // in a camp is pushed to whichever edge it was nearest - which also means
  // moving a camp never strands a monster in the middle of it.
  outsideCamps(x) {
    // Two camps close together are one settlement, so merge their zones first
    // - pushing out of one and into the next would bounce forever.
    if (!this.safeZones) {
      const zones = (this.level.camps || [])
        .map((c) => [c.x - (c.span || 260) / 2 - 110, c.x + (c.span || 260) / 2 + 110])
        .sort((a, b) => a[0] - b[0]);
      this.safeZones = [];
      for (const z of zones) {
        const last = this.safeZones[this.safeZones.length - 1];
        if (last && z[0] <= last[1]) last[1] = Math.max(last[1], z[1]);
        else this.safeZones.push(z.slice());
      }
    }
    for (const [a, b] of this.safeZones) {
      if (x <= a || x >= b) continue;
      x = Phaser.Math.Clamp(x - a < b - x ? a : b, 200, this.level.width - 200);
    }
    return x;
  }

  nearCamp(x, pad) {
    return (this.level.camps || []).some((c) => Math.abs(c.x - x) < (c.span || 260) / 2 + pad);
  }

  // A camp is somewhere people actually live: tents, a fire someone lit, a
  // washing line, and the clutter of having stayed a while.
  buildCamps() {
    this.fires = [];
    for (const camp of this.level.camps || []) {
      const rnd = new Phaser.Math.RandomDataGenerator([this.level.key + camp.x]);
      const g = GROUND_Y + 4;
      const put = (key, dx, depth = 6, scale = 2) =>
        this.add.image(camp.x + dx, g, key).setOrigin(0.5, 1)
          .setDepth(depth).setScale(scale);

      if (camp.kind === "market") {
        put("prop_tent", -40, 5, 2.2);
        put("prop_stall", 64, 6, 2);
        put("prop_trestle", 150, 6, 2);
        put("prop_basket", 124, 7, 2);
        put("prop_apples", 176, 7, 2);
        put("prop_bottles", 20, 7, 2);
        put("prop_crate", -150, 6, 2);
        put("prop_stool", -100, 7, 2);
        this.lightFire(camp.x + 218, g, 1.6);
      } else if (camp.kind === "graves") {
        put("prop_grave_a", -110, 6, 2);
        put("prop_cross", -20, 6, 2);
        put("prop_grave_b", 70, 6, 2);
        put("prop_mourner", 160, 6, 2);
        put("prop_pumpkin", 112, 7, 2);
      } else if (camp.kind === "mine") {
        put("prop_crates", -120, 6, 2);
        put("prop_statue", 40, 6, 2.4);
        put("prop_barrels", 150, 6, 2);
        put("prop_pot", -40, 7, 2);
        this.lightFire(camp.x - 30, g, 1.5);
      } else {
        put("prop_tent", -120, 5, 2.3);
        put(rnd.frac() < 0.5 ? "prop_tent_worn" : "prop_tent", 110, 5, 2);
        put("prop_firewood", 200, 7, 2);
        put("prop_washline", -250, 6, 2);
        put("prop_chopblock", 260, 7, 2);
        put("prop_stool", -40, 7, 2);
        // A pot over the fire: somebody is cooking, not just warming up.
        put("prop_cookfire", 46, 6, 2);
        this.lightFire(camp.x, g, 2);
      }
      // Every settlement burns a torch or two: it is how you see it coming.
      for (const dx of camp.kind === "graves" ? [-190, 200] : [-300, 300]) {
        this.add.sprite(camp.x + dx, g, "torch").setOrigin(0.5, 1)
          .setScale(2).setDepth(7).play("torch-burn");
        this.lanterns.push({ x: camp.x + dx, y: GROUND_Y - 76 });
      }
    }
  }

  // The hidden piece of the chiselled-out relief. It is deliberately dull and
  // deliberately off the running line; the chime is what finds it.
  buildShard() {
    this.shard = null;
    const def = this.level.shard;
    if (!def || GameState.shards[this.level.key]) return;

    this.shard = this.physics.add.sprite(def.x, def.y, "shard")
      .setDepth(6).setScale(1.2);
    this.shard.body.setAllowGravity(false);
    this.shard.body.setImmovable(true);
    this.shard.play("shard-glint");
    // In the lit chapters something is drawn over the top of it, so it is
    // genuinely out of sight rather than merely somewhere odd.
    if (def.cover) {
      this.add.image(def.x + 6, GROUND_Y + 6, def.cover)
        .setOrigin(0.5, 1).setDepth(9).setScale(2.1);
    }
    this.nextChimeAt = 0;
    this.physics.add.overlap(this.player, this.shard, () => this.takeShard());
  }

  takeShard() {
    if (!this.shard) return;
    GameState.shards[this.level.key] = true;
    Sound.play("shardTake", { x: this.shard.x });
    this.add.particles(this.shard.x, this.shard.y, "particle", {
      speed: { min: 40, max: 130 }, lifespan: 700, quantity: 16,
      scale: { start: 1, end: 0 }, tint: [0xffc46e, 0xffe6b3], blendMode: "ADD",
      emitting: false,
    }).setDepth(30).explode(16);
    this.shard.destroy();
    this.shard = null;
    this.floatNote(`A piece of the panel  ${GameState.shardCount()}/${SHARD_TOTAL}`, "#ffc46e");
    this.refreshHud();
  }

  // One bell when you are close, on a long cooldown, with no arrow and no
  // marker. Hearing it twice in the same place is the hint.
  listenForShard(time) {
    if (!this.shard || time < this.nextChimeAt) return;
    if (Math.abs(this.player.x - this.shard.x) > 150) return;
    if (Math.abs(this.player.y - this.shard.y) > 170) return;
    this.nextChimeAt = time + 1600;
    Sound.play("shardNear");
    this.add.particles(this.shard.x, this.shard.y - 6, "particle", {
      speed: { min: 8, max: 26 }, lifespan: 900, quantity: 1,
      scale: { start: 0.8, end: 0 }, tint: 0xffd9a0, blendMode: "ADD",
      emitting: false,
    }).setDepth(30).explode(1);
  }

  lightFire(x, y, scale) {
    const fire = this.add.sprite(x, y, "campfire").setOrigin(0.5, 1)
      .setScale(scale).setDepth(7).play("campfire-burn");
    // A fire throws light: the soft radial the darkness overlay uses, not the
    // hard 8px particle, or it reads as a yellow box sitting on the ground.
    const glow = this.add.image(x, y - 26 * scale, "light")
      .setTint(0xff9a3c).setScale(0.42 * scale).setAlpha(0.2).setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.3, scale: 0.48 * scale,
                      duration: 640, yoyo: true, repeat: -1 });
    this.add.particles(x, y - 22 * scale, "particle", {
      speedY: { min: -70, max: -140 }, speedX: { min: -16, max: 16 },
      lifespan: 1300, scale: { start: 0.9, end: 0 }, quantity: 1,
      frequency: 140, tint: [0xffb347, 0xff7a2f], alpha: { start: 0.8, end: 0 },
      blendMode: "ADD",
    }).setDepth(8);
    this.lanterns.push({ x, y: y - 40 });
    this.fires.push({ x, y });
  }

  buildPickups() {
    this.crystals = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const c of this.level.crystals || []) {
      const gem = this.crystals.create(c.x, c.y, "crystal").setDepth(12);
      gem.play("crystal-spin");
      this.tweens.add({ targets: gem, y: c.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    this.checkpoints = this.physics.add.staticGroup();
    for (const cx of this.level.checkpoints || []) {
      const cp = this.checkpoints.create(cx, GROUND_Y, "checkpoint").setOrigin(0.5, 1).setDepth(7);
      // Checkpoints already passed before a death stay lit.
      cp.activated = GameState.checkpointX !== null && cx <= GameState.checkpointX;
      cp.setFrame(cp.activated ? 1 : 0);
      cp.refreshBody();
    }
  }

  spawnActors() {
    this.player = new Player(this, this.spawnX, GROUND_Y - 120);
    this.player.onIce = !!this.level.ice;
    // Brief grace period so respawning next to an enemy is not an instant hit.
    this.player.invulnUntil = this.time.now + 1400;

    this.shieldFx = this.add.image(this.player.x, this.player.y, "shield")
      .setDepth(21).setVisible(false);

    this.safeZones = null; // the scene instance is reused between levels
    this.enemies = this.add.group();
    for (const e of this.level.enemies || []) {
      const cfg = ENEMY_TYPES[e.type];
      const y = cfg.flying ? GROUND_Y - 180 : GROUND_Y - 60;
      this.enemies.add(new Enemy(this, e.type, this.outsideCamps(e.x), y));
    }

    this.market = new Market(this);
    this.dialogue = new DialogueBox(this);
    this.npcs = (this.level.npcs || []).map((def) => new Npc(this, def));
    this.events.once("shutdown", () => this.npcs.forEach((n) => n.destroyExtras()));

    this.fireballs = this.physics.add.group({ allowGravity: false, maxSize: 24 });

    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.ground);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.enemies, (pl, en) => {
      if (en.alive_) pl.hurt(en.cfg.damage, en.x);
    });
    this.physics.add.overlap(this.player, this.spikes, (pl) => pl.hurt(1, pl.x));
    this.physics.add.overlap(this.player, this.crystals, (pl, gem) => this.collect(gem));
    this.physics.add.overlap(this.player, this.checkpoints, (pl, cp) => this.touchCheckpoint(cp));
    this.physics.add.overlap(this.player, this.fireballs, (pl, ball) => {
      this.killFireball(ball);
      pl.hurt(1, ball.x);
    });

    if (this.level.boss === "dragon") {
      this.boss = new Dragon(this, this.levelWidth - 480, 180);
      this.physics.add.overlap(this.player, this.boss, (pl, boss) => {
        if (boss.alive_) pl.hurt(1, boss.x);
      });
    } else if (this.level.goalX) {
      this.spawnGate(this.level.goalX);
    }
  }

  spawnGate(x) {
    this.gate = this.physics.add.staticImage(x, GROUND_Y, "gate").setOrigin(0.5, 1).setDepth(7);
    this.gate.refreshBody();
    this.physics.add.overlap(this.player, this.gate, () => this.completeLevel());
    // A way out should look like one: the arch stands open and turning.
    this.add.sprite(x, GROUND_Y - 86, "portal").setScale(2.4).setDepth(6)
      .setAlpha(0.9).play("portal-turn");
    this.add.image(x, GROUND_Y - 86, "light").setTint(0x7fd8ff).setScale(0.5)
      .setAlpha(0.18).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.lanterns.push({ x, y: GROUND_Y - 86 });
  }

  // What falls out of the sky, per chapter: leaves turning, snow, cave dust,
  // mist, ash off the lair. Same emitter, different weather.
  buildWeather() {
    const w = WEATHER[this.theme];
    this.add.particles(0, 0, "particle", {
      x: { min: 0, max: GAME_W }, y: -12,
      lifespan: w.life, speedY: w.speedY, speedX: w.speedX,
      rotate: w.spin ? { min: -180, max: 180 } : 0,
      scale: w.scale, alpha: { start: w.alpha, end: 0.12 },
      frequency: w.every, tint: w.tint,
    }).setScrollFactor(0).setDepth(42);
  }

  // The sky is not a painted backdrop: clouds cross it and birds cross it,
  // both slowly, both on their own parallax.
  buildSky() {
    this.clouds = [];
    this.flocks = [];
    const sky = SKIES[this.theme];
    if (!sky) return;

    for (let i = 0; i < sky.clouds; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(40, 190),
        Phaser.Utils.Array.GetRandom(["cloud_a", "cloud_b", "cloud_c", "cloud_d"]))
        .setScrollFactor(0).setDepth(1)
        .setScale(Phaser.Math.FloatBetween(1.4, 2.6))
        .setAlpha(sky.cloudAlpha).setTint(sky.tint);
      c.drift = Phaser.Math.FloatBetween(-5, -14);
      this.clouds.push(c);
    }
    if (sky.birds) this.time.delayedCall(Phaser.Math.Between(1500, 6000), () => this.sendFlock());
  }

  // A flock crosses now and then and is gone - it should feel noticed, not
  // scheduled, so the next one is always a different wait away.
  sendFlock() {
    if (!this.scene.isActive()) return;
    const sky = SKIES[this.theme];
    const fromLeft = Math.random() < 0.5;
    const bird = this.add.image(fromLeft ? -90 : GAME_W + 90,
                                Phaser.Math.Between(50, 170),
                                Phaser.Utils.Array.GetRandom(["bird_a", "bird_b"]))
      .setScrollFactor(0).setDepth(2).setScale(Phaser.Math.FloatBetween(1.6, 2.8))
      .setAlpha(0.85).setTint(sky.tint).setFlipX(!fromLeft);
    bird.drift = (fromLeft ? 1 : -1) * Phaser.Math.FloatBetween(34, 58);
    bird.bobT = 0;
    bird.baseY = bird.y;
    this.flocks.push(bird);
    this.time.delayedCall(Phaser.Math.Between(9000, 22000), () => this.sendFlock());
  }

  driftSky(dt) {
    for (const c of this.clouds || []) {
      c.x += c.drift * dt;
      if (c.x < -c.displayWidth) { c.x = GAME_W + c.displayWidth; c.y = Phaser.Math.Between(40, 190); }
    }
    for (let i = (this.flocks || []).length - 1; i >= 0; i--) {
      const b = this.flocks[i];
      b.x += b.drift * dt;
      b.bobT += dt * 1.4;
      b.y = b.baseY + Math.sin(b.bobT) * 9;
      if (b.x < -140 || b.x > GAME_W + 140) { b.destroy(); this.flocks.splice(i, 1); }
    }
  }

  buildHud() {
    // The orb HUD: a framed globe for health, a bar for armour, a segmented
    // bar for how long the ability you drank has left. The fills sit behind
    // the frame and are cropped, so they read as filling a physical vessel.
    const S = 2, X = 10, Y = 8;
    const at = (key, ox, oy) => this.add.image(X + ox * S, Y + oy * S, key)
      .setOrigin(0).setScale(S).setScrollFactor(0);

    this.hudOrb = at("hud_orb", 1, 4).setDepth(59);
    this.hudArmour = at("hud_bar_armour", 66, 47).setDepth(59);
    this.hudTime = at("hud_bar_time", 64, 55).setDepth(59);
    at("hud_frame", 0, 0).setDepth(60);

    // The count sits inside the globe, where the eye already is.
    this.hudHp = this.add.text(X + 28 * S, Y + 31 * S, "", {
      fontFamily: FONT, fontSize: "18px", color: "#fff1ec",
      stroke: "#3a0606", strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(62);

    // Active abilities, shown as icon + seconds remaining.
    this.buffSlots = Object.keys(ABILITIES).filter((key) => ABILITIES[key].seconds)
      .map((key) => ({
        key,
        icon: this.add.image(0, 184, ABILITIES[key].icon)
          .setScale(0.62).setScrollFactor(0).setDepth(60).setVisible(false),
        text: this.add.text(0, 176, "", {
          fontFamily: FONT, fontSize: "13px", color: "#cfe9f2",
          stroke: "#08131a", strokeThickness: 3,
        }).setScrollFactor(0).setDepth(61).setVisible(false),
      }));

    // The satchel: what you are carrying and the key that drinks it. Always
    // visible, because an ability you forget you own may as well not exist.
    this.slotHud = Object.keys(ABILITIES).map((key, i) => {
      const sx = X + 4 + i * 54, sy = 218;
      return {
        key,
        frame: this.add.rectangle(sx, sy, 46, 46, 0x120e18, 0.62)
          .setOrigin(0).setScrollFactor(0).setDepth(59)
          .setStrokeStyle(2, 0x4a3a28),
        icon: this.add.image(sx + 23, sy + 21, ABILITIES[key].icon)
          .setScale(0.62).setScrollFactor(0).setDepth(60),
        key_: this.add.text(sx + 4, sy + 2, `${i + 1}`, {
          fontFamily: FONT, fontSize: "11px", color: "#9c8f7f",
        }).setScrollFactor(0).setDepth(61),
        count: this.add.text(sx + 42, sy + 30, "", {
          fontFamily: FONT, fontSize: "14px", color: "#ffe6b3",
          stroke: "#0a0810", strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(61),
      };
    });

    // Says nothing at all until you are carrying one. Before that, as far as
    // the game is concerned, there is nothing to collect.
    this.shardText = this.add.text(GAME_W - 24, 74, "", {
      fontFamily: FONT, fontSize: "14px", color: "#ffc46e",
      stroke: "#0a0810", strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60).setVisible(false);

    this.livesText = this.add.text(X + 4, Y + 66 * S, "", {
      fontFamily: FONT, fontSize: "15px", color: "#e8dccb",
      stroke: "#0a0810", strokeThickness: 4,
    }).setScrollFactor(0).setDepth(60);
    this.scoreText = this.add.text(GAME_W - 24, 24, "", {
      fontFamily: FONT, fontSize: "18px", color: "#ffe6b3",
      stroke: "#0a0810", strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.godText = this.add.text(GAME_W / 2, 48, "INVINCIBLE", {
      fontFamily: FONT, fontSize: "14px", color: "#ffe066",
      backgroundColor: "#00000066", padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(61).setVisible(GameState.godMode);
    this.add.text(GAME_W - 24, 50, "F: fullscreen   M: sound", {
      fontFamily: FONT, fontSize: "12px", color: "#8d8275",
      stroke: "#0a0810", strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.levelText = this.add.text(GAME_W / 2, 24,
      `CHAPTER ${GameState.levelIndex + 1} — ${this.level.name}`, {
        fontFamily: FONT, fontSize: "15px", color: "#cdbfae",
        stroke: "#0a0810", strokeThickness: 4,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(60);

    if (this.level.boss) {
      this.bossBarBg = this.add.rectangle(GAME_W / 2, GAME_H - 34, 520, 18, 0x1a1016)
        .setScrollFactor(0).setDepth(60).setStrokeStyle(2, 0x7a5a4a);
      this.bossBar = this.add.rectangle(GAME_W / 2 - 258, GAME_H - 34, 516, 14, 0xc3452f)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(61);
      this.bossName = this.add.text(GAME_W / 2, GAME_H - 56, "FOREST DRAGON", {
        fontFamily: FONT, fontSize: "14px", color: "#ffb9a0",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(61);
    }
    this.refreshHud();
  }

  refreshHud() {
    this.godText?.setVisible(GameState.godMode);

    // Health drains the orb from the top, like a vessel emptying. The crop is
    // in texture pixels, so it is independent of the HUD's scale.
    const hp = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    const oh = 54;
    this.hudOrb.setCrop(0, oh * (1 - hp), 56, oh * hp);
    this.hudHp.setText(`${this.player.hp}/${this.player.maxHp}`);

    // Armour empties left to right, and the bar is only as long as the plates
    // you can actually hold - the Ward buff widens it.
    const maxArmor = this.player.maxArmor;
    const armour = Phaser.Math.Clamp(this.player.armor / maxArmor, 0, 1);
    this.hudArmour.setCrop(0, 0, 32 * armour, 4);

    // The blue bar is the ability you drank, running out.
    let best = 0;
    for (const key of Object.keys(ABILITIES)) {
      const ab = ABILITIES[key];
      if (!ab.seconds) continue;
      best = Math.max(best, Buffs.remaining(key) / ab.seconds);
    }
    this.hudTime.setCrop(0, 0, 49 * Phaser.Math.Clamp(best, 0, 1), 6);

    // Live buffs pack to the left, so one buff never floats in the middle.
    let slotIndex = 0;
    this.buffSlots.forEach((slot) => {
      const left = Buffs.remaining(slot.key);
      slot.icon.setVisible(left > 0);
      slot.text.setVisible(left > 0).setText(left > 0 ? `${left}s` : "");
      if (left > 0) {
        slot.icon.setX(30 + slotIndex * 62);
        slot.text.setX(46 + slotIndex * 62);
        slotIndex += 1;
      }
    });
    // The satchel greys out what you do not have, rather than hiding it, so
    // the slot numbers never shuffle under your fingers.
    this.slotHud.forEach((slot) => {
      const held = Satchel.count(slot.key);
      slot.icon.setAlpha(held ? 1 : 0.25);
      slot.frame.setStrokeStyle(2, held ? 0xb99b6a : 0x3a2f22);
      slot.count.setText(held ? `x${held}` : "");
    });

    const shards = GameState.shardCount();
    this.shardText.setVisible(shards > 0)
      .setText(shards > 0 ? `PANEL  ${shards}/${SHARD_TOTAL}` : "");

    this.livesText.setText(`LIVES x${GameState.lives}`);
    this.scoreText.setText(`CRYSTALS  ${GameState.score}`);
  }

  updateBossBar() {
    if (!this.bossBar) return;
    const frac = Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1);
    this.bossBar.width = 516 * frac;
  }

  bindInput() {
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: K.A, right: K.D, up: K.W, jump: K.SPACE,
      attack: K.J, attack2: K.X, dash: K.SHIFT, dash2: K.L,
      talk: K.E, enter: K.ENTER,
      down: K.S, quit: K.Q, esc: K.ESC, use: K.U,
    });
    // 1-5 drink whatever is in that satchel slot, without stopping to shop.
    this.slotKeys = Object.keys(ABILITIES).map((_, i) =>
      this.input.keyboard.addKey(K.ONE + i));
  }

  // ---------------------------------------------------- gameplay events
  collect(gem) {
    if (!gem.active) return;
    gem.disableBody(true, true);
    Sound.play("pickup", { x: gem.x });
    GameState.score += 1;
    this.refreshHud();
    const spark = this.add.image(gem.x, gem.y, "particle").setDepth(30).setTint(0x7fe0ff);
    this.tweens.add({
      targets: spark, y: gem.y - 40, alpha: 0, scale: 3,
      duration: 420, onComplete: () => spark.destroy(),
    });
  }

  touchCheckpoint(cp) {
    if (cp.activated) return;
    cp.activated = true;
    cp.setFrame(1);
    Sound.play("checkpoint", { x: cp.x });
    this.spawnX = cp.x;
    GameState.checkpointX = cp.x;
    const msg = this.add.text(cp.x, GROUND_Y - 130, "Checkpoint", {
      fontFamily: FONT, fontSize: "14px", color: "#ffd98a",
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: msg, y: GROUND_Y - 170, alpha: 0, duration: 1100, onComplete: () => msg.destroy() });
  }

  // Sword hit: a box in front of the player, checked on the swing's active frames.
  playerHitCheck(player) {
    const reach = 92;
    const damage = Buffs.has("whet") ? 2 : 1;
    const box = new Phaser.Geom.Rectangle(
      player.facing > 0 ? player.x : player.x - reach,
      player.y - 50, reach, 96
    );
    let hitSomething = false;

    this.enemies.getChildren().forEach((en) => {
      if (!en.alive_) return;
      if (Phaser.Geom.Rectangle.Overlaps(box, en.getBounds())) {
        en.takeDamage(damage, player.x);
        hitSomething = true;
      }
    });
    if (this.boss && this.boss.alive_ &&
        Phaser.Geom.Rectangle.Overlaps(box, this.boss.getBounds())) {
      this.boss.takeDamage(damage, player.x);
      hitSomething = true;
    }
    this.fireballs.getChildren().forEach((ball) => {
      if (ball.active && Phaser.Geom.Rectangle.Overlaps(box, ball.getBounds())) {
        this.killFireball(ball);
        hitSomething = true;
      }
    });

    // Ember Flask: the swing throws heat into everything close by.
    if (hitSomething && Buffs.has("ember")) {
      this.enemies.getChildren().forEach((en) => {
        if (en.alive_ && Phaser.Math.Distance.Between(en.x, en.y, player.x, player.y) < 180) {
          en.takeDamage(1, player.x);
        }
      });
      const burst = this.add.image(player.x, player.y - 10, "particle")
        .setTint(0xff9a3c).setScale(5).setDepth(29);
      this.tweens.add({ targets: burst, alpha: 0, scale: 16, duration: 280,
                        onComplete: () => burst.destroy() });
    }

    if (hitSomething) {
      this.cameras.main.shake(90, 0.005);
      const fx = this.add.image(player.x + player.facing * 56, player.y - 6, "particle")
        .setTint(0xfff0c0).setScale(4).setDepth(30);
      this.tweens.add({ targets: fx, alpha: 0, scale: 7, duration: 180, onComplete: () => fx.destroy() });
    }
  }

  killFireball(ball) {
    ball.body.enable = false;
    ball.setActive(false).setVisible(false);
    ball.setVelocity(0, 0);
  }

  onEnemyKilled(enemy) {
    GameState.score += 2;
    this.player.gainArmor();
    this.refreshHud();
  }

  showCheatToast() {
    const on = GameState.godMode;
    const msg = this.add.text(GAME_W / 2, GAME_H / 2 - 60,
      on ? "INVINCIBLE MODE ON" : "INVINCIBLE MODE OFF", {
        fontFamily: FONT, fontSize: "26px",
        color: on ? "#ffe066" : "#c9bcae",
        stroke: "#241a10", strokeThickness: 6,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({
      targets: msg, y: GAME_H / 2 - 110, alpha: 0, duration: 1400,
      onComplete: () => msg.destroy(),
    });
    this.refreshHud();
  }

  onArmorChanged(what) {
    this.refreshHud();
    if (what === "broken") {
      this.cameras.main.flash(120, 180, 210, 255);
      for (let i = 0; i < 9; i++) { // plates flying off
        const shard = this.add.image(this.player.x, this.player.y - 20, "particle")
          .setTint(0x9fd4ff).setScale(2.2).setDepth(30);
        this.tweens.add({
          targets: shard,
          x: this.player.x + Phaser.Math.Between(-110, 110),
          y: this.player.y - 20 + Phaser.Math.Between(-80, 50),
          alpha: 0, scale: 0.4, duration: 420,
          onComplete: () => shard.destroy(),
        });
      }
    } else if (what === "hit") {
      this.shieldFx?.setAlpha(1);
    }
  }

  onPlayerDeath() {
    this.spillCrystals(DEATH_PENALTY);
    // Hold the camera long enough to watch the crystals bounce away before
    // the screen goes: the loss is meant to be seen, not just tallied.
    this.time.delayedCall(850, () => this.cameras.main.fade(600, 0, 0, 0));
    this.time.delayedCall(1500, () => {
      GameState.lives -= 1;
      if (GameState.lives <= 0) this.scene.start("gameover");
      else this.scene.restart();
    });
  }

  // A line of text that rises off the knight and fades. Used for anything the
  // player needs told immediately without a panel opening.
  floatNote(text, colour = "#ffe6b3") {
    const note = this.add.text(this.player.x, this.player.y - 74, text, {
      fontFamily: FONT, fontSize: "15px", color: colour,
      stroke: "#0a0810", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: note, y: note.y - 44, alpha: 0, duration: 1100,
                      onComplete: () => note.destroy() });
  }

  // Drinking something should look like it did something.
  flashAbility(key) {
    const ab = ABILITIES[key];
    this.floatNote(ab.name, "#9ce8a8");
    const burst = this.add.image(this.player.x, this.player.y - 10, "light")
      .setTint(0x9ce8ff).setScale(0.18).setAlpha(0.5).setDepth(29)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: burst, alpha: 0, scale: 0.5, duration: 420,
                      onComplete: () => burst.destroy() });
    this.add.particles(this.player.x, this.player.y, "particle", {
      speed: { min: 60, max: 170 }, lifespan: 520, quantity: 14,
      scale: { start: 1, end: 0 }, tint: 0x9ce8ff, blendMode: "ADD",
      emitting: false, angle: { min: 200, max: 340 },
    }).setDepth(29).explode(14);
  }

  // Crystals burst out of the knight and scatter across the ground: the loss
  // is something you see happen, not just a number that drops.
  spillCrystals(amount) {
    const lost = Math.min(amount, GameState.score);
    GameState.score -= lost;
    this.refreshHud();
    if (lost <= 0) return;
    Sound.play("crystalDrop", { x: this.player.x });

    const count = Math.min(14, Math.max(5, Math.round(lost / 2)));
    for (let i = 0; i < count; i++) {
      const gem = this.physics.add.sprite(
        this.player.x + Phaser.Math.Between(-14, 14),
        this.player.y - 26, "crystal");
      gem.play("crystal-spin");
      gem.setDepth(28).setScale(0.85);
      gem.body.setAllowGravity(true);
      gem.setVelocity(Phaser.Math.Between(-260, 260), Phaser.Math.Between(-430, -240));
      gem.setBounce(0.45);
      gem.setDragX(160);
      // Drop the collider with the gem, or it outlives it and trips physics.
      const floor = this.physics.add.collider(gem, this.ground);
      this.tweens.add({
        targets: gem, alpha: 0, delay: 900, duration: 700,
        onComplete: () => { this.physics.world.removeCollider(floor); gem.destroy(); },
      });
    }
    const label = this.add.text(this.player.x, this.player.y - 70, `-${lost}`, {
      fontFamily: FONT, fontSize: "22px", color: "#8fd9e8",
      stroke: "#0a1a20", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: label, y: label.y - 54, alpha: 0, duration: 1200,
                      onComplete: () => label.destroy() });
  }

  // The dragon has stopped. Everything stops with it: the music, the weather,
  // the knight. The silence is the point - it is the only time in the game
  // the score drops out completely.
  onDragonKneels() {
    // The whole health bar goes, name included - it was still sitting behind
    // the dialogue box while the dragon asked its question.
    this.bossBar?.setVisible(false);
    this.bossBarBg?.setVisible(false);
    this.bossName?.setVisible(false);
    this.cameras.main.shake(900, 0.010);
    Sound.stopAmbience();
    Sound.holdBreath(43);
    this.player.rest();

    this.time.delayedCall(1700, () => {
      if (!this.scene.isActive()) return;
      // The third answer is only offered to a knight who heard all six of
      // them and carries the panel they broke up.
      const question = DRAGON_QUESTION.map((line) => {
        if (!line.options) return line;
        return { ...line,
                 options: line.options.filter((o) => !o.secret || GameState.knowsEverything()) };
      });
      this.dialogue.start(question, (answer) => this.answerDragon(answer));
    });
  }

  answerDragon(answer) {
    const reply = DRAGON_REPLY[answer] || DRAGON_REPLY.truth;
    this.dialogue.start(reply, () => this.finishDragon(answer));
  }

  finishDragon(answer) {
    // The answers are named for what the knight says; the endings are named
    // for what they are. Map them here rather than hoping the two vocabularies
    // stay in step - they did not, and "name" quietly fell through to the
    // good ending.
    const ending = { lie: "bad", truth: "good", name: "secret" }[answer] || "good";
    Sound.releaseBreath();
    if (answer === "lie") {
      // It gets back up, and the fight is already over - you just did not
      // know which way.
      this.boss.rise();
      this.cameras.main.shake(600, 0.014);
      this.time.delayedCall(900, () => {
        if (!this.scene.isActive()) return;
        this.boss.spitFire();
        this.player.dead = true;
        this.player.setVelocity(0, -240);
        this.player.play("hero-death");
        Sound.play("death", { x: this.player.x });
        this.cameras.main.fade(1400, 0, 0, 0);
      });
      this.time.delayedCall(2700, () => this.scene.start("ending", { ending }));
      return;
    }
    this.boss.perish();
    this.cameras.main.shake(500, 0.006);
    this.time.delayedCall(2900, () => this.scene.start("ending", { ending }));
  }

  completeLevel() {
    if (this.levelComplete) return;
    this.levelComplete = true;
    Sound.play("levelClear");
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameras.main.fade(800, 0, 0, 0);
    this.time.delayedCall(850, () => {
      GameState.levelIndex += 1;
      GameState.checkpointX = null;
      // The last chapter does not end at a gate - it ends at the dragon's
      // question - so this only ever leads to the next chapter card.
      this.scene.start("story");
    });
  }

  // ---------------------------------------------------- frame loop
  update(time) {
    // The sky keeps moving whatever else is happening - a frozen sky behind an
    // open shop menu is the thing that gives a backdrop away.
    this.driftSky(this.game.loop.delta / 1000);

    // The market owns the keyboard while it is open.
    if (this.market.open) {
      this.player.rest();
      this.player.invulnUntil = Math.max(this.player.invulnUntil, time + 200);
      this.enemies.getChildren().forEach((en) => en.setVelocity(0, 0));
      const k = this.keys, c = this.cursors;
      if (Phaser.Input.Keyboard.JustDown(c.up) || Phaser.Input.Keyboard.JustDown(k.up)) this.market.move(-1);
      if (Phaser.Input.Keyboard.JustDown(c.down) || Phaser.Input.Keyboard.JustDown(k.down)) this.market.move(1);
      if (Phaser.Input.Keyboard.JustDown(k.enter)) this.market.buy();
      if (Phaser.Input.Keyboard.JustDown(k.use)) this.market.use();
      if (Phaser.Input.Keyboard.JustDown(k.quit) || Phaser.Input.Keyboard.JustDown(k.esc)) {
        this.market.hide();
      }
      this.refreshHud();
      return;
    }

    // A conversation freezes play: the knight stops, enemies hold still, and
    // the only input that does anything is "continue".
    if (this.dialogue.active) {
      this.dialogue.update(time);
      this.player.rest();
      this.player.invulnUntil = Math.max(this.player.invulnUntil, time + 200);
      this.enemies.getChildren().forEach((en) => en.setVelocity(0, 0));
      // While an answer is on screen the arrows pick it, exactly as they pick
      // a row in the market - no new control to learn at the worst moment.
      if (this.dialogue.choosing) {
        const c = this.cursors, k = this.keys;
        if (Phaser.Input.Keyboard.JustDown(c.up) || Phaser.Input.Keyboard.JustDown(k.up)) {
          this.dialogue.moveChoice(-1);
        }
        if (Phaser.Input.Keyboard.JustDown(c.down) || Phaser.Input.Keyboard.JustDown(k.down)) {
          this.dialogue.moveChoice(1);
        }
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.talk) ||
          Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.dialogue.advance();
      }
      return;
    }

    this.listenForShard(time);

    const mobs = this.enemies.getChildren();
    this.npcs.forEach((n) => { n.live(time, this.player, mobs); n.refresh(this.player); });
    if (Phaser.Input.Keyboard.JustDown(this.keys.talk)) {
      const who = this.npcs.find((n) => n.inRange(this.player));
      if (who) {
        this.player.setVelocity(0, 0);
        if (who.def.shop) {
          // A merchant greets you once, then it is straight to the stall.
          if (!who.talked && who.def.lines) {
            who.talked = true;
            Sound.play("select", { x: who.x });
            this.dialogue.start(who.def.lines, () => this.market.show());
          } else {
            who.talked = true;
            this.market.show();
          }
        } else {
          Sound.play("select", { x: who.x });
          // Heard, not merely met: the dragon weighs whether you sat through
          // what they had to say, so it is recorded when the exchange ends.
          this.dialogue.start(who.conversation(), () => {
            if (who.def.voice) GameState.heard[who.def.voice] = true;
          });
        }
        return;
      }
    }

    const c = this.cursors, k = this.keys;
    const input = {
      left: c.left.isDown || k.left.isDown,
      right: c.right.isDown || k.right.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(c.up) ||
                   Phaser.Input.Keyboard.JustDown(k.up) ||
                   Phaser.Input.Keyboard.JustDown(k.jump),
      jumpHeld: c.up.isDown || k.up.isDown || k.jump.isDown,
    };
    // Reach into the satchel mid-fight: 1-5, and nothing has to pause.
    const abilityKeys = Object.keys(ABILITIES);
    for (let i = 0; i < this.slotKeys.length; i++) {
      if (!Phaser.Input.Keyboard.JustDown(this.slotKeys[i])) continue;
      const res = useAbility(this, abilityKeys[i]);
      if (!res.ok) this.floatNote(res.text, "#e08a7a");
    }

    if (Phaser.Input.Keyboard.JustDown(k.attack) || Phaser.Input.Keyboard.JustDown(k.attack2)) {
      this.player.attack();
    }
    if (Phaser.Input.Keyboard.JustDown(k.dash) || Phaser.Input.Keyboard.JustDown(k.dash2)) {
      this.player.dash();
    }
    this.player.handleInput(input);

    this.enemies.getChildren().forEach((en) => en.tick(this.player));
    if (this.boss) {
      this.boss.tick(time, this.player);
      // The score follows the fight: every point of the dragon's health it
      // loses lets another layer of the theme in.
      if (this.boss.alive_) Sound.setIntensity(1 - this.boss.hp / this.boss.maxHp);
    }

    this.fireballs.getChildren().forEach((ball) => {
      if (!ball.active) return;
      if (ball.x < 0 || ball.x > this.levelWidth || ball.y < -100 || ball.y > GAME_H + 100) {
        this.killFireball(ball);
      }
    });

    // Pits are lethal - unless the cheat is on, in which case the player is
    // simply lifted back to the last safe spot with health untouched.
    if (!this.player.dead && this.player.y > GAME_H + 120) {
      if (GameState.godMode) {
        this.player.setVelocity(0, 0);
        this.player.setPosition(this.spawnX, GROUND_Y - 140);
      } else {
        this.player.hp = 0;
        this.player.die();
      }
    }

    if (this.shieldFx) {
      const on = this.player.armor > 0 && !this.player.dead;
      this.shieldFx.setVisible(on);
      if (on) {
        this.shieldFx.setPosition(this.player.x - 2, this.player.y - 6);
        // thinner shell as the plates run out, with a slow pulse
        const strength = this.player.armor / this.player.maxArmor;
        const pulse = 0.8 + Math.sin(time / 260) * 0.12;
        this.shieldFx.setAlpha(Phaser.Math.Clamp(0.25 + strength * 0.5, 0, 1) * pulse);
        this.shieldFx.setScale(0.9 + strength * 0.18);
      }
    }

    const camX = this.cameras.main.scrollX;
    Sound.setListener(camX + GAME_W / 2); // stereo placement follows the camera
    this.farLayer.tilePositionX = camX * 0.25;
    this.nearLayer.tilePositionX = camX * 0.55;

    if (this.darkness) this.drawDarkness();
    this.refreshHud();
  }

  drawDarkness() {
    const cam = this.cameras.main;
    const half = LIGHT_SIZE / 2; // erase() takes a top-left corner, not a centre
    this.darkness.clear();
    this.darkness.fill(0x05060f, 0.88);
    this.darkness.erase("light", this.player.x - cam.scrollX - half,
                                 this.player.y - cam.scrollY - half);
    for (const l of this.lanterns) {
      const lx = l.x - cam.scrollX;
      if (lx < -LIGHT_SIZE || lx > GAME_W + LIGHT_SIZE) continue;
      this.darkness.erase("light", lx - half, l.y - cam.scrollY - half);
    }
  }
}

// ======================================================= GAME OVER
class GameOverScene extends Phaser.Scene {
  constructor() { super("gameover"); }

  create() {
    Sound.stopMusic();
    Sound.stopAmbience();
    Sound.play("gameOver");
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0508).setOrigin(0);
    this.add.text(GAME_W / 2, 190, "THE DARK HAS WON", {
      fontFamily: FONT, fontSize: "40px", color: "#e0564a",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 250, "The forest swallowed your last step.", {
      fontFamily: FONT, fontSize: "17px", color: "#cbbcae",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 310, `Crystals gathered: ${GameState.score}`, {
      fontFamily: FONT, fontSize: "18px", color: "#8fd9e8",
    }).setOrigin(0.5);

    const p = this.add.text(GAME_W / 2, 390, "ENTER  to try again", {
      fontFamily: FONT, fontSize: "19px", color: "#ffe6b3",
    }).setOrigin(0.5);
    this.tweens.add({ targets: p, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.play("select");
      GameState.lives = 3;
      GameState.checkpointX = null;
      this.scene.start("story");
    });
  }
}

// ======================================================= ENDING
class EndingScene extends Phaser.Scene {
  constructor() { super("ending"); }

  // One scene, three endings. Which one arrives is decided at the dragon's
  // knee and handed in as scene data.
  create(data) {
    const key = (data && data.ending) || "good";
    const ending = ENDINGS[key] || ENDINGS.good;

    Sound.stopAmbience();
    Sound.releaseBreath();
    Sound.setEnvironment(ending.music);
    Sound.startMusic(ending.music);

    this.add.image(0, 0, "sky_valley").setOrigin(0);
    this.add.tileSprite(0, GAME_H - 540, GAME_W, 540, "near_valley")
      .setOrigin(0).setAlpha(0.5);
    // Each ending washes the same view in its own colour, so you know which
    // one you are reading before you have read a word of it.
    this.add.rectangle(0, 0, GAME_W, GAME_H, ending.tint, 0.82).setOrigin(0);

    this.add.text(GAME_W / 2, 56, ending.title, {
      fontFamily: FONT, fontSize: "15px", color: "#9c8f7f",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 88, ending.heading, {
      fontFamily: FONT, fontSize: "25px", color: "#ffd9a0",
      stroke: "#1a0f08", strokeThickness: 6,
      wordWrap: { width: GAME_W - 120 }, align: "center",
    }).setOrigin(0.5);
    this.add.rectangle(GAME_W / 2, 118, 380, 2, 0xb99b6a, 0.8);

    ending.lines.forEach((line, i) => {
      const t = this.add.text(GAME_W / 2, 164 + i * 44, line, {
        fontFamily: FONT, fontSize: "16px", color: "#e2d8ca", align: "center",
        wordWrap: { width: GAME_W - 150 },
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 600 + i * 1200 });
    });

    // The knight only walks out of two of these.
    if (key !== "bad") {
      const knight = this.add.sprite(GAME_W - 130, GAME_H - 54, "hero")
        .setScale(HERO_SCALE).setAlpha(0);
      knight.play("hero-idle");
      this.tweens.add({ targets: knight, alpha: 1, duration: 1400, delay: 1400 });
    }

    const wait = 700 + ending.lines.length * 1200;
    const score = this.add.text(GAME_W / 2, GAME_H - 96, `Crystals gathered: ${GameState.score}`, {
      fontFamily: FONT, fontSize: "16px", color: "#8fd9e8",
    }).setOrigin(0.5).setAlpha(0);
    const again = this.add.text(GAME_W / 2, GAME_H - 58, "ENTER  to return to the title", {
      fontFamily: FONT, fontSize: "16px", color: "#ffe6b3",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [score, again], alpha: 1, duration: 800, delay: wait });

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.play("select");
      this.scene.start("title");
    });
  }
}
