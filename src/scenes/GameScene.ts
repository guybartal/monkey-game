import Phaser from 'phaser';
import type { BananaType, HudPayload, PlatformType } from '../game/types';

type PlatformSprite = Phaser.Physics.Arcade.Sprite & {
  platformType: PlatformType;
  broken?: boolean;
};

type BananaSprite = Phaser.Physics.Arcade.Sprite & {
  bananaType: BananaType;
  basePoints: number;
};

export class GameScene extends Phaser.Scene {
  private monkey!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.Group;
  private bananas!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private bestScore = Number(localStorage.getItem('jm-best-score') ?? 0);
  private combo = 1;
  private comboMax = 6;
  private comboResetAt = 0;

  private isDragging = false;
  private dragStart = new Phaser.Math.Vector2();
  private aimGraphic!: Phaser.GameObjects.Graphics;

  private nextSpawnY = 0;
  private lastSafeY = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.physics.world.setBounds(0, -100000, this.scale.width, 101000);

    this.platforms = this.physics.add.group({ immovable: true, allowGravity: false });
    this.bananas = this.physics.add.group({ allowGravity: false, immovable: true });

    this.monkey = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 120, 'monkey');
    this.monkey.setCircle(22, 4, 4);
    this.monkey.setCollideWorldBounds(true);
    this.monkey.setBounce(0);

    this.aimGraphic = this.add.graphics();

    this.createPlatform(this.scale.width / 2, this.scale.height - 80, 'normal');
    for (let i = 0; i < 12; i += 1) {
      this.spawnNextRow();
    }

    this.physics.add.collider(this.monkey, this.platforms, this.handleMonkeyPlatform, undefined, this);
    this.physics.add.overlap(this.monkey, this.bananas, this.handleBananaCollect, undefined, this);

    this.cameras.main.startFollow(this.monkey, false, 0.12, 0.12);
    this.cameras.main.setDeadzone(this.scale.width * 0.5, this.scale.height * 0.55);
    this.cameras.main.setLerp(0.08, 0.08);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.monkey.body?.blocked.down && !this.monkey.body?.touching.down) return;
      this.isDragging = true;
      this.dragStart.set(this.monkey.x, this.monkey.y);
      this.drawAim(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.drawAim(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.launchMonkey(pointer.worldX, pointer.worldY);
      this.isDragging = false;
      this.aimGraphic.clear();
    });

    this.events.emit('hud:update', this.buildHudPayload());
  }

  update(_time: number, delta: number): void {
    const body = this.monkey.body as Phaser.Physics.Arcade.Body;
    body.velocity.x = Phaser.Math.Clamp(body.velocity.x, -380, 380);

    if (this.time.now > this.comboResetAt) {
      this.combo = 1;
    }

    if (this.monkey.y < this.lastSafeY) {
      this.lastSafeY = this.monkey.y;
    }

    while (this.nextSpawnY > this.cameras.main.worldView.y - 300) {
      this.spawnNextRow();
    }

    this.recycleOffscreen();

    if (this.monkey.y > this.cameras.main.worldView.bottom + 80) {
      this.gameOver();
    }

    if (delta > 0) {
      this.events.emit('hud:update', this.buildHudPayload());
    }
  }

  private createPlatform(x: number, y: number, type: PlatformType): PlatformSprite {
    const key = type === 'breakable' ? 'platform-breakable' : 'platform-normal';
    const p = this.platforms.create(x, y, key) as PlatformSprite;
    p.platformType = type;
    p.setImmovable(true);
    (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    if (type === 'moving') {
      p.setData('originX', x);
      p.setData('speed', Phaser.Math.Between(45, 90) * (Math.random() > 0.5 ? 1 : -1));
    }

    return p;
  }

  private spawnNextRow(): void {
    if (this.nextSpawnY === 0) {
      this.nextSpawnY = this.scale.height - 170;
    }

    const progress = Math.min(1, Math.abs(this.lastSafeY) / 5500);
    const gap = Phaser.Math.Linear(95, 145, progress);
    this.nextSpawnY -= gap;

    const x = Phaser.Math.Between(60, this.scale.width - 60);
    const r = Math.random();

    let type: PlatformType = 'normal';
    if (progress > 0.2 && r < 0.24) type = 'moving';
    if (progress > 0.45 && r < 0.12) type = 'breakable';

    const p = this.createPlatform(x, this.nextSpawnY, type);

    if (Math.random() < 0.68) {
      const isGolden = Math.random() < 0.14;
      const banana = this.bananas.create(
        p.x,
        p.y - 34,
        isGolden ? 'banana-golden' : 'banana-normal'
      ) as BananaSprite;
      banana.bananaType = isGolden ? 'golden' : 'normal';
      banana.basePoints = isGolden ? 5 : 1;
    }
  }

  private drawAim(worldX: number, worldY: number): void {
    const drag = new Phaser.Math.Vector2(worldX - this.dragStart.x, worldY - this.dragStart.y).scale(-1);
    drag.setLength(Math.min(140, drag.length()));

    this.aimGraphic.clear();
    this.aimGraphic.lineStyle(4, 0xffffff, 0.95);
    this.aimGraphic.strokeLineShape(
      new Phaser.Geom.Line(
        this.monkey.x,
        this.monkey.y,
        this.monkey.x + drag.x,
        this.monkey.y + drag.y
      )
    );
  }

  private launchMonkey(worldX: number, worldY: number): void {
    const drag = new Phaser.Math.Vector2(worldX - this.dragStart.x, worldY - this.dragStart.y).scale(-1);
    drag.setLength(Math.min(140, drag.length()));

    const powerScale = 5.8;
    const vx = Phaser.Math.Clamp(drag.x * powerScale, -380, 380);
    const vy = -Math.abs(drag.y * powerScale);

    this.monkey.setVelocity(vx, Phaser.Math.Clamp(vy, -900, -260));

    this.tweens.add({
      targets: this.monkey,
      scaleX: 1.15,
      scaleY: 0.86,
      yoyo: true,
      duration: 110
    });
  }

  private handleMonkeyPlatform(
    monkeyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    platformObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    const monkey = monkeyObj as Phaser.Physics.Arcade.Sprite;
    const platform = platformObj as PlatformSprite;
    const monkeyBody = monkey.body as Phaser.Physics.Arcade.Body;

    if (monkeyBody.velocity.y <= 0) return;

    monkey.setVelocityY(0);
    monkey.setY(platform.y - 36);

    if (platform.platformType === 'breakable' && !platform.broken) {
      platform.broken = true;
      this.tweens.add({
        targets: platform,
        alpha: 0,
        angle: 18,
        duration: 200,
        onComplete: () => platform.destroy()
      });
    }
  }

  private handleBananaCollect(
    _monkeyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody,
    bananaObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody
  ): void {
    const banana = bananaObj as BananaSprite;
    this.combo = Math.min(this.comboMax, this.combo + 1);
    this.comboResetAt = this.time.now + 4000;

    this.score += banana.basePoints * this.combo;
    this.bestScore = Math.max(this.bestScore, this.score);

    if (banana.bananaType === 'golden') {
      this.cameras.main.shake(100, 0.004);
    }

    this.add.circle(banana.x, banana.y, 8, 0xfff3aa, 0.9)
      .setDepth(5)
      .setScrollFactor(1);

    banana.destroy();
  }

  private recycleOffscreen(): void {
    const cutoff = this.cameras.main.worldView.bottom + 120;

    for (const platformObj of this.platforms.getChildren()) {
      const p = platformObj as PlatformSprite;

      if (p.platformType === 'moving') {
        const speed = p.getData('speed') as number;
        p.x += speed * (1 / 60);
        if (p.x < 70 || p.x > this.scale.width - 70) {
          p.setData('speed', speed * -1);
        }
      }

      if (p.y > cutoff) {
        p.destroy();
      }
    }

    for (const bananaObj of this.bananas.getChildren()) {
      const b = bananaObj as BananaSprite;
      if (b.y > cutoff) b.destroy();
    }
  }

  private gameOver(): void {
    localStorage.setItem('jm-best-score', String(this.bestScore));
    this.physics.pause();
    this.scene.pause();
    this.scene.get('ui').events.emit('game:over', this.buildHudPayload());
  }

  private buildHudPayload(): HudPayload {
    return {
      score: this.score,
      combo: this.combo,
      bestScore: this.bestScore
    };
  }
}
