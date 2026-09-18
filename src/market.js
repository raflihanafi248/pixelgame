// The roadside market: crystals buy timed abilities.
//
// Buffs are held on GameState so they survive a death and a level change, and
// every one of them is a plain flag plus an expiry the game loop reads - no
// ability does anything the rest of the code cannot see.

const ABILITIES = {
  whet: {
    name: "Whetstone", icon: "icon_whet", cost: 30, seconds: 45,
    blurb: "Your sword bites twice as deep.",
  },
  swift: {
    name: "Swiftness Draught", icon: "icon_swift", cost: 25, seconds: 45,
    blurb: "Run faster and dash further.",
  },
  ward: {
    name: "Warden's Ward", icon: "icon_ward", cost: 35, seconds: 60,
    blurb: "Armour refills, and holds five hits.",
  },
  ember: {
    name: "Ember Flask", icon: "icon_ember", cost: 40, seconds: 45,
    blurb: "Each swing bursts into nearby foes.",
  },
  heal: {
    name: "Heart of Oak", icon: "icon_heart", cost: 20, seconds: 0,
    blurb: "Restores two hearts, here and now.",
  },
};

// What you have bought and not yet drunk. Buying fills this; using it is what
// starts the clock. Both survive a death and a change of chapter.
const Satchel = {
  held: {},

  count(key) {
    return this.held[key] || 0;
  },
  add(key) {
    this.held[key] = this.count(key) + 1;
  },
  take(key) {
    if (!this.count(key)) return false;
    this.held[key] -= 1;
    return true;
  },
  total() {
    return Object.values(this.held).reduce((a, b) => a + b, 0);
  },
  clear() {
    this.held = {};
  },
};

// How many of one ability you can carry at a time.
const MAX_HELD = 5;

const Buffs = {
  // { whet: expiryTimestamp, ... } - written here, read by the player and scene
  active: {},

  has(key) {
    return (this.active[key] || 0) > Date.now();
  },
  remaining(key) {
    return Math.max(0, Math.ceil(((this.active[key] || 0) - Date.now()) / 1000));
  },
  grant(key) {
    const seconds = ABILITIES[key].seconds;
    // Buying again while it is running extends it rather than restarting it.
    const from = Math.max(Date.now(), this.active[key] || 0);
    this.active[key] = from + seconds * 1000;
  },
  clear() {
    this.active = {};
  },
};

class Market {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.cursor = 0;
    this.keys = Object.keys(ABILITIES);

    const d = 320;
    const w = 640, h = 380;
    const x = (GAME_W - w) / 2, y = (GAME_H - h) / 2 - 10;
    this.x = x; this.y = y; this.w = w; this.h = h;

    this.shade = scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x05040a, 0.6)
      .setOrigin(0).setScrollFactor(0).setDepth(d - 1).setVisible(false);

    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(d).setVisible(false);
    this.panel.fillStyle(0x100b14, 0.97);
    this.panel.fillRect(x, y, w, h);
    this.panel.lineStyle(3, 0xb99b6a, 1);
    this.panel.strokeRect(x, y, w, h);
    this.panel.lineStyle(1, 0x4a3a28, 1);
    this.panel.strokeRect(x + 5, y + 5, w - 10, h - 10);

    this.title = scene.add.text(x + w / 2, y + 16, "THE WAYSIDE MARKET", {
      fontFamily: FONT, fontSize: "20px", color: "#ffd9a0",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.purse = scene.add.text(x + w - 20, y + 20, "", {
      fontFamily: FONT, fontSize: "15px", color: "#8fd9e8",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.rows = this.keys.map((key, i) => {
      const ry = y + 58 + i * 56;
      const highlight = scene.add.rectangle(x + 16, ry, w - 32, 50, 0x2a2036, 0)
        .setOrigin(0, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);
      const icon = scene.add.image(x + 44, ry + 25, ABILITIES[key].icon)
        .setScrollFactor(0).setDepth(d + 2).setVisible(false);
      const name = scene.add.text(x + 80, ry + 6, ABILITIES[key].name, {
        fontFamily: FONT, fontSize: "16px", color: "#f0e6d2",
      }).setScrollFactor(0).setDepth(d + 2).setVisible(false);
      const blurb = scene.add.text(x + 80, ry + 27, ABILITIES[key].blurb, {
        fontFamily: FONT, fontSize: "13px", color: "#a99c8c",
      }).setScrollFactor(0).setDepth(d + 2).setVisible(false);
      const cost = scene.add.text(x + w - 28, ry + 16, "", {
        fontFamily: FONT, fontSize: "16px", color: "#8fd9e8",
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2).setVisible(false);
      // What you are already carrying, and the button that drinks one.
      const held = scene.add.text(x + w - 96, ry + 16, "", {
        fontFamily: FONT, fontSize: "15px", color: "#e8d9a8",
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2).setVisible(false);
      const useBtn = scene.add.text(x + w - 134, ry + 14, " U  USE ", {
        fontFamily: FONT, fontSize: "14px", color: "#0c1a10",
        backgroundColor: "#9ce8a8", padding: { x: 4, y: 3 },
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2).setVisible(false);
      return { key, highlight, icon, name, blurb, cost, held, useBtn };
    });

    this.help = scene.add.text(x + w / 2, y + h - 26,
      "↑ ↓  choose    ENTER  buy    U  use    Q / ESC  leave", {
        fontFamily: FONT, fontSize: "13px", color: "#9c8f7f",
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.flash = scene.add.text(x + w / 2, y + h - 52, "", {
      fontFamily: FONT, fontSize: "15px", color: "#ffd95e",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(d + 1).setVisible(false);

    this.all = [this.shade, this.panel, this.title, this.purse, this.help, this.flash]
      .concat(...this.rows.map((r) => [r.highlight, r.icon, r.name, r.blurb, r.cost, r.held]));
  }

  show() {
    this.open = true;
    this.cursor = 0;
    this.flash.setText("");
    this.all.forEach((o) => o.setVisible(true));
    Sound.play("shopOpen");
    this.refresh();
  }

  hide() {
    this.open = false;
    this.all.forEach((o) => o.setVisible(false));
    this.rows.forEach((r) => r.useBtn.setVisible(false));
  }

  refresh() {
    this.purse.setText(`CRYSTALS  ${GameState.score}`);
    this.rows.forEach((row, i) => {
      const ab = ABILITIES[row.key];
      const selected = i === this.cursor;
      const affordable = GameState.score >= ab.cost;
      const owned = Satchel.count(row.key);
      row.highlight.setFillStyle(0x2a2036, selected ? 0.95 : 0);
      row.name.setColor(selected ? "#ffd9a0" : affordable ? "#f0e6d2" : "#6f6659");
      row.blurb.setColor(selected ? "#c9bcab" : "#8a7f71");
      row.icon.setAlpha(affordable || owned ? 1 : 0.4);

      row.cost.setText(`${ab.cost}`);
      row.cost.setColor(affordable ? "#8fd9e8" : "#7a5f5f");

      // What you hold, and - only on the row you are on - how to drink it.
      const running = ab.seconds && Buffs.remaining(row.key);
      row.held.setVisible(true).setText(
        owned ? `x${owned}` : running ? `${running}s` : "");
      row.held.setColor(owned ? "#e8d9a8" : "#9ce8a8");
      row.useBtn.setVisible(this.open && selected && owned > 0);
    });
  }

  move(step) {
    this.cursor = (this.cursor + step + this.rows.length) % this.rows.length;
    Sound.play("select");
    this.refresh();
  }

  buy() {
    const key = this.rows[this.cursor].key;
    const ab = ABILITIES[key];
    if (GameState.score < ab.cost) {
      Sound.play("deny");
      this.flash.setColor("#e08a7a").setText("Not enough crystals.");
      return;
    }
    if (Satchel.count(key) >= MAX_HELD) {
      Sound.play("deny");
      this.flash.setColor("#e08a7a").setText(`You can only carry ${MAX_HELD}.`);
      return;
    }
    GameState.score -= ab.cost;
    Satchel.add(key);
    // Buying does not use it. That is the point: you carry it until the
    // moment you need it, instead of the clock starting at the stall.
    this.flash.setColor("#9ce8a8")
      .setText(`${ab.name} — in your satchel (${Satchel.count(key)})`);

    Sound.play("buy");
    this.scene.refreshHud();
    this.refresh();
  }

  // Drink one from the satchel, here at the stall.
  use() {
    const key = this.rows[this.cursor].key;
    const result = useAbility(this.scene, key);
    this.flash.setColor(result.ok ? "#9ce8a8" : "#e08a7a").setText(result.text);
    this.refresh();
  }
}

// Using an ability, from the stall or from a hotkey in the field. One place,
// so the two routes can never drift apart.
function useAbility(scene, key) {
  const ab = ABILITIES[key];
  if (!Satchel.count(key)) {
    Sound.play("deny");
    return { ok: false, text: `No ${ab.name} to use.` };
  }
  if (key === "heal" && scene.player.hp >= scene.player.maxHp) {
    Sound.play("deny");
    return { ok: false, text: "You are already whole." };
  }
  Satchel.take(key);

  if (key === "heal") {
    scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + 2);
  } else {
    Buffs.grant(key);
    if (key === "ward") scene.player.gainArmor();
  }
  Sound.play("buff");
  scene.refreshHud();
  scene.flashAbility(key);
  return { ok: true, text: key === "heal" ? "Two hearts restored."
                                          : `${ab.name} — ${ab.seconds}s` };
}
