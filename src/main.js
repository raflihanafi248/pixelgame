const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const GROUND_TILE = 64; // scaled ground tile size
const GROUND_H = 2; // tiles thick
const LEVEL_WIDTH = 4800;

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  preload() {
    // Assets are loaded from embedded base64 data URIs (src/assets_data.js)
    // rather than plain file paths, so the game also works when index.html
    // is opened directly (file://), where browsers block the XHR requests
    // Phaser's loader would otherwise make to fetch plain image files.
    this.load.image("sky", ASSET_DATA.sky);
    this.load.image("trees_far", ASSET_DATA.trees_far);
    this.load.image("trees_near", ASSET_DATA.trees_near);
    this.load.image("ground", ASSET_DATA.ground);
    this.load.image("fence", ASSET_DATA.fence);
    this.load.image("lantern", ASSET_DATA.lantern);
    this.load.image("gate", ASSET_DATA.gate);
    this.load.spritesheet("hero", ASSET_DATA.hero, {
      frameWidth: 64,
      frameHeight: 96,
    });
    this.load.spritesheet("goblin", ASSET_DATA.goblin, {
      frameWidth: 56,
      frameHeight: 72,
    });
    this.load.spritesheet("wolf", ASSET_DATA.wolf, {
      frameWidth: 88,
      frameHeight: 52,
    });
    this.load.spritesheet("slime", ASSET_DATA.slime, {
      frameWidth: 56,
      frameHeight: 44,
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, GAME_HEIGHT);

    // --- parallax background layers ---
    this.skyLayer = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "sky")
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.farLayer = this.add
      .tileSprite(0, GAME_HEIGHT - 480, GAME_WIDTH, 480, "trees_far")
      .setOrigin(0, 0)
      .setScrollFactor(0.25, 0);

    this.nearLayer = this.add
      .tileSprite(0, GAME_HEIGHT - 600, GAME_WIDTH, 600, "trees_near")
      .setOrigin(0, 0)
      .setScrollFactor(0.55, 0);

    // --- ground platform (tiled, solid) ---
    const groundY = GAME_HEIGHT - GROUND_TILE * GROUND_H;
    this.groundGroup = this.physics.add.staticGroup();
    for (let x = 0; x < LEVEL_WIDTH; x += GROUND_TILE) {
      for (let row = 0; row < GROUND_H; row++) {
        const tile = this.groundGroup.create(
          x + GROUND_TILE / 2,
          groundY + row * GROUND_TILE + GROUND_TILE / 2,
          "ground"
        );
        tile.refreshBody();
      }
    }

    // --- decorations: fence segments + lantern posts ---
    for (let x = 400; x < LEVEL_WIDTH - 400; x += 850) {
      this.add
        .image(x, groundY, "fence")
        .setOrigin(0, 1)
        .setDepth(2);
    }
    for (let x = 650; x < LEVEL_WIDTH - 400; x += 1150) {
      this.add
        .image(x, groundY, "lantern")
        .setOrigin(0.5, 1)
        .setDepth(2);
      this.add.pointlight(x, groundY - 90, 0xffb347, 140, 0.55, 0.03);
    }

    // --- victory gate at the end of the level ---
    this.gate = this.physics.add.staticImage(
      LEVEL_WIDTH - 200,
      groundY,
      "gate"
    );
    this.gate.setOrigin(0.5, 1);
    this.gate.refreshBody();

    this.createAnimations();

    // --- enemies ---
    this.enemies = this.physics.add.group();
    const enemyDefs = [
      { type: "goblin", x: 900 },
      { type: "slime", x: 1250 },
      { type: "goblin", x: 1700 },
      { type: "wolf", x: 2100 },
      { type: "slime", x: 2450 },
      { type: "goblin", x: 2800 },
      { type: "wolf", x: 3200 },
      { type: "slime", x: 3550 },
      { type: "goblin", x: 3900 },
      { type: "wolf", x: 4250 },
    ];
    for (const def of enemyDefs) {
      this.spawnEnemy(def.type, def.x, groundY);
    }
    this.physics.add.collider(this.enemies, this.groundGroup);

    // --- player ---
    this.player = this.physics.add.sprite(200, groundY - 60, "hero", 0);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28, 80);
    this.player.body.setOffset(18, 12);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, this.groundGroup);

    this.player.play("idle");

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onPlayerTouchEnemy,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.gate,
      this.onReachGate,
      null,
      this
    );

    // --- input ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.isAttacking = false;
    this.facing = 1;
    this.invulnerableUntil = 0;
    this.gameEnded = false;

    // --- camera ---
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(150, 100);

    this.add
      .text(16, 16, "A/D: gerak  |  W: lompat  |  SPACE: serang", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f0e6d2",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  createAnimations() {
    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("hero", { start: 0, end: 1 }),
      frameRate: 3,
      repeat: -1,
    });
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("hero", { start: 2, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: "jump",
      frames: this.anims.generateFrameNumbers("hero", { start: 6, end: 6 }),
      frameRate: 1,
      repeat: 0,
    });
    this.anims.create({
      key: "attack",
      frames: this.anims.generateFrameNumbers("hero", { start: 7, end: 8 }),
      frameRate: 10,
      repeat: 0,
    });

    this.anims.create({
      key: "goblin-walk",
      frames: this.anims.generateFrameNumbers("goblin", { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "wolf-walk",
      frames: this.anims.generateFrameNumbers("wolf", { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1,
    });
    this.anims.create({
      key: "slime-idle",
      frames: this.anims.generateFrameNumbers("slime", { start: 0, end: 1 }),
      frameRate: 3,
      repeat: -1,
    });
  }

  spawnEnemy(type, x, groundY) {
    const stats = {
      goblin: { speed: 60, range: 140, animKey: "goblin-walk", bodyH: 48, bodyW: 32, floatOffset: 36 },
      wolf: { speed: 110, range: 220, animKey: "wolf-walk", bodyH: 32, bodyW: 56, floatOffset: 26 },
      slime: { speed: 35, range: 90, animKey: "slime-idle", bodyH: 24, bodyW: 36, floatOffset: 22 },
    };
    const s = stats[type];
    const enemy = this.physics.add.sprite(x, groundY - s.floatOffset, type, 0);
    enemy.setDepth(4);
    enemy.play(s.animKey);
    enemy.body.setSize(s.bodyW, s.bodyH);
    enemy.body.setOffset((enemy.width - s.bodyW) / 2, enemy.height - s.bodyH - 4);
    enemy.setData("type", type);
    enemy.setData("speed", s.speed);
    enemy.setData("dir", -1);
    enemy.setData("minX", x - s.range);
    enemy.setData("maxX", x + s.range);
    enemy.setData("alive", true);
    enemy.setVelocityX(-s.speed);
    this.enemies.add(enemy);
    return enemy;
  }

  defeatEnemy(enemy) {
    if (!enemy.getData("alive")) return;
    enemy.setData("alive", false);
    enemy.body.enable = false;
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 0.4,
      angle: 90,
      duration: 220,
      onComplete: () => enemy.destroy(),
    });
  }

  onPlayerTouchEnemy(player, enemy) {
    if (this.gameEnded) return;
    if (!enemy.getData("alive")) return;
    const now = this.time.now;
    if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + 700;
    const dir = player.x < enemy.x ? -1 : 1;
    player.setVelocityX(dir * 260);
    player.setVelocityY(-200);
    this.cameras.main.shake(120, 0.004);
    player.setTintFill(0xff5555);
    this.time.delayedCall(150, () => player.clearTint());
  }

  onReachGate() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    const cam = this.cameras.main;
    this.add
      .rectangle(cam.scrollX, cam.scrollY, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, "Hutan Terselamatkan!", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ffe6b3",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, "Sang Penjaga berhasil mengusir kegelapan.", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#f0e6d2",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
  }

  updateEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.getData("alive")) return;
      const minX = enemy.getData("minX");
      const maxX = enemy.getData("maxX");
      const speed = enemy.getData("speed");
      let dir = enemy.getData("dir");
      if (enemy.x <= minX) dir = 1;
      if (enemy.x >= maxX) dir = -1;
      enemy.setData("dir", dir);
      enemy.setVelocityX(dir * speed);
      enemy.setFlipX(dir > 0);
    });
  }

  tryAttackHit() {
    const range = 85;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.getData("alive")) return;
      const dx = Math.abs(enemy.x - this.player.x);
      const dy = Math.abs(enemy.y - this.player.y);
      if (dx < range && dy < 80) {
        this.defeatEnemy(enemy);
      }
    });
  }

  update() {
    if (this.gameEnded) return;
    this.updateEnemies();

    const speed = 220;
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump);
    const attackPressed = Phaser.Input.Keyboard.JustDown(this.keys.attack);

    if (attackPressed && !this.isAttacking) {
      this.isAttacking = true;
      this.player.play("attack");
      this.tryAttackHit();
      this.player.once("animationcomplete-attack", () => {
        this.isAttacking = false;
      });
    }

    if (!this.isAttacking) {
      if (left) {
        this.player.setVelocityX(-speed);
        this.facing = -1;
        this.player.setFlipX(true);
      } else if (right) {
        this.player.setVelocityX(speed);
        this.facing = 1;
        this.player.setFlipX(false);
      } else {
        this.player.setVelocityX(0);
      }

      if (jumpPressed && onGround) {
        this.player.setVelocityY(-480);
      }

      if (!onGround) {
        this.player.play("jump", true);
      } else if (left || right) {
        this.player.play("walk", true);
      } else {
        this.player.play("idle", true);
      }
    } else {
      this.player.setVelocityX(0);
    }

    // parallax scroll based on camera position
    const camX = this.cameras.main.scrollX;
    this.farLayer.tilePositionX = camX * 0.25;
    this.nearLayer.tilePositionX = camX * 0.55;
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  pixelArt: true,
  backgroundColor: "#dcd6e3",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1400 },
      debug: false,
    },
  },
  scene: [MainScene],
};

window.game = new Phaser.Game(config);
