// Game bootstrap. Scene order here is only the registration order; BootScene
// runs first and hands over to the title screen.

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game-container",
  pixelArt: true,
  // FIT keeps the 16:9 frame and scales it to whatever space there is, which
  // is also what makes fullscreen fill the screen instead of sitting in a box.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#0a0710",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 1500 }, debug: false },
  },
  scene: [BootScene, TitleScene, StoryScene, GameScene, GameOverScene, EndingScene],
};

window.game = new Phaser.Game(config);
