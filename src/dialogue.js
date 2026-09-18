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

// --- NPCs -----------------------------------------------------------------
class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def) {
    super(scene, def.x, GROUND_Y - (def.float ? 120 : 40), `npc_${def.id}`, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.def = def;
    this.talked = false;
    this.setDepth(14);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(40, def.float ? 60 : 72);
    this.body.setOffset((this.width - 40) / 2, this.height - (def.float ? 70 : 76));
    this.play(`npc-${def.id}`);

    // The marker that tells the player there is someone worth talking to.
    this.marker = scene.add.text(this.x, this.y - 62, "!", {
      fontFamily: FONT, fontSize: "24px", color: "#ffd95e",
      stroke: "#241a10", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(30);
    scene.tweens.add({
      targets: this.marker, y: this.y - 72, duration: 700,
      yoyo: true, repeat: -1, ease: "Sine.inOut",
    });

    this.prompt = scene.add.text(this.x, this.y - 40, "E  talk", {
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

  inRange(player) {
    return Math.abs(player.x - this.x) < 90 && Math.abs(player.y - this.y) < 130;
  }

  // What this character says: the full exchange first time, a short line after.
  conversation() {
    const lines = this.talked && this.def.after ? this.def.after : this.def.lines;
    this.talked = true;
    return lines;
  }

  refresh(player) {
    const near = this.inRange(player);
    this.prompt.setVisible(near && !this.scene.dialogue.active);
    this.prompt.setPosition(this.x, this.y - 46);
    this.marker.setVisible(!this.talked && !near);
    this.marker.x = this.x;
  }

  destroyExtras() {
    this.marker.destroy();
    this.prompt.destroy();
  }
}
