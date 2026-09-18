// Story-mode conversations: a portrait box that types its line out, waits for
// the player, and hands control back when the exchange is over.

const DLG = {
  boxX: 40,
  boxY: GAME_H - 146,
  boxW: GAME_W - 80,
  boxH: 136,
  pad: 16,
  portrait: 96,
  charMs: 22,     // typing speed
};

class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.shown = 0;
    this.nextCharAt = 0;
    this.onDone = null;

    const d = 300; // above everything, including the darkness overlay
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(d).setVisible(false);
    this.panel.fillStyle(0x0b0810, 0.92);
    this.panel.fillRect(DLG.boxX, DLG.boxY, DLG.boxW, DLG.boxH);
    this.panel.lineStyle(3, 0xb99b6a, 1);
    this.panel.strokeRect(DLG.boxX, DLG.boxY, DLG.boxW, DLG.boxH);
    this.panel.lineStyle(1, 0x4a3a28, 1);
    this.panel.strokeRect(DLG.boxX + 5, DLG.boxY + 5, DLG.boxW - 10, DLG.boxH - 10);

    this.portrait = scene.add.image(
      DLG.boxX + DLG.pad + DLG.portrait / 2,
      DLG.boxY + DLG.boxH / 2, "portrait_knight"
    ).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    const textX = DLG.boxX + DLG.pad * 2 + DLG.portrait;
    this.nameText = scene.add.text(textX, DLG.boxY + 14, "", {
      fontFamily: FONT, fontSize: "17px", color: "#ffd9a0",
    }).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.bodyText = scene.add.text(textX, DLG.boxY + 42, "", {
      fontFamily: FONT, fontSize: "16px", color: "#eee3d4", lineSpacing: 7,
      wordWrap: { width: DLG.boxW - DLG.portrait - DLG.pad * 3 - 20 },
    }).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.more = scene.add.text(DLG.boxX + DLG.boxW - 26, DLG.boxY + DLG.boxH - 28, "▼", {
      fontFamily: FONT, fontSize: "16px", color: "#ffd9a0",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);
    scene.tweens.add({ targets: this.more, alpha: 0.2, duration: 520, yoyo: true, repeat: -1 });
  }

  start(lines, onDone) {
    if (this.active) return;
    this.active = true;
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone || null;
    [this.panel, this.portrait, this.nameText, this.bodyText].forEach((o) => o.setVisible(true));
    // No floating "talk" prompts while someone is actually talking.
    this.scene.npcs.forEach((n) => n.prompt.setVisible(false));
    this.showLine();
  }

  showLine() {
    const line = this.lines[this.index];
    this.portrait.setTexture(`portrait_${line.portrait}`);
    this.nameText.setText(line.speaker);
    this.bodyText.setText("");
    this.shown = 0;
    this.nextCharAt = 0;
    this.more.setVisible(false);
  }

  get typing() {
    return this.shown < this.lines[this.index].text.length;
  }

  // Advance: first press completes the line, the next moves on.
  advance() {
    if (!this.active) return;
    if (this.typing) {
      this.shown = this.lines[this.index].text.length;
      this.bodyText.setText(this.lines[this.index].text);
      this.more.setVisible(true);
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.showLine();
  }

  close() {
    this.active = false;
    [this.panel, this.portrait, this.nameText, this.bodyText, this.more]
      .forEach((o) => o.setVisible(false));
    const done = this.onDone;
    this.onDone = null;
    if (done) done();
  }

  update(time) {
    if (!this.active || !this.typing) return;
    if (time < this.nextCharAt) return;
    this.nextCharAt = time + DLG.charMs;
    this.shown += 1;
    const text = this.lines[this.index].text;
    this.bodyText.setText(text.slice(0, this.shown));
    // A soft tick every few characters reads as speech without being noise.
    if (this.shown % 3 === 0 && text[this.shown - 1] !== " ") {
      Sound.play("talk", { vol: 0.5 });
    }
    if (!this.typing) this.more.setVisible(true);
  }
}

// --- NPCs -------------------------------------------------------------------
// Two kinds of person stand on the road. The ones the story stops for hold
// their ground and talk; the villagers wander their own patch of it, turn to
// watch the knight go past, and run for cover when something with teeth
// arrives. Both are the same class - only `home` decides which.
class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def) {
    super(scene, def.x, 0, `npc_${def.id}`, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.def = def;
    this.talked = false;
    this.homeX = def.x;
    this.roam = def.home || null;
    this.facing = def.face || -1;
    this.nextDecisionAt = 0;
    this.scared = false;
    this.walking = false;

    // Frames differ in height between the villagers and the wisp, so stand
    // every one of them on the ground line rather than assuming a size.
    this.frameH = this.frame.height;
    this.setPosition(def.x, def.float ? GROUND_Y - 130 : GROUND_Y + 6 - this.frameH / 2);
    this.baseY = this.y;

    this.setDepth(14);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    const bw = 44, bh = Math.min(96, this.frameH - 16);
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, this.frameH - bh - 6);
    this.play(`npc-${def.id}`);
    this.setFlipX(this.facing > 0);

    // The marker that tells the player there is someone worth talking to.
    this.marker = scene.add.text(this.x, this.y - this.frameH / 2 - 16, "!", {
      fontFamily: FONT, fontSize: "24px", color: "#ffd95e",
      stroke: "#241a10", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30).setVisible(!def.home);
    if (!def.home) {
      scene.tweens.add({
        targets: this.marker, y: this.marker.y - 10, duration: 700,
        yoyo: true, repeat: -1, ease: "Sine.inOut",
      });
    }

    this.prompt = scene.add.text(this.x, this.y, def.shop ? "E  trade" : "E  talk", {
      fontFamily: FONT, fontSize: "13px", color: "#f3e7d2",
      backgroundColor: "#0b0810cc", padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(30).setVisible(false);

    if (def.float) {
      scene.tweens.add({
        targets: this, y: this.y - 14, duration: 2200,
        yoyo: true, repeat: -1, ease: "Sine.inOut",
      });
    }
  }

  get talkable() {
    return !!(this.def.lines || this.def.shop);
  }

  inRange(player) {
    return this.talkable &&
           Math.abs(player.x - this.x) < 90 && Math.abs(player.y - this.y) < 150;
  }

  // What this character says: the full exchange first time, a short line after.
  conversation() {
    const lines = this.talked && this.def.after ? this.def.after : this.def.lines;
    this.talked = true;
    return lines;
  }

  // Villagers only: wander, watch, and bolt for home when something hunts.
  live(time, player, enemies) {
    if (!this.roam || this.scene.dialogue.active) return;
    const [lo, hi] = this.roam;

    const dt = this.scene.game.loop.delta / 1000;
    const threat = enemies.find((e) => e.alive_ && Math.abs(e.x - this.x) < 260 &&
                                        Math.abs(e.y - this.y) < 180);
    if (threat) {
      // Run the other way, and keep running for a moment after it is gone.
      this.scared = true;
      this.nextDecisionAt = time + 1400;
      this.facing = threat.x > this.x ? -1 : 1;
      this.step(this.facing * 165 * dt, lo - 520, hi + 520);
      this.walking = true;
    } else if (this.x < lo - 20 || this.x > hi + 20) {
      // Calm again but a long way from home: walk back to their own patch.
      this.scared = false;
      this.walking = true;
      this.facing = this.x < lo ? 1 : -1;
      this.step(this.facing * 46 * dt, lo - 520, hi + 520);
    } else if (time > this.nextDecisionAt) {
      this.scared = false;
      // Stand a while, then stroll somewhere else within their own patch.
      this.walking = !this.walking;
      this.nextDecisionAt = time + (this.walking ? Phaser.Math.Between(1400, 2600)
                                                 : Phaser.Math.Between(1800, 4200));
      if (this.walking) this.facing = this.x > (lo + hi) / 2 ? -1 : 1;
    } else if (this.walking) {
      this.step(this.facing * 34 * dt, lo, hi);
      if (this.x <= lo) this.facing = 1;
      if (this.x >= hi) this.facing = -1;
    }

    // Standing still near the knight, they turn and watch him.
    if (!this.walking && !this.scared && Math.abs(player.x - this.x) < 240) {
      this.facing = player.x > this.x ? 1 : -1;
    }
    this.setFlipX(this.facing > 0);
    this.anims.msPerFrame = this.walking ? 160 : 420;
  }

  // Move, but never off a ledge: a villager who panics into a pit is a bug
  // the player watches happen.
  step(dx, lo, hi) {
    const want = Phaser.Math.Clamp(this.x + dx, lo, hi);
    if (this.scene.inGap(want - 32) || this.scene.inGap(want + 32)) {
      this.facing = -this.facing;
      return;
    }
    this.x = want;
  }

  refresh(player) {
    const near = this.inRange(player);
    this.prompt.setVisible(near && !this.scene.dialogue.active);
    this.prompt.setPosition(this.x, this.y - this.frameH / 2 - 10);
    this.marker.setVisible(this.talkable && !this.def.home && !this.talked && !near);
    this.marker.x = this.x;
  }

  destroyExtras() {
    this.marker.destroy();
    this.prompt.destroy();
  }
}
