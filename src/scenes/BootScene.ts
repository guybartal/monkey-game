import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const g = this.add.graphics({ x: 0, y: 0 });

    g.fillStyle(0x7b4d1f, 1);
    g.fillRoundedRect(0, 0, 140, 24, 8);
    g.generateTexture('platform-normal', 140, 24);

    g.clear();
    g.fillStyle(0xa66f37, 1);
    g.fillRoundedRect(0, 0, 140, 24, 8);
    g.lineStyle(3, 0xd4b087, 1);
    g.strokeRoundedRect(2, 2, 136, 20, 8);
    g.generateTexture('platform-breakable', 140, 24);

    g.clear();
    g.fillStyle(0x6e3f10, 1);
    g.fillCircle(26, 26, 26);
    g.generateTexture('monkey', 52, 52);

    g.clear();
    g.fillStyle(0xf5d229, 1);
    g.fillCircle(12, 12, 12);
    g.generateTexture('banana-normal', 24, 24);

    g.clear();
    g.fillStyle(0xffc21a, 1);
    g.fillCircle(14, 14, 14);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(14, 14, 11);
    g.generateTexture('banana-golden', 28, 28);

    g.destroy();

    this.scene.start('game');
    this.scene.start('ui');
  }
}
