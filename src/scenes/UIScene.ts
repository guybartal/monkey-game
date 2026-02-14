import Phaser from 'phaser';
import type { HudPayload } from '../game/types';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private gameOverContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('ui');
  }

  create(): void {
    this.scoreText = this.add.text(16, 14, '🍌 0', { fontSize: '28px', color: '#1f2d3d' }).setScrollFactor(0);
    this.comboText = this.add.text(16, 50, 'Combo x1', { fontSize: '18px', color: '#102a43' }).setScrollFactor(0);
    this.bestText = this.add.text(16, 74, 'Best 0', { fontSize: '16px', color: '#243b53' }).setScrollFactor(0);

    const overlay = this.add.rectangle(210, 370, 300, 220, 0x06213a, 0.82).setStrokeStyle(2, 0xffffff, 0.7);
    const title = this.add.text(210, 305, 'Game Over', {
      fontSize: '34px',
      color: '#ffffff'
    }).setOrigin(0.5);
    const summary = this.add.text(210, 360, 'Score: 0\nBest: 0', {
      fontSize: '22px',
      color: '#f0f4f8',
      align: 'center'
    }).setOrigin(0.5);

    const btn = this.add.rectangle(210, 435, 170, 46, 0xf5d229, 1).setStrokeStyle(2, 0x000000, 0.35).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(210, 435, 'Play Again', { fontSize: '22px', color: '#102a43' }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.scene.stop('game');
      this.scene.start('game');
      this.gameOverContainer.setVisible(false);
    });

    this.gameOverContainer = this.add.container(0, 0, [overlay, title, summary, btn, btnText]).setVisible(false).setScrollFactor(0);
    this.gameOverContainer.setData('summary', summary);

    const gameScene = this.scene.get('game');
    gameScene.events.on('hud:update', this.handleHudUpdate, this);
    this.events.on('game:over', this.handleGameOver, this);
  }

  private handleHudUpdate(payload: HudPayload): void {
    this.scoreText.setText(`🍌 ${payload.score}`);
    this.comboText.setText(`Combo x${payload.combo}`);
    this.bestText.setText(`Best ${payload.bestScore}`);
  }

  private handleGameOver(payload: HudPayload): void {
    const summary = this.gameOverContainer.getData('summary') as Phaser.GameObjects.Text;
    summary.setText(`Score: ${payload.score}\nBest: ${payload.bestScore}`);
    this.gameOverContainer.setVisible(true);
  }
}
