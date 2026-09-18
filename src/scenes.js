// Scenes: boot/loading, title, story cards, gameplay, game over, ending.

const GameState = {
  levelIndex: 0,
  score: 0,
  lives: 3,
  checkpointX: null, // survives the scene restart that follows a death
  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.lives = 3;
    this.checkpointX = null;
  },
};

const FONT = "monospace";
const THEME_TINT = {
  autumn: 0xffb066, night: 0x93a6ff, cave: 0xb79bff, snow: 0xffffff, lair: 0xff8a6a,
};

// ======================================================= BOOT
class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }

  preload() {
    // Every image is an embedded base64 data URI (src/assets_data.js), so the
    // game runs from file:// with no server and no CORS trouble.
    for (const theme of ["autumn", "night", "cave", "snow", "lair"]) {
      this.load.image(`sky_${theme}`, ASSET_DATA[`sky_${theme}`]);
      this.load.image(`far_${theme}`, ASSET_DATA[`far_${theme}`]);
      this.load.image(`near_${theme}`, ASSET_DATA[`near_${theme}`]);
      this.load.image(`ground_${theme}`, ASSET_DATA[`ground_${theme}`]);
      this.load.image(`platform_${theme}`, ASSET_DATA[`platform_${theme}`]);
    }
    this.load.image("gate", ASSET_DATA.gate);
    this.load.image("fence", ASSET_DATA.fence);
    this.load.image("lantern", ASSET_DATA.lantern);
    this.load.image("spike", ASSET_DATA.spike);
    this.load.image("light", ASSET_DATA.light);
    this.load.image("particle", ASSET_DATA.particle);

    this.load.spritesheet("hero", ASSET_DATA.hero, { frameWidth: 128, frameHeight: 64 });
    this.load.spritesheet("goblin", ASSET_DATA.goblin, { frameWidth: 56, frameHeight: 72 });
    this.load.spritesheet("wolf", ASSET_DATA.wolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("icewolf", ASSET_DATA.icewolf, { frameWidth: 88, frameHeight: 52 });
    this.load.spritesheet("slime", ASSET_DATA.slime, { frameWidth: 56, frameHeight: 44 });
    this.load.spritesheet("bat", ASSET_DATA.bat, { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet("wraith", ASSET_DATA.wraith, { frameWidth: 60, frameHeight: 80 });
    this.load.spritesheet("dragon", ASSET_DATA.dragon, { frameWidth: 192, frameHeight: 152 });
    this.load.spritesheet("fireball", ASSET_DATA.fireball, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet("crystal", ASSET_DATA.crystal, { frameWidth: 36, frameHeight: 36 });
    this.load.spritesheet("heart", ASSET_DATA.heart, { frameWidth: 32, frameHeight: 28 });
    this.load.spritesheet("checkpoint", ASSET_DATA.checkpoint, { frameWidth: 52, frameHeight: 88 });
  }

  create() {
    // Browsers keep audio suspended until the player interacts, so hook
    // both key and pointer input and resume from there.
    Sound.init();
    const wake = () => Sound.resume();
    this.input.keyboard.on("keydown", wake);
    this.input.on("pointerdown", wake);
    this.input.keyboard.on("keydown-M", () => Sound.toggleMute());

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

    A.create({ key: "dragon-idle", frames: A.generateFrameNumbers("dragon", { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
    A.create({ key: "dragon-attack", frames: A.generateFrameNumbers("dragon", { start: 2, end: 3 }), frameRate: 6, repeat: -1 });
    A.create({ key: "dragon-hurt", frames: A.generateFrameNumbers("dragon", { start: 4, end: 4 }), frameRate: 1 });
    A.create({ key: "fireball-fly", frames: A.generateFrameNumbers("fireball", { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
    A.create({ key: "crystal-spin", frames: A.generateFrameNumbers("crystal", { start: 0, end: 3 }), frameRate: 8, repeat: -1 });

    this.scene.start("title");
  }
}

// ======================================================= TITLE
class TitleScene extends Phaser.Scene {
  constructor() { super("title"); }

  create() {
    this.add.image(0, 0, "sky_autumn").setOrigin(0).setScrollFactor(0);
    this.add.tileSprite(0, GAME_H - 480, GAME_W, 480, "far_autumn").setOrigin(0).setAlpha(0.8);
    this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, "near_autumn").setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0710, 0.45).setOrigin(0);

    // The knight stands at the bottom; all copy sits above him so nothing overlaps.
    const knight = this.add.sprite(GAME_W / 2, 456, "hero").setScale(HERO_SCALE);
    knight.play("hero-idle");

    this.add.text(GAME_W / 2, 86, "PIXEL FOREST", {
      fontFamily: FONT, fontSize: "58px", color: "#ffd9a0", stroke: "#2a1410", strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 142, "A D V E N T U R E", {
      fontFamily: FONT, fontSize: "26px", color: "#f0e6d2", stroke: "#2a1410", strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 184, "Kisah Sang Penjaga Hutan & Naga yang Murka", {
      fontFamily: FONT, fontSize: "15px", color: "#c9b8a8",
    }).setOrigin(0.5);

    const prompt = this.add.text(GAME_W / 2, 240, "Tekan  ENTER  untuk memulai", {
      fontFamily: FONT, fontSize: "22px", color: "#ffe6b3",
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(GAME_W / 2, 340,
      "A / D  atau  ←  →   bergerak\nW / ↑ / SPASI   lompat\nJ   serang (combo 3x)\nSHIFT   dash menghindar\nM   nyalakan / matikan suara",
      { fontFamily: FONT, fontSize: "14px", color: "#c4b3a0", align: "center", lineSpacing: 6 }
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

    this.add.text(GAME_W / 2, 120, `BAB ${GameState.levelIndex + 1}`, {
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

    const go = this.add.text(GAME_W / 2, 450, "ENTER  untuk lanjut", {
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
    this.farLayer = this.add.tileSprite(0, GAME_H - 480, GAME_W, 480, `far_${t}`)
      .setOrigin(0).setScrollFactor(0).setDepth(1);
    this.nearLayer = this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, `near_${t}`)
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
        this.ground.create(x + GROUND_TILE / 2, GROUND_Y + r * GROUND_TILE + GROUND_TILE / 2, `ground_${t}`)
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
    // Wooden fences belong to the forest, not to caves or the dragon's lair.
    const noFences = this.theme === "cave" || this.theme === "lair";
    for (let x = 500; x < this.level.width - 300; x += 860) {
      if (this.inGap(x) || noFences) continue;
      this.add.image(x, GROUND_Y, "fence").setOrigin(0, 1).setDepth(6).setAlpha(0.95);
    }
    this.lanterns = [];
    for (let x = 700; x < this.level.width - 300; x += 1120) {
      if (this.inGap(x)) continue;
      this.add.image(x, GROUND_Y, "lantern").setOrigin(0.5, 1).setDepth(7);
      this.lanterns.push({ x, y: GROUND_Y - 100 });
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

    this.enemies = this.add.group();
    for (const e of this.level.enemies || []) {
      const cfg = ENEMY_TYPES[e.type];
      const y = cfg.flying ? GROUND_Y - 180 : GROUND_Y - 60;
      this.enemies.add(new Enemy(this, e.type, e.x, y));
    }

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
    this.livesText = this.add.text(24, 54, "", {
      fontFamily: FONT, fontSize: "15px", color: "#e8dccb",
    }).setScrollFactor(0).setDepth(60);
    this.scoreText = this.add.text(GAME_W - 24, 24, "", {
      fontFamily: FONT, fontSize: "18px", color: "#ffe6b3",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.add.text(GAME_W - 24, 50, "M: suara", {
      fontFamily: FONT, fontSize: "12px", color: "#8d8275",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(60);
    this.levelText = this.add.text(GAME_W / 2, 24,
      `BAB ${GameState.levelIndex + 1} — ${this.level.name}`, {
        fontFamily: FONT, fontSize: "15px", color: "#cdbfae",
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(60);

    if (this.level.boss) {
      this.bossBarBg = this.add.rectangle(GAME_W / 2, GAME_H - 34, 520, 18, 0x1a1016)
        .setScrollFactor(0).setDepth(60).setStrokeStyle(2, 0x7a5a4a);
      this.bossBar = this.add.rectangle(GAME_W / 2 - 258, GAME_H - 34, 516, 14, 0xc3452f)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(61);
      this.add.text(GAME_W / 2, GAME_H - 56, "NAGA HUTAN", {
        fontFamily: FONT, fontSize: "14px", color: "#ffb9a0",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(61);
    }
    this.refreshHud();
  }

  refreshHud() {
    this.hearts.forEach((h, i) => h.setFrame(i < this.player.hp ? 0 : 1));
    this.livesText.setText(`NYAWA x${GameState.lives}`);
    this.scoreText.setText(`KRISTAL  ${GameState.score}`);
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
    const msg = this.add.text(cp.x, GROUND_Y - 130, "Titik aman", {
      fontFamily: FONT, fontSize: "14px", color: "#ffd98a",
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: msg, y: GROUND_Y - 170, alpha: 0, duration: 1100, onComplete: () => msg.destroy() });
  }

  // Sword hit: a box in front of the player, checked on the swing's active frames.
  playerHitCheck(player) {
    const reach = 92;
    const box = new Phaser.Geom.Rectangle(
      player.facing > 0 ? player.x : player.x - reach,
      player.y - 50, reach, 96
    );
    let hitSomething = false;

    this.enemies.getChildren().forEach((en) => {
      if (!en.alive_) return;
      if (Phaser.Geom.Rectangle.Overlaps(box, en.getBounds())) {
        en.takeDamage(1, player.x);
        hitSomething = true;
      }
    });
    if (this.boss && this.boss.alive_ &&
        Phaser.Geom.Rectangle.Overlaps(box, this.boss.getBounds())) {
      this.boss.takeDamage(1, player.x);
      hitSomething = true;
    }
    this.fireballs.getChildren().forEach((ball) => {
      if (ball.active && Phaser.Geom.Rectangle.Overlaps(box, ball.getBounds())) {
        this.killFireball(ball);
        hitSomething = true;
      }
    });

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
    this.refreshHud();
  }

  onPlayerDeath() {
    this.cameras.main.fade(600, 0, 0, 0);
    this.time.delayedCall(640, () => {
      GameState.lives -= 1;
      if (GameState.lives <= 0) this.scene.start("gameover");
      else this.scene.restart();
    });
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

    this.enemies.getChildren().forEach((en) => en.tick(this.player));
    if (this.boss) this.boss.tick(time, this.player);

    this.fireballs.getChildren().forEach((ball) => {
      if (!ball.active) return;
      if (ball.x < 0 || ball.x > this.levelWidth || ball.y < -100 || ball.y > GAME_H + 100) {
        this.killFireball(ball);
      }
    });

    // pits are lethal
    if (!this.player.dead && this.player.y > GAME_H + 120) {
      this.player.hp = 0;
      this.player.die();
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
    this.add.text(GAME_W / 2, 190, "KEGELAPAN MENANG", {
      fontFamily: FONT, fontSize: "40px", color: "#e0564a",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 250, "Hutan menelan langkahmu yang terakhir.", {
      fontFamily: FONT, fontSize: "17px", color: "#cbbcae",
    }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 310, `Kristal terkumpul: ${GameState.score}`, {
      fontFamily: FONT, fontSize: "18px", color: "#8fd9e8",
    }).setOrigin(0.5);

    const p = this.add.text(GAME_W / 2, 390, "ENTER  untuk mencoba lagi", {
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
    this.add.image(0, 0, "sky_autumn").setOrigin(0);
    this.add.tileSprite(0, GAME_H - 600, GAME_W, 600, "near_autumn").setOrigin(0).setAlpha(0.5);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0710, 0.65).setOrigin(0);

    this.add.text(GAME_W / 2, 90, "HUTAN MENARIK NAPASNYA KEMBALI", {
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

    const score = this.add.text(GAME_W / 2, 390, `Kristal terkumpul: ${GameState.score}`, {
      fontFamily: FONT, fontSize: "18px", color: "#8fd9e8",
    }).setOrigin(0.5).setAlpha(0);
    const again = this.add.text(GAME_W / 2, 430, "ENTER  untuk kembali ke judul", {
      fontFamily: FONT, fontSize: "17px", color: "#ffe6b3",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [score, again], alpha: 1, duration: 800, delay: 500 + ENDING_LINES.length * 1100 });

    this.input.keyboard.once("keydown-ENTER", () => {
      Sound.play("select");
      this.scene.start("title");
    });
  }
}
