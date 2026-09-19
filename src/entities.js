// Player, enemies and the dragon boss.

const HERO_SCALE = 2;

// The dragon keeps clear of the lair's entrance, where the last stall stands.
const LAIR_MIN_X = 660;

// --- Player ---------------------------------------------------------------
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "hero", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(HERO_SCALE);
    this.setDepth(20);
    this.setCollideWorldBounds(true);
    this.body.setSize(20, 46);
    this.body.setOffset(52, 18);

    this.maxHp = 5;
    this.hp = this.maxHp;
    this.armor = 0; // earned from kills, soaks up hits before health does
    this.facing = 1;
    this.state_ = "idle";
    this.invulnUntil = 0;
    this.comboStep = 0;
    this.comboWindowUntil = 0;
    this.attackHitDone = false;
    this.queuedAttack = false;
    this.coyoteUntil = 0;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.dead = false;
    this.onIce = false;
    this.wasOnGround = true; // so spawning does not fire a landing thud
    this.fallSpeed = 0;
    this.stepAccum = 0;

    this.on("animationcomplete", this.onAnimComplete, this);
    this.on("animationupdate", this.onAnimUpdate, this);
  }

  // The Warden's Ward buff simply widens the armour bar.
  get maxArmor() {
    return Buffs.has("ward") ? 5 : 3;
  }

  get busy() {
    return this.state_ === "attack" || this.state_ === "dash" ||
           this.state_ === "hurt" || this.state_ === "dead";
  }

  // Something else has taken control - a conversation, a merchant's stall.
  //
  // This has to reset the state machine, not just play the idle animation over
  // the top of whatever he was doing: `attack` and `hurt` only ever end when
  // their own animation fires `animationcomplete`, so cancelling that
  // animation strands him in that state, and `handleInput` returns early on
  // both - he can never move again. Talking mid-swing, or one frame after a
  // wolf connects, used to lock the knight up for the rest of the chapter.
  rest() {
    if (this.dead) return;
    this.state_ = "idle";
    this.queuedAttack = false;
    this.setVelocityX(0);
    this.play("hero-idle", true);
  }

  onAnimComplete(anim) {
    if (anim.key.startsWith("hero-attack") || anim.key === "hero-airattack") {
      this.state_ = "idle";
      this.comboWindowUntil = this.scene.time.now + 320;
      if (this.queuedAttack) {
        this.queuedAttack = false;
        this.attack();
      }
    } else if (anim.key === "hero-roll") {
      this.state_ = "idle";
    } else if (anim.key === "hero-hurt") {
      this.state_ = "idle";
    }
  }

  // The sword only connects during the middle frames of a swing.
  onAnimUpdate(anim, frame) {
    if (!anim.key.startsWith("hero-attack") && anim.key !== "hero-airattack") return;
    if (this.attackHitDone) return;
    if (frame.index >= 4 && frame.index <= 6) {
      this.attackHitDone = true;
      this.scene.playerHitCheck(this);
    }
  }

  attack() {
    if (this.dead || this.state_ === "dash" || this.state_ === "hurt") return;
    const now = this.scene.time.now;
    // Pressing attack mid-swing queues the next combo hit instead of dropping it.
    if (this.state_ === "attack") {
      this.queuedAttack = true;
      return;
    }

    if (!this.body.blocked.down && !this.body.touching.down) {
      this.state_ = "attack";
      this.attackHitDone = false;
      this.play("hero-airattack");
      Sound.play("swing2", { x: this.x });
      return;
    }

    this.comboStep = now < this.comboWindowUntil ? (this.comboStep % 3) + 1 : 1;
    this.state_ = "attack";
    this.attackHitDone = false;
    this.play(`hero-attack${this.comboStep}`);
    Sound.play(`swing${this.comboStep}`, { x: this.x });
    this.setVelocityX(this.facing * 60);
  }

  dash() {
    const now = this.scene.time.now;
    if (this.dead || this.busy || now < this.dashReadyAt) return;
    this.state_ = "dash";
    this.queuedAttack = false;
    this.dashUntil = now + 300;
    this.dashReadyAt = now + 700;
    this.invulnUntil = Math.max(this.invulnUntil, now + 320);
    this.setVelocityX(this.facing * (Buffs.has("swift") ? 780 : 620));
    this.play("hero-roll");
    Sound.play("dash", { x: this.x });
  }

  gainArmor() {
    if (this.dead) return;
    const wasEmpty = this.armor === 0;
    this.armor = this.maxArmor;
    Sound.play("armorGain", { x: this.x });
    this.scene.onArmorChanged(wasEmpty ? "gained" : "repaired");
  }

  hurt(amount, fromX) {
    const now = this.scene.time.now;
    if (this.dead || now < this.invulnUntil) return false;

    // Cheat: the hit still registers visually, but nothing is taken from you.
    if (GameState.godMode) {
      this.invulnUntil = now + 240;
      Sound.play("clang", { x: this.x });
      this.setTintFill(0xffe066);
      this.scene.time.delayedCall(90, () => this.active && this.clearTint());
      return false;
    }

    this.queuedAttack = false;
    const dir = this.x < fromX ? -1 : 1;

    // Armour takes the blow first, and only breaks once its last plate goes.
    if (this.armor > 0) {
      this.armor -= 1;
      this.invulnUntil = now + 700;
      this.setVelocity(dir * 150, -140);
      this.scene.cameras.main.shake(110, 0.005);
      if (this.armor === 0) {
        Sound.play("armorBreak", { x: this.x });
        this.scene.onArmorChanged("broken");
      } else {
        Sound.play("armorHit", { x: this.x });
        this.scene.onArmorChanged("hit");
      }
      return true;
    }

    this.hp -= amount;
    this.invulnUntil = now + 950;
    this.setVelocity(dir * 200, -220);
    this.scene.cameras.main.shake(160, 0.008);

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else {
      Sound.play("hurt", { x: this.x });
      this.state_ = "hurt";
      this.play("hero-hurt");
      this.scene.tweens.add({
        targets: this, alpha: 0.35, duration: 90, yoyo: true, repeat: 4,
        onComplete: () => this.setAlpha(1),
      });
    }
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.state_ = "dead";
    this.setVelocityX(0);
    this.play("hero-death");
    Sound.play("death", { x: this.x });
    this.scene.onPlayerDeath();
  }

  handleInput(input) {
    if (this.dead) return;
    const now = this.scene.time.now;
    const onGround = this.body.blocked.down || this.body.touching.down;

    // `attack` and `hurt` are owned by their animation and only end when it
    // fires `animationcomplete`. If anything has taken the animation over,
    // that event is never coming - so if the animation no longer matches the
    // state, the state is stale and the knight goes back to idle. Without
    // this, one cancelled animation locks him up for the rest of the chapter.
    const playing = this.anims.currentAnim?.key || "";
    if (this.state_ === "attack" &&
        !playing.startsWith("hero-attack") && playing !== "hero-airattack") {
      this.state_ = "idle";
      this.queuedAttack = false;
    }
    if (this.state_ === "hurt" && playing !== "hero-hurt") this.state_ = "idle";

    if (this.state_ === "dash") {
      if (now >= this.dashUntil) this.state_ = "idle";
      else return;
    }
    if (this.state_ === "hurt") return;

    if (this.state_ === "attack") {
      if (onGround) this.setVelocityX(this.body.velocity.x * 0.82);
      return;
    }

    const speed = Buffs.has("swift") ? 390 : 300;
    if (this.onIce) {
      // Slippery: steer with acceleration, let drag bleed the speed off.
      this.setDragX(600);
      this.setMaxVelocity(speed, 1600);
      if (input.left) { this.setAccelerationX(-1800); this.facing = -1; this.setFlipX(true); }
      else if (input.right) { this.setAccelerationX(1800); this.facing = 1; this.setFlipX(false); }
      else this.setAccelerationX(0);
    } else {
      this.setAccelerationX(0);
      this.setDragX(0);
      if (input.left) { this.setVelocityX(-speed); this.facing = -1; this.setFlipX(true); }
      else if (input.right) { this.setVelocityX(speed); this.facing = 1; this.setFlipX(false); }
      else this.setVelocityX(0);
    }

    if (input.jumpPressed && (onGround || now < this.coyoteUntil)) {
      this.setVelocityY(-760);
      this.coyoteUntil = 0;
      Sound.play("jump", { x: this.x });
    }

    // Landing hits harder the faster you were falling.
    if (!onGround) {
      this.fallSpeed = Math.max(this.fallSpeed, this.body.velocity.y);
    } else if (!this.wasOnGround) {
      Sound.play("land", { x: this.x, force: Math.min(1, this.fallSpeed / 900) });
      this.fallSpeed = 0;
    }
    this.wasOnGround = onGround;

    // Footsteps are driven by distance covered, so they stay in step with the
    // run whatever the frame rate, and they take their timbre from the ground.
    if (onGround && Math.abs(this.body.velocity.x) > 40) {
      this.stepAccum += Math.abs(this.body.velocity.x) * (this.scene.game.loop.delta / 1000);
      if (this.stepAccum > 62) {
        this.stepAccum = 0;
        Sound.play("step", { x: this.x, surface: this.scene.theme });
      }
    } else {
      this.stepAccum = 40; // next move starts with a step almost immediately
    }
    // Variable jump height: releasing early cuts the rise short.
    if (!input.jumpHeld && this.body.velocity.y < -450) this.setVelocityY(-450);
    if (onGround) this.coyoteUntil = now + 110;

    // animation state
    if (!onGround) {
      this.play(this.body.velocity.y < 0 ? "hero-jump" : "hero-fall", true);
    } else if (Math.abs(this.body.velocity.x) > 24) {
      this.play("hero-run", true);
    } else {
      this.play("hero-idle", true);
    }
  }
}

// --- Enemies --------------------------------------------------------------
const ENEMY_TYPES = {
  goblin: { hp: 2, speed: 70, range: 150, aggro: 240, damage: 1, body: [32, 48], flying: false, score: 10 },
  wolf: { hp: 2, speed: 150, range: 240, aggro: 340, damage: 1, body: [56, 32], flying: false, score: 15 },
  icewolf: { hp: 3, speed: 145, range: 240, aggro: 300, damage: 1, body: [56, 32], flying: false, score: 20 },
  slime: { hp: 1, speed: 45, range: 100, aggro: 150, damage: 1, body: [36, 24], flying: false, score: 5 },
  bat: { hp: 1, speed: 110, range: 200, aggro: 320, damage: 1, body: [36, 28], flying: true, score: 10 },
  wraith: { hp: 3, speed: 90, range: 200, aggro: 320, damage: 1, body: [36, 56], flying: true, score: 25 },
};

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, type, x, y) {
    super(scene, x, y, type, 0);
    const cfg = ENEMY_TYPES[type];
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type_ = type;
    this.cfg = cfg;
    this.hp = cfg.hp;
    this.alive_ = true;
    this.dir = -1;
    this.homeX = x;
    this.baseY = y;
    this.wobble = Math.random() * Math.PI * 2;

    this.setDepth(15);
    this.body.setSize(cfg.body[0], cfg.body[1]);
    this.body.setOffset((this.width - cfg.body[0]) / 2, this.height - cfg.body[1] - 2);
    if (cfg.flying) this.body.setAllowGravity(false);
    this.play(`${type}-move`);
  }

  takeDamage(amount, fromX) {
    if (!this.alive_) return;
    this.hp -= amount;
    const dir = this.x < fromX ? -1 : 1;
    this.setVelocityX(dir * 200);
    Sound.play("hit", { x: this.x });
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
    if (this.hp <= 0) this.kill();
  }

  kill() {
    if (!this.alive_) return;
    this.alive_ = false;
    this.body.enable = false;
    Sound.play("enemyDie", { x: this.x });
    this.scene.onEnemyKilled(this);
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.5, scaleY: 0.5, angle: 140,
      duration: 240, onComplete: () => this.destroy(),
    });
  }

  tick(player) {
    if (!this.alive_) return;
    const cfg = this.cfg;
    const dx = player.x - this.x;
    const chasing = !player.dead && Math.abs(dx) < cfg.aggro && Math.abs(player.y - this.y) < 200;

    if (chasing) {
      this.dir = dx > 0 ? 1 : -1;
      this.setVelocityX(this.dir * cfg.speed * 1.15);
    } else {
      if (this.x <= this.homeX - cfg.range) this.dir = 1;
      if (this.x >= this.homeX + cfg.range) this.dir = -1;
      this.setVelocityX(this.dir * cfg.speed);
    }
    this.setFlipX(this.dir > 0);

    if (cfg.flying) {
      this.wobble += 0.05;
      const targetY = chasing ? player.y - 30 : this.baseY;
      const drift = Math.sin(this.wobble) * (this.type_ === "bat" ? 26 : 14);
      this.setVelocityY((targetY + drift - this.y) * 2.2);
    } else if (this.type_ === "slime" && (this.body.blocked.down || this.body.touching.down)) {
      if (Math.random() < 0.02) this.setVelocityY(-340);
    }
  }
}

// --- Boss: the forest dragon ---------------------------------------------
class Dragon extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "dragon", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = 28;
    this.hp = this.maxHp;
    this.alive_ = true;
    this.phase = "hover";
    this.kneeling = false;
    this.nextPhaseAt = 0;
    this.nextShotAt = 0;
    this.hoverY = 190;
    this.groundY = GROUND_Y - 90; // feet sit on the ground in the rest pose
    this.dir = -1;
    this.roaring = false;
    this.bobT = Math.random() * Math.PI * 2;

    this.setDepth(18);
    this.body.setAllowGravity(false);
    // Torso, neck and head - the parts a sword can reach.
    this.body.setSize(126, 132);
    this.body.setOffset(72, 66);
    this.play("dragon-fly");

    // The roar animation carries the fire: the breath leaves the mouth on the
    // frame where the jaw is fully open, not on an unrelated timer.
    this.on("animationupdate", (anim, frame) => {
      if (anim.key === "dragon-roar" && frame.index === 4) this.spitFire();
    });
    this.on("animationcomplete", (anim) => {
      if (anim.key === "dragon-roar") {
        this.roaring = false;
        this.playState();
      } else if (anim.key === "dragon-hurt" && this.alive_) {
        this.playState();
      }
    });
  }

  playState() {
    if (!this.alive_ || this.roaring) return;
    const want = this.phase === "swoop" ? "dragon-swoop"
      : this.phase === "rest" ? "dragon-rest" : "dragon-fly";
    if (this.anims.currentAnim?.key !== want) this.play(want);
  }

  takeDamage(amount, fromX) {
    if (!this.alive_) return;
    this.hp = Math.max(0, this.hp - amount);
    Sound.play("bossHit", { x: this.x });
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
    this.scene.cameras.main.shake(120, 0.006);
    this.scene.updateBossBar();
    if (this.hp <= 0) {
      this.kneel();
    } else if (!this.roaring) {
      this.play("dragon-hurt");
    }
  }

  // At zero it does not die - it stops. Nine hundred years of holding the
  // line ends with it going down on its knees and asking one question, and
  // what happens after that is the player's to decide.
  kneel() {
    if (!this.alive_) return;
    this.alive_ = false;
    this.kneeling = true;
    this.body.enable = false;
    this.roaring = false;
    this.setAngle(0);
    this.setVelocity(0, 0);
    this.play("dragon-rest");
    Sound.play("bossDie", { x: this.x });
    this.scene.tweens.add({ targets: this, y: this.groundY, duration: 900,
                            ease: "Quad.easeOut" });
    this.scene.onDragonKneels();
  }

  // It accepted what you said, and lets go.
  perish() {
    this.kneeling = false;
    this.play("dragon-death");
    this.scene.tweens.add({
      targets: this, alpha: 0, y: this.y - 40, duration: 2600,
      onComplete: () => this.active && this.destroy(),
    });
  }

  // It did not. The one thing it had left to ask, and you lied to it.
  rise() {
    this.kneeling = false;
    this.setAlpha(1);
    this.play("dragon-roar");
    Sound.play("roar", { x: this.x });
    this.scene.tweens.add({ targets: this, y: this.hoverY, duration: 700,
                            ease: "Back.easeOut" });
  }

  roar() {
    if (!this.alive_ || this.roaring) return;
    this.roaring = true;
    this.play("dragon-roar");
    Sound.play("roar", { x: this.x });
  }

  spitFire() {
    const dirToPlayer = this.scene.player.x < this.x ? -1 : 1;
    Sound.play("fire", { x: this.x });
    for (let i = -1; i <= 1; i++) {
      const ball = this.scene.fireballs.get(this.x + dirToPlayer * 80, this.y - 12);
      if (!ball) continue;
      ball.setActive(true).setVisible(true);
      ball.body.enable = true;
      ball.setDepth(19);
      ball.play("fireball-fly");
      ball.setFlipX(dirToPlayer < 0);
      const angle = Phaser.Math.Angle.Between(
        this.x, this.y - 12, this.scene.player.x, this.scene.player.y);
      const spread = angle + i * 0.22;
      ball.setVelocity(Math.cos(spread) * 330, Math.sin(spread) * 330);
    }
  }

  tick(time, player) {
    if (!this.alive_) return;
    const hpFrac = this.hp / this.maxHp;
    const rush = 1 + (1 - hpFrac) * 0.8; // it fights harder as it weakens
    const dt = this.scene.game.loop.delta / 1000;
    this.bobT += dt * 2.2;

    if (time > this.nextPhaseAt) {
      if (this.phase === "hover") {
        this.phase = "swoop";
        this.nextPhaseAt = time + 1600 / rush;
        this.swoopDir = player.x < this.x ? -1 : 1;
      } else if (this.phase === "swoop") {
        this.phase = "rest";
        this.nextPhaseAt = time + 2600 / rush;
      } else {
        this.phase = "hover";
        this.nextPhaseAt = time + 3200 / rush;
      }
      this.playState();
    }

    if (this.phase === "hover") {
      // Buoyant drift: the sprite's own flap plus a slow world-space bob.
      const targetY = this.hoverY + Math.sin(this.bobT) * 16;
      this.setVelocityY((targetY - this.y) * 2);
      // It keeps to its own end of the hall - the near end is where the road
      // comes in, and it should never come down on top of the stall there.
      if (this.x < LAIR_MIN_X) this.dir = 1;
      if (this.x > this.scene.levelWidth - 280) this.dir = -1;
      this.setVelocityX(this.dir * 110 * rush);
      if (!this.roaring) this.setFlipX(this.dir > 0);
      if (time > this.nextShotAt) {
        this.nextShotAt = time + 1900 / rush;
        this.roar();
      }
    } else if (this.phase === "swoop") {
      this.setVelocityY((player.y - 40 - this.y) * 3);
      this.setVelocityX(this.swoopDir * 320 * rush);
      this.setFlipX(this.swoopDir > 0);
      if (this.x < LAIR_MIN_X - 60 || this.x > this.scene.levelWidth - 220) this.swoopDir *= -1;
    } else {
      // Landed: the window where the player can reach it with a sword.
      this.setVelocityY((this.groundY - this.y) * 3);
      this.setVelocityX(this.body.velocity.x * 0.9);
      this.setFlipX(player.x > this.x);
    }

    // Pitch into the dive and level out again, so it banks like something
    // with weight rather than sliding around upright.
    const wantAngle = this.phase === "swoop"
      ? Phaser.Math.Clamp(this.body.velocity.y * 0.02, -16, 16) * (this.flipX ? 1 : -1)
      : 0;
    this.setAngle(Phaser.Math.Linear(this.angle, wantAngle, 0.12));
  }
}
