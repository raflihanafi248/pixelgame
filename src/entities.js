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

// --- Boss: the thing the wardens left in the lair --------------------------
// Seven animations came in the pack and every one of them is a move. `idle`
// is the stare it gives you from the far end of the hall; `walk` is the
// stalk; `fly` is the ascent and what comes down out of it; `1atk` is the
// green lance; `2atk` is the lash; `hurt` - wings thrown wide - is the scream
// it opens the floor with; and `death` is both the collapse and, held on two
// of its frames, the kneel.

const BROOD_TINT = 0xcfeaff;   // colder than the parent, so they read as lesser

const BOSS_SCALE = 2.2;
const BOSS_DROP = 39;      // frame centre to the soles of its feet, in frame px
const BOSS_REACH = 92;     // frame centre to the tip of the lash, in frame px

// How it fights depends on how much of it is left. Each tier keeps everything
// the one below it had and adds to it, so the hall only ever gets worse: it
// starts by walking at you and ends by opening the floor and calling for help.
const BOSS_TIERS = [
  { moves: ["stalk", "lance", "lash"],
    speed: 78, pause: 850, bolts: 1, rifts: 0 },
  { moves: ["stalk", "lance", "lash", "flight", "rift"],
    speed: 104, pause: 600, bolts: 2, rifts: 3 },
  { moves: ["stalk", "lance", "lash", "flight", "rift", "brood"],
    speed: 134, pause: 400, bolts: 3, rifts: 5 },
];

class Cthulhu extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x) {
    super(scene, x, 0, "cthulhu", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = 36;
    this.hp = this.maxHp;
    this.alive_ = true;
    this.kneeling = false;
    this.woken = false;

    this.setScale(BOSS_SCALE);
    this.setDepth(18);
    this.body.setAllowGravity(false);
    this.body.setSize(52, 64);     // torso, shoulders and head - not the wings
    this.body.setOffset(70, 32);

    this.groundY = GROUND_Y - BOSS_DROP * BOSS_SCALE;
    this.hoverY = this.groundY - 200;
    this.setPosition(x, this.groundY);

    this.dir = -1;                 // -1 is facing back down the hall, at you
    this.phase = "wait";
    this.busyUntil = 0;
    this.lastMove = "";
    this.repeats = 0;
    this.lashLive = false;
    this.lashHit = false;
    this.diveX = 0;
    this.marker = null;
    this.bobT = Math.random() * Math.PI * 2;

    // It carries its own light, and it is the only light at that end of the
    // hall: you see the glow a long time before you see the shape. The
    // lantern entry cuts a hole in the dark; the halo, which sits above the
    // darkness layer, is what makes the hole green.
    this.glow = { x: this.x, y: this.y - 30, r: 1.35 };
    scene.lanterns.push(this.glow);
    this.halo = scene.add.image(this.x, this.y - 30, "light")
      .setTint(0x7de04a).setScale(1.1).setAlpha(0.16).setDepth(46)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.on("animationupdate", (anim, frame) => this.onFrame(anim.key, frame.index));
    this.on("animationcomplete", (anim) => this.onAnimDone(anim.key));
    this.play("cth-idle");
  }

  // Which way it is pointing, as a sign. The art faces right unflipped.
  face(x) {
    this.dir = x < this.x ? -1 : 1;
    this.setFlipX(this.dir < 0);
  }

  tier() {
    const f = this.hp / this.maxHp;
    return f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
  }

  // The arena: it will not walk out over the road, and it will not go through
  // the back wall.
  clampX(x) {
    return Phaser.Math.Clamp(x, LAIR_MIN_X, this.scene.levelWidth - 170);
  }

  playState() {
    if (!this.alive_) return;
    const want = this.phase === "stalk" ? "cth-walk"
      : (this.phase === "ascend" || this.phase === "hover" ||
         this.phase === "aim" || this.phase === "dive") ? "cth-fly"
      : "cth-idle";
    if (this.anims.currentAnim?.key !== want) this.play(want);
  }

  // ---------------------------------------------------------- the entrance
  wake(player) {
    this.woken = true;
    this.face(player.x);
    this.phase = "scream";
    this.busyUntil = this.scene.time.now + 1500;
    this.play("cth-scream");
    Sound.play("scream", { x: this.x });
    this.scene.cameras.main.shake(1100, 0.009);
    this.scene.onBossWakes();
  }

  // ------------------------------------------------------- picking a move
  chooseMove(time, player) {
    const tier = BOSS_TIERS[this.tier()];
    const gap = Math.abs(player.x - this.x);

    let pool = tier.moves.slice();
    if (gap > 230) pool = pool.filter((m) => m !== "lash");   // out of reach
    if (gap < 170) pool = pool.filter((m) => m !== "stalk");  // already there
    if (this.scene.broodCount() >= 2) pool = pool.filter((m) => m !== "brood");
    // Never three of the same thing running: a boss you can read is a boss
    // you can beat, and a boss that repeats is one you stop watching.
    if (this.repeats >= 1) pool = pool.filter((m) => m !== this.lastMove);
    if (!pool.length) pool = ["lash"];

    const move = Phaser.Utils.Array.GetRandom(pool);
    this.repeats = move === this.lastMove ? this.repeats + 1 : 0;
    this.lastMove = move;

    // Only the two looping phases hand their animation to playState(). The
    // rest start a one-shot here and are driven by its frames, so calling
    // playState() after them would cut the animation off on frame one - and
    // a lash whose `animationcomplete` never arrives never ends.
    this.face(player.x);
    if (move === "stalk") {
      this.phase = "stalk";
      this.busyUntil = time + Phaser.Math.Between(900, 1500);
      this.playState();
    } else if (move === "flight") {
      this.phase = "ascend";
      Sound.play("wings", { x: this.x });
      this.playState();
    } else if (move === "lance") {
      this.phase = "cast";
      this.setVelocity(0, 0);
      this.play("cth-cast");
      Sound.play("charge", { x: this.x });
    } else if (move === "lash") {
      this.phase = "lash";
      this.lashHit = false;
      this.play("cth-lash");
    } else if (move === "rift") {
      this.openFloor(time, player, tier.rifts);
    } else {
      this.callBrood(time, player);
    }
  }

  // The same belt-and-braces the knight needed: a phase that can only be left
  // by its own `animationcomplete` is stranded the moment anything else takes
  // the animation over, so if the animation is gone, so is the phase.
  stranded() {
    const owner = { cast: "cth-cast", lash: "cth-lash" }[this.phase];
    return !!owner && this.anims.currentAnim?.key !== owner;
  }

  endMove(extra = 0) {
    if (!this.alive_) return;
    this.phase = "recover";
    this.lashLive = false;
    this.setVelocity(0, 0);
    this.busyUntil = this.scene.time.now + BOSS_TIERS[this.tier()].pause + extra;
    this.playState();
  }

  // --------------------------------------------------------------- attacks
  // 1atk, on the frame the green actually leaves its claw.
  throwLance(player) {
    const n = BOSS_TIERS[this.tier()].bolts;
    const fx = this.x + this.dir * 84;
    const fy = this.y - 12;
    const aim = Phaser.Math.Angle.Between(fx, fy, player.x, player.y - 24);
    Sound.play("lance", { x: this.x });
    this.scene.cameras.main.shake(180, 0.004);
    for (let i = 0; i < n; i++) {
      // The fan opens around the line to the knight, so the middle bolt is
      // always the one that is actually aimed at him.
      this.scene.throwBolt(fx, fy, aim + (i - (n - 1) / 2) * 0.19);
    }
  }

  // 2atk: the tentacles go out in front of it and come back. There is no
  // projectile - the reach is the attack, and it is a long one.
  lashBox() {
    const far = BOSS_REACH * BOSS_SCALE;
    return new Phaser.Geom.Rectangle(
      this.dir > 0 ? this.x : this.x - far,
      this.y - 48, far, 96
    );
  }

  // hurt, held: it throws its wings out and screams, and the floor answers.
  openFloor(time, player, count) {
    this.phase = "scream";
    this.setVelocity(0, 0);
    this.busyUntil = time + 400 + count * 190;
    this.play("cth-scream");
    Sound.play("scream", { x: this.x });
    this.scene.cameras.main.shake(700, 0.007);

    // They walk from under its own feet towards the knight, so there is
    // always a direction to run and never a rift that simply appears on him.
    const toward = player.x < this.x ? -1 : 1;
    for (let i = 0; i < count; i++) {
      const at = this.clampX(this.x + toward * (150 + i * 145));
      this.scene.time.delayedCall(180 + i * 170, () => {
        if (this.scene?.scene.isActive() && this.alive_) this.scene.openRift(at);
      });
    }
  }

  // The same scream, answered by something else: pieces of it come off the
  // ceiling wearing its face.
  callBrood(time, player) {
    this.phase = "scream";
    this.setVelocity(0, 0);
    this.busyUntil = time + 1400;
    this.play("cth-scream");
    Sound.play("scream", { x: this.x });
    for (let i = 0; i < 2; i++) {
      this.scene.time.delayedCall(420 + i * 320, () => {
        if (!this.scene?.scene.isActive() || !this.alive_) return;
        const at = this.clampX(this.x + Phaser.Math.Between(-240, 240));
        this.scene.callBroodling(at, this.hoverY + Phaser.Math.Between(-40, 40));
      });
    }
  }

  // The dive: it picks a spot, hangs over it long enough to be read, and
  // drops. The marker is the promise that it is coming.
  aimDive(time, player) {
    this.phase = "aim";
    this.diveX = this.clampX(player.x);
    this.busyUntil = time + 620;
    this.clearMarker();
    this.marker = this.scene.add.image(this.diveX, GROUND_Y - 6, "light")
      .setTint(0x9cf05a).setScale(0.52, 0.2).setAlpha(0.55).setDepth(46)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: this.marker, alpha: 1, scaleX: 0.74,
                            duration: 200, yoyo: true, repeat: -1 });
    Sound.play("charge", { x: this.diveX });
  }

  clearMarker() {
    if (this.marker) {
      this.scene.tweens.killTweensOf(this.marker);
      this.marker.destroy();
      this.marker = null;
    }
  }

  slam() {
    this.setPosition(this.x, this.groundY);
    this.setVelocity(0, 0);
    this.clearMarker();
    Sound.play("slam", { x: this.x });
    this.scene.cameras.main.shake(420, 0.018);
    this.scene.groundBurst(this.x);

    const pl = this.scene.player;
    if (!pl.dead && Math.abs(pl.x - this.x) < 165 && pl.y > GROUND_Y - 190) {
      pl.hurt(2, this.x);
    }
    this.endMove(260);
  }

  // ------------------------------------------------------ animation hooks
  onFrame(key, index) {
    if (key === "cth-cast" && index === 3) this.throwLance(this.scene.player);
    else if (key === "cth-lash" && index === 3) {
      this.lashLive = true;
      Sound.play("lash", { x: this.x });
    } else if (key === "cth-lash" && index === 8) this.lashLive = false;
  }

  onAnimDone(key) {
    if (!this.alive_ && key !== "cth-sink" && key !== "cth-stand") return;
    if (key === "cth-cast" || key === "cth-lash") this.endMove();
    else if (key === "cth-flinch") this.playState();
    else if (key === "cth-sink") this.play("cth-kneel");
    else if (key === "cth-stand") this.play("cth-scream");
  }

  // --------------------------------------------------------------- damage
  takeDamage(amount, fromX) {
    if (!this.alive_ || !this.woken) return;
    this.hp = Math.max(0, this.hp - amount);
    Sound.play("bossHit", { x: this.x });
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.active && this.clearTint());
    this.scene.cameras.main.shake(120, 0.006);
    this.scene.updateBossBar();
    if (this.hp <= 0) {
      this.kneel();
    } else if (this.phase === "stalk" || this.phase === "recover") {
      // It only ever flinches out of a move it was not committed to; letting
      // a sword interrupt a cast would turn the whole fight into a stunlock.
      this.play("cth-flinch");
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
    this.lashLive = false;
    this.clearMarker();
    this.setVelocity(0, 0);
    this.setPosition(this.x, this.groundY);
    this.play("cth-sink");
    Sound.play("bossDie", { x: this.x });
    this.scene.onBossKneels();
  }

  // It accepted what you said, and lets go.
  perish() {
    this.kneeling = false;
    this.play("cth-melt");
    this.scene.tweens.add({ targets: this.halo, alpha: 0, duration: 2400,
                            onComplete: () => this.halo.destroy() });
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 2600, delay: 900,
      onComplete: () => this.active && this.destroy(),
    });
    this.scene.tweens.add({
      targets: this.glow, y: this.glow.y + 60, duration: 2600,
    });
  }

  // It did not. The one thing it had left to ask, and you lied to it. The
  // pack's own white frame is the moment it comes back up.
  rise() {
    this.kneeling = false;
    this.setAlpha(1);
    this.play("cth-stand");
    Sound.play("scream", { x: this.x });
    this.scene.cameras.main.flash(180, 220, 255, 190);
  }

  // The last thing the knight who lied ever sees.
  finalStrike() {
    const pl = this.scene.player;
    this.face(pl.x);
    Sound.play("lance", { x: this.x });
    const fx = this.x + this.dir * 84;
    const fy = this.y - 12;
    const aim = Phaser.Math.Angle.Between(fx, fy, pl.x, pl.y - 24);
    for (let i = -2; i <= 2; i++) this.scene.throwBolt(fx, fy, aim + i * 0.14);
  }

  // ------------------------------------------------------------- the loop
  tick(time, player) {
    this.glow.x = this.x;
    this.glow.y = this.y - 30;
    if (this.halo.active) {
      this.halo.setPosition(this.x, this.y - 30);
      // It burns brighter the more of it you have taken off.
      this.halo.setAlpha(this.woken ? 0.16 + (1 - this.hp / this.maxHp) * 0.16 : 0.1);
    }
    if (!this.alive_) return;

    if (!this.woken) {
      // It has been standing here the whole time. It looks up when you are
      // close enough to be worth looking up for.
      this.face(player.x);
      if (!player.dead && Math.abs(player.x - this.x) < 560) this.wake(player);
      return;
    }

    const tier = BOSS_TIERS[this.tier()];
    this.bobT += (this.scene.game.loop.delta / 1000) * 2.4;
    if (this.stranded()) this.endMove();

    switch (this.phase) {
      case "stalk": {
        this.face(player.x);
        const want = this.clampX(player.x - this.dir * 120);
        const step = Math.sign(want - this.x);
        this.setVelocityX(Math.abs(want - this.x) < 12 ? 0 : step * tier.speed);
        this.setVelocityY((this.groundY - this.y) * 4);
        if (time > this.busyUntil) this.endMove();
        break;
      }

      case "cast":
        this.setVelocity(0, (this.groundY - this.y) * 4);
        break;

      case "lash": {
        // It leans into the swing, which also closes the last of the gap.
        this.setVelocityX(this.dir * 60);
        this.setVelocityY((this.groundY - this.y) * 4);
        if (this.lashLive && !this.lashHit && !player.dead &&
            Phaser.Geom.Rectangle.Overlaps(this.lashBox(), player.getBounds())) {
          this.lashHit = true;
          player.hurt(1, this.x);
        }
        break;
      }

      case "ascend":
        this.setVelocityX((this.clampX(player.x) - this.x) * 1.2);
        this.setVelocityY((this.hoverY - this.y) * 3);
        if (Math.abs(this.y - this.hoverY) < 16) {
          this.phase = "hover";
          this.busyUntil = time + 800;
        }
        break;

      case "hover": {
        this.face(player.x);
        const want = this.clampX(player.x);
        this.setVelocityX(Phaser.Math.Clamp((want - this.x) * 2.4, -260, 260));
        this.setVelocityY((this.hoverY + Math.sin(this.bobT) * 14 - this.y) * 2.5);
        if (time > this.busyUntil) this.aimDive(time, player);
        break;
      }

      case "aim":
        this.setVelocityX(Phaser.Math.Clamp((this.diveX - this.x) * 4, -420, 420));
        this.setVelocityY((this.hoverY - 26 - this.y) * 3);
        if (time > this.busyUntil) {
          this.phase = "dive";
          this.setVelocity(0, 0);
        }
        break;

      case "dive":
        this.setVelocityX((this.diveX - this.x) * 3);
        this.setVelocityY(1250);
        if (this.y >= this.groundY) this.slam();
        break;

      case "scream":
        this.setVelocity(0, (this.groundY - this.y) * 4);
        if (time > this.busyUntil) this.endMove();
        break;

      default: // recover: the only window where it is simply standing there
        this.face(player.x);
        this.setVelocity(0, (this.groundY - this.y) * 4);
        if (time > this.busyUntil) this.chooseMove(time, player);
    }
  }
}

// The brood. It does not make these - it calls them, and they come wearing
// its own face because that is what they are pieces of.
class Broodling extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "cthulhu", 27);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cfg = { damage: 1, score: 5 };
    this.hp = 2;
    this.alive_ = true;
    this.wobble = Math.random() * Math.PI * 2;
    // Each one comes in on its own side and its own height, so a pair reads
    // as two things hunting you rather than one sprite drawn twice.
    this.lane = Phaser.Math.Between(0, 1) ? 1 : -1;
    this.standoff = Phaser.Math.Between(46, 94);
    this.rise = Phaser.Math.Between(-66, -14);

    this.setScale(0.7).setDepth(16);
    this.setTint(BROOD_TINT);
    // A dim glow of their own, so they arrive out of the dark instead of
    // appearing on top of you already in your torchlight.
    this.glow = { x, y, r: 0.42 };
    scene.lanterns.push(this.glow);
    this.body.setAllowGravity(false);
    this.body.setSize(40, 52);
    this.body.setOffset(76, 40);
    this.play("cth-fly");

    // They fade up out of the dark rather than popping into it.
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 420 });
  }

  takeDamage(amount, fromX) {
    if (!this.alive_) return;
    this.hp -= amount;
    this.setVelocityX((this.x < fromX ? -1 : 1) * 220);
    Sound.play("hit", { x: this.x });
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.active && this.setTint(BROOD_TINT));
    if (this.hp <= 0) this.kill();
  }

  kill() {
    if (!this.alive_) return;
    this.alive_ = false;
    this.body.enable = false;
    Phaser.Utils.Array.Remove(this.scene.lanterns, this.glow);
    Sound.play("enemyDie", { x: this.x });
    this.scene.onEnemyKilled(this);
    this.play("cth-melt");
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 420,
      onComplete: () => this.destroy(),
    });
  }

  tick(player) {
    if (!this.alive_) return;
    this.wobble += 0.06;
    this.glow.x = this.x;
    this.glow.y = this.y;
    const want = player.x + this.lane * this.standoff;
    this.setFlipX(player.x < this.x);
    this.setVelocityX(Phaser.Math.Clamp((want - this.x) * 1.8, -170, 170));
    this.setVelocityY((player.y + this.rise + Math.sin(this.wobble) * 26 - this.y) * 1.9);
  }
}
