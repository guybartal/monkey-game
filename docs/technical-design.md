# Jumping Monkeys — Technical Design (Phase 1)

## 1. מטרת המסמך
מסמך זה מתרגם את ה-GDD למבנה מימוש טכני עבור Phaser 3, עם דגש על MVP שניתן לפתח מהר, לבדוק בקלות, ולהרחיב לפיצ'רים עתידיים.

---

## 2. Tech Stack והחלטות

- **Engine:** Phaser 3
- **Language:** TypeScript
- **Build Tool:** Vite
- **Physics:** Arcade Physics (מהיר ופשוט למשחק דו-מימדי קז'ואלי)
- **Data Persistence:** localStorage (שיא אישי, הגדרות בסיסיות)

### למה Arcade Physics?
- מאפשר שליטה קלה במהירות/כבידה
- ביצועים טובים לדפדפן ומובייל
- קל לכוון "תחושת קפיצה" (game feel)

---

## 3. מבנה תיקיות מוצע

```txt
src/
  main.ts
  game/
    config.ts
    constants.ts
    state/
      GameSessionState.ts
    systems/
      DifficultySystem.ts
      ScoreSystem.ts
      ComboSystem.ts
      SpawnSystem.ts
      CameraSystem.ts
    entities/
      Monkey.ts
      Platform.ts
      Banana.ts
    scenes/
      BootScene.ts
      GameScene.ts
      UIScene.ts
      MenuScene.ts
    ui/
      ScoreText.ts
      ComboIndicator.ts
      PauseButton.ts
    utils/
      math.ts
      random.ts
```

---

## 4. מודל נתונים מרכזי

## GameSessionState

```ts
export interface GameSessionState {
  score: number;
  combo: number;
  bestScore: number;
  bananasCollected: number;
  highestY: number;
  elapsedMs: number;
  isGameOver: boolean;
}
```

## PlatformData

```ts
export type PlatformType = 'normal' | 'moving' | 'breakable' | 'small';

export interface PlatformData {
  id: string;
  type: PlatformType;
  x: number;
  y: number;
  width: number;
  speedX?: number;
  isBroken?: boolean;
}
```

## BananaData

```ts
export type BananaType = 'normal' | 'golden' | 'super';

export interface BananaData {
  id: string;
  type: BananaType;
  x: number;
  y: number;
  basePoints: number;
}
```

---

## 5. Flow של סצנות

1. **BootScene**
   - טעינת ספרייטים/סאונדים
   - רישום אנימציות
   - מעבר ל-GameScene + UIScene

2. **GameScene**
   - יצירת הקוף, פלטפורמות התחלתיות ובננות
   - לולאת משחק: קלט → פיזיקה → קוליזיות → ספאונים → ניקוי אובייקטים
   - הפקת events ל-UIScene

3. **UIScene**
   - מציג score, combo, best score
   - מקש pause
   - חלון Game Over

---

## 6. Input: Drag-to-Aim

### מצב קלט
- `isDragging`
- `dragStart`
- `dragCurrent`

### אלגוריתם
1. Pointer down על הקוף: התחלת drag
2. Pointer move: חישוב וקטור מתיחה (מהקוף לכיוון הפוינטר)
3. Clamp לאורך מקסימלי (למשל 140px)
4. Pointer up: המרת וקטור ל-velocity
   - `vx = -dragVector.x * POWER_SCALE`
   - `vy = -Math.abs(dragVector.y) * POWER_SCALE`
5. אכיפה: `vy` תמיד כלפי מעלה (שלילי בציר Y של Phaser)

---

## 7. Physics Tuning (MVP ערכים התחלתיים)

- Gravity Y: `1200`
- Max jump speed Y: `-900`
- Horizontal speed clamp: `[-380, 380]`
- Monkey bounce: `0`
- Platform immovable: `true`

> הערכים ניתנים לכיוון בהמשך לפי playtests.

---

## 8. מערכות ליבה

## 8.1 DifficultySystem
קלט:
- `elapsedMs`
- `highestY` (כמה גבוה השחקן הגיע)

פלט:
- `platformGapMin/Max`
- הסתברויות לסוגי פלטפורמות
- הסתברות לרוח

דוגמה:

```ts
const t = Math.min(1, elapsedMs / 120000); // עד 2 דקות
const h = Math.min(1, Math.abs(highestY) / 6000);
const difficulty = Math.max(t, h);
```

## 8.2 SpawnSystem
- שומר "קו יצירה" מעל המצלמה
- יוצר פלטפורמות בגבהים מתקדמים
- לכל פלטפורמה: בדיקת סיכוי להצבת בננה
- מונע חפיפה לא הוגנת בין פלטפורמות

## 8.3 ScoreSystem

```ts
score += banana.basePoints * comboMultiplier;
```

- normal: 1
- golden: 5
- super: 10 + trigger slow motion

## 8.4 ComboSystem
- מתחיל ב-`x1`
- כל איסוף רציף מעלה עד `x6`
- טיימר reset (למשל 4 שניות)
- reset בנפילה / timeout

## 8.5 CameraSystem
- המצלמה עוקבת רק למעלה
- `camera.scrollY = Math.min(camera.scrollY, monkey.y - offset)`
- ניקוי אובייקטים שנמצאים מתחת למסך + buffer

---

## 9. Rules: Game Over

טריגרים:
1. הקוף מתחת ל-`camera.scrollY + gameHeight + margin`
2. (אופציונלי עתידי) פגיעה באויב

בעת Game Over:
- עצירת physics
- עדכון bestScore ב-localStorage
- פתיחת חלון "שחק שוב"

---

## 10. Game Feel Implementation

- **Squash & Stretch:** tween קצר לסקייל בעת שיגור ונחיתה
- **Golden Banana Shake:** camera shake חלש (`100ms`, intensity קטן)
- **Particles:** emitter קצר באיסוף
- **Super Banana Slow Motion:**
  - `time.timeScale = 0.7` ל-0.4 שניות
  - חזרה ל-`1.0`
- **Audio cues:** קפיצה / איסוף / נפילה

---

## 11. ביצועים ואופטימיזציה

- שימוש ב-object pooling לפלטפורמות ובננות
- מחיקה/השבתה של אובייקטים מחוץ לטווח
- הימנעות מיצירת אובייקטים חדשים ב-update loop כשאפשר
- מדידת FPS ממוצע בזמן QA

---

## 12. בדיקות מומלצות

## Unit-like checks (logic)
- DifficultySystem מחזיר טווחים תקינים לכל שלב
- ComboSystem לא עובר x6 ומתאפס בתנאים נכונים
- ScoreSystem מחשב ניקוד נכון לכל סוג בננה

## Playtest checklist
- קפיצה מרגישה צפויה וברורה
- אין מצבים לא הוגנים (פער בלתי אפשרי)
- קצב קושי עולה בהדרגה
- Game Over ברור ומהיר

---

## 13. Milestone MVP Definition of Done

MVP נחשב מוכן כאשר:
1. אפשר לשחק לופ מלא: קפיצה → איסוף → ניקוד → נפילה → Restart
2. קיימים 3 סוגי פלטפורמות (normal/moving/breakable)
3. קיימים 2 סוגי בננות (normal/golden)
4. Combo וניקוד עובדים ומוצגים ב-UI
5. הקושי עולה לפחות לפי זמן משחק
6. שיא אישי נשמר מקומית

---

## 14. הרחבות מתוכננות (Post-MVP)

- Super banana עם slow motion מתקדם
- מערך אויבים (דבורים)
- מערכת skins
- Leaderboard ענני
