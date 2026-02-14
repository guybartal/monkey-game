export type PlatformType = 'normal' | 'moving' | 'breakable';
export type BananaType = 'normal' | 'golden';

export interface HudPayload {
  score: number;
  combo: number;
  bestScore: number;
}
