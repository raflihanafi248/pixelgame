// Scenes: boot/loading, title, story cards, gameplay, game over, ending.

const GameState = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  checkpointX: null, // survives the scene restart that follows a death
  godMode: false,    // cheat: set by typing the code below, survives restarts
  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.checkpointX = null;
    Buffs.clear();
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

const FONT = "monospace";
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
    this.load.image("valley_tree", ASSET_DATA.valley_tree);
    this.load.image("valley_pine", ASSET_DATA.valley_pine);
    this.load.image("valley_grass", ASSET_DATA.valley_grass);
    this.load.image("light", ASSET_DATA.light);
    this.load.image("particle", ASSET_DATA.particle);

    this.load.spritesheet("hero", ASSET_DATA.hero, { frameWidth: 128, frameHeight: 64 });
    this.load.spritesheet("goblin", ASSET_DATA.goblin, { frameWidth: 56, frameHeight: 72 });
    this.load.spritesheet("wolf", ASSET_DATA.wolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("icewolf", ASSET_DATA.icewolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("slime", ASSET_DATA.slime, { frameWidth: 56, frameHeight: 44 });
    this.load.spritesheet("bat", ASSET_DATA.bat, { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet("wraith", ASSET_DATA.wraith, { frameWidth: 60, frameHeight: 80 });
    this.load.spritesheet("dragon", ASSET_DATA.dragon, { frameWidth: 256, frameHeight: 192 });
    this.load.spritesheet("fireball", ASSET_DATA.fireball, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet("crystal", ASSET_DATA.crystal, { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("heart", ASSET_DATA.heart, { frameWidth: 32, frameHeight: 28 });
    this.load.spritesheet("armor", ASSET_DATA.armor, { frameWidth: 30, frameHeight: 32 });
    this.load.image("shield", ASSET_DATA.shield);
    for (const npc of ["maren", "bram", "gethin", "yvane", "wisp", "merchant"]) {
      this.load.spritesheet(`npc_${npc}`, ASSET_DATA[`npc_${npc}`], { frameWidth: 64, frameHeight: 80 });
      this.load.image(`portrait_${npc}`, ASSET_DATA[`portrait_${npc}`]);
    }
    this.load.image("portrait_knight", ASSET_DATA.portrait_knight);
    this.load.spritesheet("companion", ASSET_DATA.companion, { frameWidth: 96, frameHeight: 64 });
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
    for (const npc of ["maren", "bram", "gethin", "yvane", "merchant"]) {
      A.create({ key: `npc-${npc}`, frames: A.generateFrameNumbers(`npc_${npc}`, { start: 0, end: 1 }),
                 frameRate: 2, repeat: -1 });
    }
    A.create({ key: "npc-wisp", frames: A.generateFrameNumbers("npc_wisp", { start: 0, end: 3 }),
               frameRate: 6, repeat: -1 });
    A.create({ key: "dog-idle", frames: A.generateFrameNumbers("companion", { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
    A.create({ key: "dog-run", frames: A.generateFrameNumbers("companion", { start: 2, end: 5 }), frameRate: 13, repeat: -1 });
    A.create({ key: "dog-attack", frames: A.generateFrameNumbers("companion", { start: 6, end: 7 }), frameRate: 12 });
    A.create({ key: "dog-hurt", frames: A.generateFrameNumbers("companion", { start: 8, end: 8 }), frameRate: 3 });
    A.create({ key: "crystal-spin", frames: A.generateFrameNumbers("crystal", { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

    this.scene.start("title");
  }
}

// ======================================================= TITLE
class TitleScene extends Phaser.Scene {
  constructor() { super("title"); }

  create() {
    this.add.image(0, 0, "sky_valley").setOrigin(0).setScrollFactor(0);
    this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, "far_valley").setOrigin(0).setAlpha(0.85);
    this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, "near_valley").setOrigin(0);
    this.add.image(60, GAME_H - 20, "valley_tree").setOrigin(0.5, 1).setScale(0.8).setAlpha(0.9);
    this.add.image(GAME_W - 70, GAME_H - 10, "valley_pine").setOrigin(0.5, 1).setAlpha(0.9);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x140c08, 0.42).setOrigin(0);

    // The knight stands at the bottom; all copy sits above him so nothing overlaps.
    const knight = this.add.sprite(GAME_W / 2, 456, "hero").setScale(HERO_SCALE);
    knight.play("hero-idle");

    this.add.text(GAME_W / 2, 86, "THE LAST KNIGHT", {
      fontFamily: FONT, fontSize: "50px", color: "#ffd9a0", stroke: "#2a1410", strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 142, "A Pixel Forest Adventure", {
      fontFamily: FONT, fontSize: "26px", color: "#f0e6d2", stroke: "#2a1410", strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 184, "The forest guardian, and the wrath of the dragon", {
      fontFamily: FONT, fontSize: "15px", color: "#e4d6c2",
      stroke: "#1c1108", strokeThickness: 4,
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_W / 2, 240, "Press  ENTER  to begin", {
      fontFamily: FONT, fontSize: "22px", color: "#ffe6b3",
      stroke: "#1c1108", strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(GAME_W / 2, 340,
      "A / D  or  ←  →   move\nW / ↑ / SPACE   jump (hold to jump higher)\nJ   attack (3-hit combo)      SHIFT   dash\nE   talk / trade      M   sound on / off      F   fullscreen\n\nDefeat an enemy to earn ARMOUR — it soaks up 3 hits\nSpend crystals at a merchant. Fall, and you drop 25 of them.\nThe wolf hunts beside you and cannot be killed.",
      { fontFamily: FONT, fontSize: "14px", color: "#dccab4", align: "center",
        lineSpacing: 6, stroke: "#1c1108", strokeThickness: 3 }
    ).setOrigin(0.5);

    Sound.resume();
    Sound.setEnvironment("title");
    Sound.startMusic("title");

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.resume();
      Sound.play("select");
      GameState.reset();
      this.scene.start("story");
    });
  }
}

// ======================================================= STORY CARD
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
    if (this.theme === "valley") {
      this.buildValleyProps();
    } else {
      // Wooden fences belong to the forest, not to caves or the dragon's lair.
      const noFences = this.theme === "cave" || this.theme === "lair";
      for (let x = 500; x < this.level.width - 300; x += 860) {
        if (this.inGap(x) || noFences) continue;
        this.add.image(x, GROUND_Y, "fence").setOrigin(0, 1).setDepth(6).setAlpha(0.95);
      }
    }
    this.lanterns = [];
    for (let x = 700; x < this.level.width - 300; x += 1120) {
      if (this.inGap(x)) continue;
      this.add.image(x, GROUND_Y, "lantern").setOrigin(0.5, 1).setDepth(7);
      this.lanterns.push({ x, y: GROUND_Y - 100 });
    }
  }

  // Chapter 1 is dressed from the Pixel Valley pack: big oaks and pines set
  // back behind the action, with grass tufts along the ground line.
  buildValleyProps() {
    for (let x = 320; x < this.level.width - 200; x += 1180) {
      if (this.inGap(x)) continue;
      this.add.image(x, GROUND_Y + 8, "valley_tree")
        .setOrigin(0.5, 1).setDepth(4).setScale(0.85).setAlpha(0.92);
    }
    for (let x = 900; x < this.level.width - 200; x += 760) {
      if (this.inGap(x)) continue;
      this.add.image(x, GROUND_Y + 6, "valley_pine")
        .setOrigin(0.5, 1).setDepth(5).setScale(0.75).setAlpha(0.95);
    }
    // Sparse tufts behind the action - a continuous band would bury the
    // ground line and the enemies standing on it.
    for (let x = 240; x < this.level.width - 120; x += 640) {
      if (this.inGap(x)) continue;
      this.add.image(x, GROUND_Y + 8, "valley_grass")
        .setOrigin(0.5, 1).setDepth(7).setScale(0.8).setAlpha(0.85)
        .setFlipX((x / 640) % 2 === 0);
    }
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

    // The enemy group must exist before anything collides with it: this scene
    // instance is reused between levels, so a collider registered against a
    // stale `this.enemies` would point at the previous run's destroyed group.
    this.enemies = this.add.group();
    for (const e of this.level.enemies || []) {
      const cfg = ENEMY_TYPES[e.type];
      const y = cfg.flying ? GROUND_Y - 180 : GROUND_Y - 60;
      this.enemies.add(new Enemy(this, e.type, e.x, y));
    }

    this.wolf = new Companion(this, this.spawnX - 70, GROUND_Y - 120);
    this.physics.add.collider(this.wolf, this.ground);
    this.physics.add.collider(this.wolf, this.platforms);
    this.physics.add.overlap(this.wolf, this.enemies, (dog, en) => {
      if (en.alive_) dog.hurtBy(en, this.time.now);
    });

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
  }

  buildWeather() {
    const tint = THEME_TINT[this.theme];
    const speedY = this.theme === "snow" ? { min: 40, max: 90 } : { min: 24, max: 70 };
    this.add.particles(0, 0, "particle", {
      x: { min: 0, max: GAME_W }, y: -12,
      lifespan: 7000, speedY, speedX: { min: -40, max: 16 },
      scale: { min: 0.4, max: 1.3 }, alpha: { start: 0.75, end: 0.15 },
      frequency: this.theme === "snow" ? 90 : 260, tint,
    }).setScrollFactor(0).setDepth(42);
  }

  buildHud() {
    this.add.rectangle(0, 0, GAME_W, 76, 0x07060c, 0.42)
      .setOrigin(0).setScrollFactor(0).setDepth(58);
    this.hearts = [];
    for (let i = 0; i < this.player?.maxHp ?? 5; i++) {
      const h = this.add.image(26 + i * 34, 28, "heart", 0).setScrollFactor(0).setDepth(60);
      this.hearts.push(h);
    }
    this.armorPips = [];
    for (let i = 0; i < 5; i++) {   // the Ward buff widens the bar to five
      this.armorPips.push(this.add.image(206 + i * 26, 26, "armor", 1)
        .setScrollFactor(0).setDepth(60).setVisible(false));
    }
    // Active abilities, shown as icon + seconds remaining.
    this.buffSlots = Object.keys(ABILITIES).filter((key) => ABILITIES[key].seconds)
      .map((key, i) => ({
        key,
        icon: this.add.image(28 + i * 62, 96, ABILITIES[key].icon)
          .setScale(0.62).setScrollFactor(0).setDepth(60).setVisible(false),
        text: this.add.text(44 + i * 62, 88, "", {
          fontFamily: FONT, fontSize: "13px", color: "#cfe9f2",
          stroke: "#08131a", strokeThickness: 3,
        }).setScrollFactor(0).setDepth(61).setVisible(false),
      }));
    this.livesText = this.add.text(24, 54, "", {
      fontFamily: FONT, fontSize: "15px", color: "#e8dccb",
    }).setScrollFactor(0).setDepth(60);
    this.scoreText = this.add.text(GAME_W - 24, 24, "", {
      fontFamily: FONT, fontSize: "18px", color: "#ffe6b3",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.godText = this.add.text(GAME_W / 2, 48, "INVINCIBLE", {
      fontFamily: FONT, fontSize: "14px", color: "#ffe066",
      backgroundColor: "#00000066", padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(61).setVisible(GameState.godMode);
    this.add.text(GAME_W - 24, 50, "F: fullscreen   M: sound", {
      fontFamily: FONT, fontSize: "12px", color: "#8d8275",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.levelText = this.add.text(GAME_W / 2, 24,
      `CHAPTER ${GameState.levelIndex + 1} — ${this.level.name}`, {
        fontFamily: FONT, fontSize: "15px", color: "#cdbfae",
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(60);

    if (this.level.boss) {
      this.bossBarBg = this.add.rectangle(GAME_W / 2, GAME_H - 34, 520, 18, 0x1a1016)
        .setScrollFactor(0).setDepth(60).setStrokeStyle(2, 0x7a5a4a);
      this.bossBar = this.add.rectangle(GAME_W / 2 - 258, GAME_H - 34, 516, 14, 0xc3452f)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(61);
      this.add.text(GAME_W / 2, GAME_H - 56, "FOREST DRAGON", {
        fontFamily: FONT, fontSize: "14px", color: "#ffb9a0",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(61);
    }
    this.refreshHud();
  }

  refreshHud() {
    this.godText?.setVisible(GameState.godMode);
    this.hearts.forEach((h, i) => h.setFrame(i < this.player.hp ? 0 : 1));
    const maxArmor = this.player.maxArmor;
    this.armorPips.forEach((p, i) => {
      p.setVisible(i < maxArmor);
      p.setFrame(i < this.player.armor ? 0 : 1);
    });
    // Live buffs pack to the left, so one buff never floats in the middle.
    let slotIndex = 0;
    this.buffSlots.forEach((slot) => {
      const left = Buffs.remaining(slot.key);
      slot.icon.setVisible(left > 0);
      slot.text.setVisible(left > 0).setText(left > 0 ? `${left}s` : "");
      if (left > 0) {
        slot.icon.setX(28 + slotIndex * 62);
        slot.text.setX(44 + slotIndex * 62);
        slotIndex += 1;
      }
    });
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
      down: K.S, quit: K.Q, esc: K.ESC,
    });
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

  onBossDefeated() {
    this.bossBar?.setVisible(false);
    this.bossBarBg?.setVisible(false);
    this.cameras.main.shake(700, 0.012);
    this.tweens.add({
      targets: this.boss, alpha: 0, y: this.boss.y - 40, duration: 2200,
      onComplete: () => {
        this.boss.destroy();
        this.spawnGate(this.levelWidth - 260);
      },
    });
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
      if (GameState.levelIndex >= LEVELS.length) this.scene.start("ending");
      else this.scene.start("story");
    });
  }

  // ---------------------------------------------------- frame loop
  update(time) {
    // The market owns the keyboard while it is open.
    if (this.market.open) {
      this.player.setVelocityX(0);
      this.player.play("hero-idle", true);
      this.player.invulnUntil = Math.max(this.player.invulnUntil, time + 200);
      this.enemies.getChildren().forEach((en) => en.setVelocity(0, 0));
      const k = this.keys, c = this.cursors;
      if (Phaser.Input.Keyboard.JustDown(c.up) || Phaser.Input.Keyboard.JustDown(k.up)) this.market.move(-1);
      if (Phaser.Input.Keyboard.JustDown(c.down) || Phaser.Input.Keyboard.JustDown(k.down)) this.market.move(1);
      if (Phaser.Input.Keyboard.JustDown(k.enter)) this.market.buy();
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
      this.player.setVelocityX(0);
      this.player.play("hero-idle", true);
      this.player.invulnUntil = Math.max(this.player.invulnUntil, time + 200);
      this.enemies.getChildren().forEach((en) => en.setVelocity(0, 0));
      if (Phaser.Input.Keyboard.JustDown(this.keys.talk) ||
          Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.dialogue.advance();
      }
      return;
    }

    this.npcs.forEach((n) => n.refresh(this.player));
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
          this.dialogue.start(who.conversation());
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
    if (Phaser.Input.Keyboard.JustDown(k.attack) || Phaser.Input.Keyboard.JustDown(k.attack2)) {
      this.player.attack();
    }
    if (Phaser.Input.Keyboard.JustDown(k.dash) || Phaser.Input.Keyboard.JustDown(k.dash2)) {
      this.player.dash();
    }
    this.player.handleInput(input);

    this.wolf.tick(time, this.player, this.enemies.getChildren());
    this.enemies.getChildren().forEach((en) => en.tick(this.player));
    if (this.boss) this.boss.tick(time, this.player);

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

  create() {
    Sound.stopAmbience();
    Sound.setEnvironment("ending");
    Sound.startMusic("ending");
    this.add.image(0, 0, "sky_valley").setOrigin(0);
    this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, "near_valley").setOrigin(0).setAlpha(0.6);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0710, 0.65).setOrigin(0);

    this.add.text(GAME_W / 2, 90, "THE FOREST DRAWS BREATH AGAIN", {
      fontFamily: FONT, fontSize: "26px", color: "#ffd9a0",
    }).setOrigin(0.5);

    ENDING_LINES.forEach((line, i) => {
      const t = this.add.text(GAME_W / 2, 180 + i * 46, line, {
        fontFamily: FONT, fontSize: "17px", color: "#e2d8ca", align: "center",
        wordWrap: { width: GAME_W - 160 },
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 800, delay: 500 + i * 1100 });
    });

    // Off to the side so he never sits under the closing lines.
    const knight = this.add.sprite(GAME_W - 150, GAME_H - 66, "hero").setScale(HERO_SCALE).setAlpha(0);
    knight.play("hero-idle");
    this.tweens.add({ targets: knight, alpha: 1, duration: 1200, delay: 1200 });

    const score = this.add.text(GAME_W / 2, 390, `Crystals gathered: ${GameState.score}`, {
      fontFamily: FONT, fontSize: "18px", color: "#8fd9e8",
    }).setOrigin(0.5).setAlpha(0);
    const again = this.add.text(GAME_W / 2, 430, "ENTER  to return to the title", {
      fontFamily: FONT, fontSize: "17px", color: "#ffe6b3",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [score, again], alpha: 1, duration: 800, delay: 500 + ENDING_LINES.length * 1100 });

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.play("select");
      this.scene.start("title");
    });
  }
}
