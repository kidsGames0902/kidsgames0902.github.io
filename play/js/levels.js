// levels.js
// The game has 4 worlds, and each world has 3 levels (12 levels in total).
// The 3rd level of every world is a "boss" level with a timer.
//
// To add a new world: add a block to WORLDS, add its 3 layouts to LEVEL_LAYOUTS,
// and (if it has a new theme) a draw function in LevelScene.js.

const WORLDS = [
  {
    id: 1,
    name: 'Treasure Island',
    icon: '🏝️',
    theme: 'beach',            // which background to draw (see LevelScene.js)
    mapColor: 0x48cae4,        // color of the level circles on the Adventure Map
    mapSky: [[0, '#48cae4'], [0.55, '#caf0f8'], [1, '#fff3b0']],
    mapHills: [0xb5ead7, 0x7bdcb5],
    treasures: ['🗝️', '💎', '🗺️', '⚔️', '🛡️', '👑', '🧭', '💰', '🏴‍☠️', '🦜', '⚓', '🐚', '🦀', '🍍', '🥥'],
    cards: {
      edge: 0x0096c7, inner: 0x48cae4, dots: 0x90e0ef, badge: 0xffd60a,
      border: 0xffd60a, question: '#0077b6', frontInner: 0xe0fbfc, frontBorder: 0x2ec4b6
    }
  },
  {
    id: 2,
    name: 'Jungle Ruins',
    icon: '🗿',
    theme: 'jungle',
    mapColor: 0x52b788,
    mapSky: [[0, '#80ed99'], [0.55, '#d8f3dc'], [1, '#fff3b0']],
    mapHills: [0x95d5b2, 0x52b788],
    treasures: ['🐒', '🦜', '🐍', '🍌', '🌺', '🗿', '🦋', '🐸', '🐯', '🐘', '🦎', '🍄', '🥭', '🐊', '🦥'],
    cards: {
      edge: 0x2d6a4f, inner: 0x52b788, dots: 0x95d5b2, badge: 0xffd60a,
      border: 0xffd60a, question: '#2d6a4f', frontInner: 0xeefbe7, frontBorder: 0x52b788
    }
  },
  {
    id: 3,
    name: 'Coral Reef',
    icon: '🐠',
    theme: 'ocean',
    mapColor: 0x00b4d8,
    mapSky: [[0, '#00b4d8'], [0.55, '#90e0ef'], [1, '#fff3b0']],
    mapHills: [0x48cae4, 0x0096c7],
    treasures: ['🐠', '🐙', '🦀', '🐢', '🐬', '🐳', '🦑', '🐚', '🦈', '🦞', '⚓', '🧜‍♀️', '🌊', '🔱', '🤿'],
    cards: {
      edge: 0x0077b6, inner: 0x00b4d8, dots: 0x90e0ef, badge: 0xff9f1c,
      border: 0xffffff, question: '#ffffff', frontInner: 0xe0fbfc, frontBorder: 0x00b4d8
    }
  },
  {
    id: 4,
    name: 'Sky Kingdom',
    icon: '🏰',
    theme: 'sky',
    mapColor: 0x9381ff,
    mapSky: [[0, '#a2d2ff'], [0.55, '#cdb4db'], [1, '#ffc8dd']],
    mapHills: [0xffffff, 0xe0d7ff],
    treasures: ['🏰', '🐉', '🦄', '🌈', '⭐', '🎈', '🪁', '🌙', '🦅', '☀️', '⚡', '🚀', '🛸', '🧚', '🎠'],
    cards: {
      edge: 0x9381ff, inner: 0xb8b8ff, dots: 0xd6d6ff, badge: 0xffd60a,
      border: 0xffffff, question: '#5a4fcf', frontInner: 0xf3f0ff, frontBorder: 0x9381ff
    }
  }
];

// For each world: three levels as [rows, columns, seconds on the timer (0 = no timer)]
const LEVEL_LAYOUTS = [
  [[3, 4, 0], [4, 4, 0], [4, 4, 75]],
  [[4, 4, 0], [4, 5, 0], [4, 5, 90]],
  [[4, 5, 0], [4, 6, 0], [4, 6, 105]],
  [[4, 6, 0], [5, 6, 0], [5, 6, 130]]
];

// Build the full list of 12 levels from the worlds and layouts above
const LEVELS = [];
WORLDS.forEach((world, w) => {
  LEVEL_LAYOUTS[w].forEach(([rows, cols, timeLimit], i) => {
    const pairs = (rows * cols) / 2;
    LEVELS.push({
      id: LEVELS.length + 1,   // 1 to 12
      world: world,
      number: i + 1,           // 1, 2 or 3 inside its world
      rows: rows,
      cols: cols,
      timeLimit: timeLimit,
      treasures: world.treasures.slice(0, pairs),
      // 3 stars if moves <= first number, 2 stars if moves <= second number, else 1 star
      // (a perfect game takes `pairs` moves, so this leaves room for a few mistakes)
      stars: [Math.round(pairs * 1.6), Math.round(pairs * 2.3)]
    });
  });
});

// Remembers how many stars you earned on each level (saved in the browser).
// A level is unlocked when the level before it has at least 1 star.
const Progress = {
  storageKey: 'memoryAdventureProgressV2',

  data: (() => {
    try {
      return JSON.parse(localStorage.getItem('memoryAdventureProgressV2')) || {};
    } catch (e) {
      return {};
    }
  })(),

  getStars(levelId) {
    return this.data[levelId] || 0;
  },

  totalStars() {
    return LEVELS.reduce((sum, level) => sum + this.getStars(level.id), 0);
  },

  // Only keeps your best result
  saveStars(levelId, stars) {
    if (stars <= this.getStars(levelId)) return;
    this.data[levelId] = stars;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      // not saved - progress lasts until the page is closed
    }
  },

  isUnlocked(levelId) {
    return levelId === 1 || this.getStars(levelId - 1) > 0;
  },

  // The level the player should play next (first unlocked level without stars)
  nextLevel() {
    return LEVELS.find((l) => this.isUnlocked(l.id) && this.getStars(l.id) === 0) || LEVELS[LEVELS.length - 1];
  }
};
