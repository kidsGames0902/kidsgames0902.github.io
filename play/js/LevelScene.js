// LevelScene.js
// One scene that plays ANY level from levels.js.
// It is started like this:  this.scene.start('LevelScene', { level: 2 })
//
// Flip two cards. If they match, they stay face up. If not, they flip back.

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  // data = { level: 1 } (whatever was passed to scene.start)
  create(data) {
    this.level = LEVELS.find((l) => l.id === (data && data.level)) || LEVELS[0];

    // --- Game state (reset every time the scene starts) ---
    this.isLeaving = false;
    this.leaveRequested = false; // set by the first tap on Replay/Map/Next (stops double taps)
    this.firstCard = null;   // the first card flipped this turn
    this.isBusy = true;      // true while cards are dealt or compared (blocks clicks)
    this.isDealing = true;
    this.isOver = false;     // true after winning or running out of time
    this.moves = 0;
    this.pairsFound = 0;
    this.totalPairs = this.level.treasures.length;
    this.timeLeft = this.level.timeLimit;
    this.hintUsed = false;       // one hint per level
    this.extraTimeUsed = false;  // one "+30 seconds" per level
    this.extraTimeRequested = false;
    this.timerEvent = null;

    UI.createTextures(this);
    this.createCardTextures();
    this.cameras.main.fadeIn(500, 255, 255, 255);

    // Draw the right background for this level's world
    const theme = this.level.world.theme;
    if (theme === 'jungle') {
      this.drawJungle();
    } else if (theme === 'ocean') {
      this.drawOcean();
    } else if (theme === 'sky') {
      this.drawSky();
    } else {
      this.drawBeach();
    }

    this.drawHud();
    this.dealCards();

    // Sparkle burst used when you find a pair (it waits until we call explode)
    this.burst = this.add.particles(0, 0, 'sparkle', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      lifespan: 700,
      tint: [THEME.gold, THEME.green, THEME.pink, 0xffffff],
      emitting: false
    });
    this.burst.setDepth(30);
  }

  // Draw this world's card pictures once (each world has its own card colors)
  createCardTextures() {
    this.cardBackKey = 'card-back-w' + this.level.world.id;
    this.cardFrontKey = 'card-front-w' + this.level.world.id;
    const key = this.cardBackKey;
    if (this.textures.exists(key)) return;

    const c = this.level.world.cards;
    const w = 110;
    const h = 130;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Back of the card
    g.fillStyle(c.edge, 1);
    g.fillRoundedRect(0, 0, w, h, 14);
    g.fillStyle(c.inner, 1);
    g.fillRoundedRect(6, 6, w - 12, h - 12, 10);
    g.fillStyle(c.dots, 1);
    for (let x = 18; x < w - 10; x += 18) {      // a pattern of little dots
      for (let y = 18; y < h - 10; y += 18) {
        g.fillCircle(x, y, 2);
      }
    }
    g.fillStyle(c.badge, 1);                      // circle in the middle for the "?"
    g.fillCircle(w / 2, h / 2, 30);
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(w / 2, h / 2, 30);
    g.lineStyle(4, c.border, 1);
    g.strokeRoundedRect(2, 2, w - 4, h - 4, 12);
    g.generateTexture(key, w, h);
    g.clear();

    // Front of the card
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, w, h, 14);
    g.fillStyle(c.frontInner, 1);
    g.fillRoundedRect(8, 8, w - 16, h - 16, 10);
    g.lineStyle(4, c.frontBorder, 1);
    g.strokeRoundedRect(2, 2, w - 4, h - 4, 12);
    g.generateTexture(this.cardFrontKey, w, h);
    g.clear();

    // Shadow under each card (same for every level)
    if (!this.textures.exists('card-shadow-day')) {
      g.fillStyle(0x03045e, 0.18);
      g.fillRoundedRect(0, 0, w, h, 14);
      g.generateTexture('card-shadow-day', w, h);
    }
    g.destroy();
  }

  // ---------- Backgrounds ----------

  // World 1: blue sky, clouds, sea, sand and swaying palm trees
  drawBeach() {
    UI.makeBackground(this, 'bg-island', [
      [0, '#4cc9f0'],
      [0.5, '#a2e4f5'],
      [0.8, '#e0fbfc'],
      [1, '#fff3b0']
    ]);

    UI.addClouds(this, 5, 180);

    // Gentle sea waves near the bottom, then a strip of sand
    const sea = UI.addHills(this, 0x48cae4, 520, 6, 4, 0);
    this.tweens.add({ targets: sea, x: { from: -10, to: 10 }, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    UI.addHills(this, 0x80ffdb, 548, 6, 3, 1);
    UI.addHills(this, 0xffe8a3, 570, 8, 2, 2);

    // Palm trees on each side that sway in the breeze
    [[62, 600, 1], [738, 600, -1]].forEach(([x, y, flip], i) => {
      const palm = this.add.text(x, y, '🌴', { fontSize: '110px' }).setOrigin(0.5, 1).setScale(flip, 1);
      this.tweens.add({ targets: palm, angle: { from: -4, to: 4 }, duration: 2000 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    UI.addFloatingSparkles(this, [0xffffff, THEME.gold, 0x80ffdb]);
  }

  // World 2: fresh mint-green jungle with sunbeams, hanging vines and butterflies
  drawJungle() {
    UI.makeBackground(this, 'bg-jungle', [
      [0, '#b9fbc0'],
      [0.5, '#e9f5db'],
      [1, '#fff3b0']
    ]);

    // Soft sunbeams shining down
    const beams = this.add.graphics();
    beams.fillStyle(0xffffff, 0.35);
    beams.fillTriangle(150, 0, 260, 0, 420, 600);
    beams.fillTriangle(420, 0, 500, 0, 640, 600);
    this.tweens.add({ targets: beams, alpha: 0.4, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    UI.addHills(this, 0x95d5b2, 540, 14, 2, 0);
    UI.addHills(this, 0x74c69d, 572, 10, 3, 2);

    // Vines hanging from the top, gently swinging
    [[18, 260], [62, 180], [738, 200], [782, 280]].forEach(([x, length], i) => {
      const vine = this.add.graphics();
      vine.lineStyle(4, 0x40916c, 1);
      vine.lineBetween(0, 0, 0, length);
      vine.fillStyle(0x52b788, 1);
      for (let y = 20; y < length; y += 26) {
        const side = (y / 26) % 2 < 1 ? -1 : 1;
        vine.fillEllipse(side * 9, y, 18, 10);   // a leaf
      }
      const container = this.add.container(x, -5, [vine]);
      this.tweens.add({ targets: container, angle: { from: -4, to: 4 }, duration: 1800 + i * 250, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // A monkey hanging from a vine
    const monkey = this.add.text(62, 175, '🐒', { fontSize: '42px' }).setOrigin(0.5, 0);
    this.tweens.add({ targets: monkey, y: 190, angle: { from: -10, to: 10 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Plants at the bottom corners
    this.add.text(50, 600, '🌿', { fontSize: '80px' }).setOrigin(0.5, 1);
    this.add.text(750, 600, '🌿', { fontSize: '80px' }).setOrigin(0.5, 1).setScale(-1, 1);

    // Butterflies that flutter around the edges
    [[90, 420], [710, 380]].forEach(([x, y], i) => {
      const butterfly = this.add.text(x, y, '🦋', { fontSize: '32px' }).setOrigin(0.5);
      this.tweens.add({ targets: butterfly, x: x + 30, duration: 1700 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: butterfly, y: y - 60, duration: 2300 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: butterfly, scaleX: 0.6, duration: 150, yoyo: true, repeat: -1 }); // flapping wings
    });

    UI.addFloatingSparkles(this, [0xffffff, THEME.gold, 0xb9fbc0]);
  }

  // World 3: bright underwater reef with light rays, bubbles, seaweed and swimming fish
  drawOcean() {
    UI.makeBackground(this, 'bg-ocean', [
      [0, '#caf0f8'],
      [0.35, '#90e0ef'],
      [0.8, '#48cae4'],
      [1, '#00b4d8']
    ]);

    // Sunlight shining down through the water
    const beams = this.add.graphics();
    beams.fillStyle(0xffffff, 0.3);
    beams.fillTriangle(120, 0, 220, 0, 360, 600);
    beams.fillTriangle(480, 0, 560, 0, 700, 600);
    this.tweens.add({ targets: beams, alpha: 0.4, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Fish swimming slowly across (behind the cards)
    ['🐠', '🐟', '🐡', '🐠'].forEach((fish, i) => {
      const y = 150 + i * 110;
      const goingRight = i % 2 === 0;
      const swimmer = this.add.text(goingRight ? -60 : 860, y, fish, { fontSize: '40px' }).setOrigin(0.5);
      swimmer.setScale(goingRight ? -1 : 1, 1); // emoji fish face left, so flip the ones going right
      this.tweens.add({
        targets: swimmer,
        x: goingRight ? 860 : -60,
        duration: 12000 + i * 2500,
        delay: i * 1800,
        repeat: -1
      });
      this.tweens.add({ targets: swimmer, y: y + 15, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Sandy sea floor
    UI.addHills(this, 0xffe8a3, 575, 10, 2, 1);

    // Seaweed growing up from the floor, swaying in the current
    [[20, 230], [62, 160], [740, 180], [782, 240]].forEach(([x, length], i) => {
      const weed = this.add.graphics();
      weed.lineStyle(5, 0x2d6a4f, 1);
      weed.lineBetween(0, 0, 0, -length);
      weed.fillStyle(0x52b788, 1);
      for (let y = 20; y < length; y += 24) {
        const side = (y / 24) % 2 < 1 ? -1 : 1;
        weed.fillEllipse(side * 9, -y, 18, 9);
      }
      const container = this.add.container(x, 600, [weed]);
      this.tweens.add({ targets: container, angle: { from: -6, to: 6 }, duration: 2000 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // A crab walking along the floor and a turtle drifting by
    const crab = this.add.text(120, 590, '🦀', { fontSize: '34px' }).setOrigin(0.5, 1);
    this.tweens.add({ targets: crab, x: 200, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const turtle = this.add.text(720, 460, '🐢', { fontSize: '44px' }).setOrigin(0.5);
    this.tweens.add({ targets: turtle, y: 420, angle: { from: -5, to: 5 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Bubbles rising from the bottom
    this.add.particles(0, 0, 'bubble', {
      x: { min: 0, max: 800 },
      y: 620,
      lifespan: 7000,
      speedY: { min: -40, max: -90 },
      speedX: { min: -10, max: 10 },
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0.9, end: 0.2 },
      frequency: 350
    });
  }

  // World 4: pastel sky with a rainbow, lots of clouds and floating balloons
  drawSky() {
    UI.makeBackground(this, 'bg-sky', [
      [0, '#a2d2ff'],
      [0.5, '#bde0fe'],
      [0.8, '#ffc8dd'],
      [1, '#fff3b0']
    ]);

    // A big soft rainbow
    const rainbow = this.add.graphics();
    [0xff9aa2, 0xffdac1, 0xfff1a8, 0xb5ead7, 0xa2d2ff, 0xc7ceea].forEach((color, i) => {
      rainbow.lineStyle(18, color, 0.6);
      rainbow.beginPath();
      rainbow.arc(400, 640, 470 - i * 18, Math.PI, Math.PI * 2);
      rainbow.strokePath();
    });

    UI.addClouds(this, 8, 560);

    // Castles in the clouds
    this.add.text(60, 600, '🏰', { fontSize: '70px' }).setOrigin(0.5, 1);
    this.add.text(745, 600, '🏰', { fontSize: '56px' }).setOrigin(0.5, 1);
    UI.addHills(this, 0xffffff, 585, 10, 4, 0).setAlpha(0.9); // a fluffy cloud floor

    // Balloons that keep floating up the sides of the screen
    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        const leftSide = Math.random() < 0.5;
        const x = leftSide ? Phaser.Math.Between(25, 105) : Phaser.Math.Between(695, 775);
        const balloon = this.add.text(x, 650, '🎈', { fontSize: Phaser.Math.Between(28, 40) + 'px' }).setOrigin(0.5);
        this.tweens.add({ targets: balloon, y: -60, duration: Phaser.Math.Between(7000, 10000), onComplete: () => balloon.destroy() });
        this.tweens.add({ targets: balloon, x: x + 15, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });

    UI.addFloatingSparkles(this, [0xffffff, THEME.gold, 0xffc8dd]);
  }

  // ---------- Title, counters and buttons ----------

  drawHud() {
    const title = this.add.text(400, 42, this.level.world.name + '  ' + this.level.world.id + '-' + this.level.number, {
      fontFamily: THEME.titleFont,
      fontSize: '38px',
      color: '#ffd60a',
      stroke: THEME.titleStroke,
      strokeThickness: 8
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(3, 4, 94, 0.3)', 3, true, true);
    title.y = -40;
    this.tweens.add({ targets: title, y: 42, duration: 700, ease: 'Back.easeOut' });

    // Map button: ask first once the player has started, so a stray tap doesn't lose the level
    UI.makeIconButton(this, 40, 40, '🗺️', () => {
      const goToMap = () => UI.goToScene(this, 'MapScene', { world: this.level.world.id });
      if (this.moves > 0 && !this.isOver) {
        UI.showConfirm(this, 'Leave this level?\nYour cards will be reshuffled.', 'LEAVE', goToMap, 'STAY');
      } else {
        goToMap();
      }
    }).setDepth(10);
    UI.makeSettingsButton(this, 760, 40).setDepth(10);

    // Hint button: (watch an ad to) see one pair for a moment.
    // It sits on the right edge, away from the Settings gear, with a clear label.
    this.hintButton = UI.makeIconButton(this, 752, 320, '💡', () => this.useHint()).setDepth(10);
    this.hintButton.add(this.add.text(0, 44, 'HINT', {
      fontFamily: THEME.titleFont, fontSize: '20px', color: '#ffffff', stroke: THEME.titleStroke, strokeThickness: 5
    }).setOrigin(0.5));
    if (Ads.hasAds()) {
      this.hintButton.add(this.add.text(22, -24, 'AD', {
        fontFamily: THEME.bodyFont, fontSize: '15px', fontStyle: '600', color: '#ffffff',
        backgroundColor: '#ff70a6', padding: { x: 5, y: 1 }
      }).setOrigin(0.5));
    }
    this.tweens.add({ targets: this.hintButton, angle: { from: -8, to: 8 }, duration: 250, yoyo: true, repeat: 3, delay: 6000, repeatDelay: 0 });

    const pairsLabel = '💎 Pairs: 0 / ' + this.totalPairs;
    if (this.level.timeLimit > 0) {
      // Three counters when there is a timer
      this.movesText = this.makeHudPill(180, 98, '👣 Moves: 0');
      this.pairsText = this.makeHudPill(400, 98, pairsLabel);
      this.timerText = this.makeHudPill(620, 98, '⏳ ' + this.formatTime(this.timeLeft));
    } else {
      this.movesText = this.makeHudPill(285, 98, '👣 Moves: 0');
      this.pairsText = this.makeHudPill(515, 98, pairsLabel);
    }
  }

  makeHudPill(x, y, label) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillRoundedRect(x - 105, y - 21, 210, 42, 21);
    g.lineStyle(3, THEME.green, 1);
    g.strokeRoundedRect(x - 105, y - 21, 210, 42, 21);

    return this.add.text(x, y, label, {
      fontFamily: THEME.bodyFont,
      fontSize: '23px',
      fontStyle: '600',
      color: THEME.textDark
    }).setOrigin(0.5);
  }

  // Change a counter's text with a little bounce
  bumpText(textObject, newText) {
    textObject.setText(newText);
    this.tweens.add({ targets: textObject, scale: 1.3, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  }

  // 95 seconds -> "1:35"
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  // ---------- Timer (only on levels with a timeLimit) ----------

  startTimer() {
    if (this.level.timeLimit <= 0) return;
    if (this.timerEvent) this.timerEvent.remove(); // never run two clocks at once

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isOver) return;
        this.timeLeft--;
        this.timerText.setText('⏳ ' + this.formatTime(this.timeLeft));

        // Last 10 seconds: turn red, bounce and tick
        if (this.timeLeft <= 10) {
          this.timerText.setColor('#e63946');
          this.bumpText(this.timerText, this.timerText.text);
          SoundManager.playTick();
        }

        if (this.timeLeft <= 0) {
          this.showLoseScreen();
        }
      }
    });
  }

  // ---------- Cards ----------

  // Shuffle the cards and deal them onto the table one by one
  dealCards() {
    const deck = this.level.treasures.concat(this.level.treasures); // two of each
    Phaser.Utils.Array.Shuffle(deck);

    // Make the cards smaller when there are lots of them, so they all fit
    const rows = this.level.rows;
    const cols = this.level.cols;
    const gap = rows >= 5 ? 10 : 14;
    const areaWidth = 600;   // space for cards: x from 100 to 700
    const areaHeight = 460;  // y from 130 to 590
    const cellWidth = (areaWidth - (cols - 1) * gap) / cols;
    const cellHeight = (areaHeight - (rows - 1) * gap) / rows;
    const cardScale = Math.min(cellWidth / 110, cellHeight / 130, 1);
    const cardWidth = 110 * cardScale;
    const cardHeight = 130 * cardScale;

    const gridWidth = cols * cardWidth + (cols - 1) * gap;
    const gridHeight = rows * cardHeight + (rows - 1) * gap;
    const startX = 400 - gridWidth / 2 + cardWidth / 2;
    const startY = 130 + (areaHeight - gridHeight) / 2 + cardHeight / 2;

    const dealDelay = Math.min(80, 1200 / deck.length); // deal faster when there are more cards

    // Tell the player the goal for 3 stars while the cards fly in
    UI.showToast(this, 400, 330, '⭐⭐⭐ Find all pairs in ' + this.level.stars[0] + ' moves or less!');

    this.cards = [];
    deck.forEach((emoji, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);
      const card = this.createCard(x, y, emoji, cardScale);
      this.cards.push(card);

      // Start small and spun, below the screen, then fly into place
      card.setPosition(400, 720);
      card.setScale(cardScale * 0.3);
      card.setAngle(Phaser.Math.Between(-40, 40));
      this.tweens.add({
        targets: card,
        x, y,
        scale: cardScale,
        angle: 0,
        duration: 550,
        delay: 300 + index * dealDelay,
        ease: 'Back.easeOut',
        onStart: () => SoundManager.playDeal()
      });
    });

    // Let the player click once every card has landed
    this.time.delayedCall(300 + deck.length * dealDelay + 550, () => {
      this.isDealing = false;
      this.isBusy = false;
      this.startTimer();

      // First time ever on level 1: show how to play
      if (this.level.id === 1 && Progress.getStars(1) === 0) {
        this.showTutorial();
      }
    });
  }

  // A hand that taps two cards, with a hint message, until the player clicks a card
  showTutorial() {
    const [cardA, cardB] = this.cards;
    this.tutorial = this.add.container(0, 0).setDepth(20);

    // Shown over the title at the top, so it doesn't cover any cards
    const message = this.add.text(400, 42, 'Tap two cards to find a matching pair!', {
      fontFamily: THEME.bodyFont, fontSize: '24px', fontStyle: '600', color: THEME.textDark,
      backgroundColor: '#ffffff', padding: { x: 18, y: 8 }
    }).setOrigin(0.5);
    const hand = this.add.text(cardA.x + 20, cardA.y + 30, '👆', { fontSize: '48px' }).setOrigin(0.3, 0);
    this.tutorial.add([message, hand]);

    // Move the hand from the first card to the second, tapping each one
    this.tweens.chain({
      targets: hand,
      loop: -1,
      tweens: [
        { scale: 0.8, duration: 200, yoyo: true },
        { x: cardB.x + 20, y: cardB.y + 30, duration: 600, ease: 'Sine.easeInOut', delay: 200 },
        { scale: 0.8, duration: 200, yoyo: true },
        { x: cardA.x + 20, y: cardA.y + 30, duration: 600, ease: 'Sine.easeInOut', delay: 400 }
      ]
    });
  }

  hideTutorial() {
    if (!this.tutorial) return;
    const tutorial = this.tutorial;
    this.tutorial = null;
    this.tweens.add({ targets: tutorial, alpha: 0, duration: 300, onComplete: () => tutorial.destroy() });
  }

  // ---------- Hint (rewarded ad) ----------

  useHint() {
    if (this.hintUsed || this.isBusy || this.isOver) return;

    // Find a pair where both cards are still face down
    const hidden = this.cards.filter((c) => !c.isFaceUp);
    const pairCard = hidden.find((c) => hidden.filter((other) => other.emoji === c.emoji).length === 2);
    if (!pairCard) {
      UI.showToast(this, 400, 330, 'No hidden pairs left - you can do it!');
      return;
    }

    // With real ads, ask first so a stray tap never starts an ad
    if (Ads.hasAds()) {
      UI.showConfirm(this, 'Watch a short ad to\npeek at a pair?', 'WATCH', () => this.showHint(), 'NO THANKS');
    } else {
      this.showHint();
    }
  }

  showHint() {
    if (this.hintUsed || this.isBusy || this.isOver) return;
    const hidden = this.cards.filter((c) => !c.isFaceUp);
    const pairCard = hidden.find((c) => hidden.filter((other) => other.emoji === c.emoji).length === 2);
    if (!pairCard) return;
    const pair = hidden.filter((c) => c.emoji === pairCard.emoji);

    this.isBusy = true;
    if (this.timerEvent) this.timerEvent.paused = true; // the ad doesn't eat your time

    Ads.showRewarded(() => {
      this.hintUsed = true;
      this.hintButton.disableInteractive();
      this.hintButton.setAlpha(0.35);
      if (this.timerEvent) this.timerEvent.paused = false;

      // Peek at the pair for a moment, with a glow so it's easy to spot
      pair.forEach((card) => {
        this.flipVisual(card, true);
        this.tweens.add({ targets: card.glow, alpha: 1, duration: 200, yoyo: true, hold: 1100 });
      });
      this.time.delayedCall(1500, () => {
        pair.forEach((card) => this.flipVisual(card, false));
        this.isBusy = false;
      });
    }, () => {
      // Ad skipped: no hint
      if (this.timerEvent) this.timerEvent.paused = false;
      this.isBusy = false;
    });
  }

  // Creates one card. A card is a "container" holding a shadow, a back side and a front side.
  createCard(x, y, emoji, cardScale) {
    // Soft yellow glow behind the card, shown when it is matched
    const glow = this.add.image(x, y, 'glow').setScale(1.8 * cardScale).setTint(0xffe066).setAlpha(0);

    const shadow = this.add.image(4, 8, 'card-shadow-day');
    const back = this.add.image(0, 0, this.cardBackKey);
    const question = this.add.text(0, 2, '?', {
      fontFamily: THEME.titleFont, fontSize: '42px', color: this.level.world.cards.question
    }).setOrigin(0.5);
    const front = this.add.image(0, 0, this.cardFrontKey).setVisible(false);
    const picture = this.add.text(0, 2, emoji, { fontSize: '58px' }).setOrigin(0.5).setVisible(false);

    const card = this.add.container(x, y, [shadow, back, question, front, picture]);
    card.setSize(110, 130);
    card.setInteractive({ useHandCursor: true });

    // Remember useful things on the card itself
    card.emoji = emoji;
    card.isFaceUp = false;
    card.homeY = y;
    card.baseScale = cardScale;
    card.glow = glow;
    card.front = front;
    card.showFront = (faceUp) => {
      back.setVisible(!faceUp);
      question.setVisible(!faceUp);
      front.setVisible(faceUp);
      picture.setVisible(faceUp);
    };

    // Lift the card a little when the mouse is over it
    card.on('pointerover', () => {
      if (this.isDealing || card.isFaceUp) return;
      this.tweens.add({ targets: card, y: card.homeY - 8, duration: 120, ease: 'Quad.easeOut' });
    });
    card.on('pointerout', () => {
      if (this.isDealing) return;
      this.tweens.add({ targets: card, y: card.homeY, duration: 120, ease: 'Quad.easeOut' });
    });

    card.on('pointerdown', () => this.onCardClicked(card));
    return card;
  }

  // Called whenever the player clicks a card
  onCardClicked(card) {
    // Ignore clicks while busy, or on cards that are already face up
    if (this.isBusy || this.isOver || card.isFaceUp) {
      return;
    }

    this.hideTutorial();
    this.flipCard(card, true);

    if (this.firstCard === null) {
      // This is the first card of the turn - remember it and wait for the second
      this.firstCard = card;
      return;
    }

    // This is the second card - compare the two
    const secondCard = card;
    this.moves++;
    this.bumpText(this.movesText, '👣 Moves: ' + this.moves);

    if (this.firstCard.emoji === secondCard.emoji) {
      this.onMatch(this.firstCard, secondCard);
    } else {
      this.onMismatch(this.firstCard, secondCard);
    }
    this.firstCard = null;
  }

  onMatch(cardA, cardB) {
    this.pairsFound++;
    this.bumpText(this.pairsText, '💎 Pairs: ' + this.pairsFound + ' / ' + this.totalPairs);

    // Matched cards can't be clicked anymore
    cardA.disableInteractive();
    cardB.disableInteractive();

    // Wait for the flip animation to finish, then celebrate
    this.time.delayedCall(260, () => {
      SoundManager.playMatch();

      [cardA, cardB].forEach((card) => {
        card.y = card.homeY;
        this.burst.explode(24, card.x, card.y);

        // Yellow glow that keeps gently pulsing
        this.tweens.add({ targets: card.glow, alpha: 1, duration: 300 });
        this.tweens.add({ targets: card.glow, alpha: 0.5, duration: 900, delay: 300, yoyo: true, repeat: -1 });

        // Pop!
        this.tweens.add({ targets: card, scale: card.baseScale * 1.12, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
      });

      this.showFloatingText((cardA.x + cardB.x) / 2, Math.min(cardA.y, cardB.y) - 40, 'Match!');
    });

    if (this.pairsFound === this.totalPairs) {
      this.isOver = true;
      this.time.delayedCall(1100, () => this.showWinScreen());
    }
  }

  onMismatch(cardA, cardB) {
    // Block clicks, let the player see both cards, then shake and flip back
    this.isBusy = true;

    this.time.delayedCall(500, () => {
      SoundManager.playMismatch();
      [cardA, cardB].forEach((card) => {
        card.front.setTint(0xffb3b3); // turn a little red
        this.tweens.add({ targets: card, x: card.x + 8, duration: 50, yoyo: true, repeat: 3 });
      });
    });

    this.time.delayedCall(1000, () => {
      [cardA, cardB].forEach((card) => {
        card.front.clearTint();
        this.flipCard(card, false);
      });
      if (!this.isOver) {
        this.isBusy = false; // (if time ran out meanwhile, stay blocked)
      }
    });
  }

  // Turn a card over for real (it counts as face up / face down)
  flipCard(card, faceUp) {
    card.isFaceUp = faceUp;
    this.flipVisual(card, faceUp);
  }

  // Flip animation only: squash the card to zero width, swap sides, then stretch it back.
  // (The hint uses this directly to peek at cards without really turning them over.)
  flipVisual(card, faceUp) {
    SoundManager.playFlip();
    this.tweens.add({
      targets: card,
      scaleX: 0,
      duration: 110,
      ease: 'Quad.easeIn',
      onComplete: () => {
        card.showFront(faceUp);
        this.tweens.add({ targets: card, scaleX: card.baseScale, duration: 110, ease: 'Quad.easeOut' });
      }
    });
    if (!faceUp) {
      this.tweens.add({ targets: card, y: card.homeY, duration: 120 });
    }
  }

  // Text that floats up and fades away (like "Match!")
  showFloatingText(x, y, message) {
    const text = this.add.text(x, y, message, {
      fontFamily: THEME.titleFont,
      fontSize: '34px',
      color: '#ffd60a',
      stroke: THEME.titleStroke,
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(25).setScale(0.5);

    this.tweens.add({ targets: text, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 900, delay: 300, onComplete: () => text.destroy() });
  }

  // ---------- End screens ----------

  // Builds the white popup panel used by both the win and lose screens
  makeEndPanel(emoji, title) {
    // See-through blue layer that also blocks clicks on the cards
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x023e8a, 0.45).setDepth(15).setAlpha(0).setInteractive();
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

    const panel = this.add.container(400, 300).setDepth(16);

    const box = this.add.graphics();
    box.fillStyle(0xffffff, 1);
    box.fillRoundedRect(-240, -200, 480, 400, 28);
    box.fillStyle(0xcaf0f8, 1);                       // light blue top half
    box.fillRoundedRect(-232, -192, 464, 180, 22);
    box.lineStyle(6, THEME.green, 1);
    box.strokeRoundedRect(-240, -200, 480, 400, 28);
    panel.add(box);

    const icon = this.add.text(0, -140, emoji, { fontSize: '64px' }).setOrigin(0.5);
    this.tweens.add({ targets: icon, y: -150, angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    panel.add(icon);

    panel.add(this.add.text(0, -70, title, {
      fontFamily: THEME.titleFont, fontSize: '44px', color: '#ffd60a', stroke: THEME.titleStroke, strokeThickness: 8
    }).setOrigin(0.5));

    panel.setScale(0);
    this.tweens.add({ targets: panel, scale: 1, duration: 550, delay: 300, ease: 'Back.easeOut' });

    this.endOverlay = overlay;
    this.endPanel = panel;
    return panel;
  }

  // Leave the level, maybe showing an ad between levels first
  leaveTo(sceneKey, data) {
    // isLeaving is only set after the ad, so remember the first tap here
    if (this.isLeaving || this.leaveRequested) return;
    this.leaveRequested = true;
    Ads.maybeShowInterstitial(() => UI.goToScene(this, sceneKey, data));
  }

  // The win screen: confetti, a trophy and 1 to 3 stars
  showWinScreen() {
    if (this.timerEvent) this.timerEvent.remove();
    SoundManager.playWin();

    // How many stars? Fewer moves = more stars
    const stars = this.moves <= this.level.stars[0] ? 3 : this.moves <= this.level.stars[1] ? 2 : 1;
    Progress.saveStars(this.level.id, stars);
    Ads.levelCompleted(this.level.id);

    // Confetti falling from the top for a few seconds
    const confetti = this.add.particles(0, -20, 'confetti', {
      x: { min: 0, max: 800 },
      speedY: { min: 120, max: 260 },
      speedX: { min: -80, max: 80 },
      rotate: { start: 0, end: 540 },
      lifespan: 4500,
      frequency: 30,
      quantity: 2,
      tint: [THEME.gold, THEME.pink, THEME.green, THEME.blue, 0xffffff]
    });
    confetti.setDepth(15.5); // above the blue overlay, behind the panel
    this.time.delayedCall(2500, () => confetti.stop());

    const panel = this.makeEndPanel('🏆', 'TREASURE FOUND!');

    // Three grey stars - the ones you earned turn gold one after another
    for (let i = 0; i < 3; i++) {
      const starX = (i - 1) * 75;
      const star = this.add.text(starX, -2, '★', {
        fontFamily: THEME.bodyFont, fontSize: '68px', color: '#d0e4ea'
      }).setOrigin(0.5);
      panel.add(star);

      if (i < stars) {
        this.time.delayedCall(900 + i * 350, () => {
          star.setColor('#ffc300');
          star.setStroke('#ff9f1c', 4);
          star.setScale(0);
          this.tweens.add({ targets: star, scale: 1, duration: 400, ease: 'Back.easeOut' });
          SoundManager.playStar(i);
          this.burst.explode(20, 400 + starX, 298);
        });
      }
    }

    const nextLevel = LEVELS.find((l) => l.id === this.level.id + 1);
    const messages = ['', 'Treasure hunter!', 'Great adventurer!', 'Legendary explorer!'];

    panel.add(this.add.text(0, 62, nextLevel ? messages[stars] : 'You finished every adventure!', {
      fontFamily: THEME.bodyFont, fontSize: '26px', fontStyle: '600', color: THEME.textDark
    }).setOrigin(0.5));

    // Tell the player how to do better next time
    const nextGoal = stars === 3 ? 'Perfect memory!'
      : 'Next time: ' + this.level.stars[stars === 2 ? 0 : 1] + ' moves or less for ' + '⭐'.repeat(stars + 1);
    panel.add(this.add.text(0, 95, this.moves + ' moves.  ' + nextGoal, {
      fontFamily: THEME.bodyFont, fontSize: '20px', fontStyle: '600', color: '#468faf'
    }).setOrigin(0.5));

    // Buttons: Replay, Map, and Next (if there is a next level)
    const buttonOptions = { width: 140, height: 60, fontSize: 22 };
    const replayX = nextLevel ? -150 : -80;
    const mapX = nextLevel ? 0 : 80;

    panel.add(UI.makeButton(this, replayX, 150, 'REPLAY',
      () => this.leaveTo('LevelScene', { level: this.level.id }),
      Object.assign({ color: THEME.orange }, buttonOptions)));
    panel.add(UI.makeButton(this, mapX, 150, 'MAP',
      () => this.leaveTo('MapScene', { world: (nextLevel || this.level).world.id }),
      Object.assign({ color: THEME.blue }, buttonOptions)));

    if (nextLevel) {
      const nextButton = UI.makeButton(this, 150, 150, 'NEXT',
        () => this.leaveTo('LevelScene', { level: nextLevel.id }),
        Object.assign({ color: THEME.green }, buttonOptions));
      panel.add(nextButton);
      // Wiggle the Next button so players notice it
      this.tweens.add({ targets: nextButton, angle: { from: -4, to: 4 }, duration: 300, yoyo: true, repeat: -1, delay: 2000, repeatDelay: 800 });
    }
  }

  // The lose screen (only on timed levels)
  showLoseScreen() {
    this.isOver = true;
    this.isBusy = true;
    this.timerEvent.remove();
    SoundManager.playLose();

    const panel = this.makeEndPanel('⏰', "TIME'S UP!");

    // A kind message that fits how far the player got
    const found = this.pairsFound;
    const cheer = found === 0 ? 'The clock is tricky!'
      : found * 2 < this.totalPairs ? 'Good start!'
        : 'So close!';
    panel.add(this.add.text(0, 0, cheer + ' You found ' + found + ' of ' + this.totalPairs + ' pairs.', {
      fontFamily: THEME.bodyFont, fontSize: '22px', fontStyle: '600', color: THEME.textDark
    }).setOrigin(0.5));

    // Offer 30 more seconds for watching an ad (once per level)
    if (!this.extraTimeUsed) {
      const extraLabel = Ads.hasAds() ? 'WATCH AD: +30 SEC' : '+30 SECONDS';
      const extraButton = UI.makeButton(this, 0, 75, extraLabel, () => this.addExtraTime(),
        { width: 320, height: 58, fontSize: 24, color: THEME.green });
      panel.add(extraButton);
      this.tweens.add({ targets: extraButton, scale: 1.06, duration: 500, yoyo: true, repeat: -1, delay: 900 });
    } else {
      panel.add(this.add.text(0, 50, 'Try again - you can do it!', {
        fontFamily: THEME.bodyFont, fontSize: '18px', color: '#468faf'
      }).setOrigin(0.5));
    }

    panel.add(UI.makeButton(this, -95, 150, 'TRY AGAIN',
      () => UI.goToScene(this, 'LevelScene', { level: this.level.id }),
      { width: 180, height: 60, fontSize: 22, color: THEME.orange }));
    panel.add(UI.makeButton(this, 95, 150, 'MAP',
      () => UI.goToScene(this, 'MapScene', { world: this.level.world.id }),
      { width: 180, height: 60, fontSize: 22, color: THEME.blue }));
  }

  // Rewarded ad on the Time's Up screen: close the popup and keep playing with 30 more seconds
  addExtraTime() {
    if (this.extraTimeRequested) return; // a double tap must not start two ads
    this.extraTimeRequested = true;
    Ads.showRewarded(() => {
      this.extraTimeUsed = true;
      this.endOverlay.destroy();
      this.endPanel.destroy();

      this.timeLeft = 30;
      this.timerText.setColor(THEME.textDark);
      this.bumpText(this.timerText, '⏳ ' + this.formatTime(this.timeLeft));
      this.isOver = false;
      this.isBusy = false;
      this.startTimer();
    }, () => {
      this.extraTimeRequested = false; // ad skipped: the button can be tapped again
    });
  }
}
