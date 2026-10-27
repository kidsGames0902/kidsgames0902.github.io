// MapScene.js
// The Adventure Map: one page per world, each with 3 levels joined by a dotted path.
// Use the arrows to move between worlds. Locked levels show a padlock,
// finished levels show your stars.
//
// Started like this:  this.scene.start('MapScene', { world: 2 })   (world is optional)

const MAP_SPOTS = [
  { x: 190, y: 420 },   // 1st level of the world
  { x: 400, y: 315 },   // 2nd level
  { x: 610, y: 210 }    // 3rd level (the timed "boss" level)
];

class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create(data) {
    this.isLeaving = false;
    UI.createTextures(this);
    this.cameras.main.fadeIn(400, 255, 255, 255);

    // Which world to show: the one asked for, or the world of the next level to play
    const worldId = (data && data.world) || Progress.nextLevel().world.id;
    this.world = WORLDS.find((w) => w.id === worldId) || WORLDS[0];
    const levels = LEVELS.filter((l) => l.world === this.world);

    // --- Background in this world's colors ---
    UI.makeBackground(this, 'bg-map-' + this.world.id, this.world.mapSky);
    UI.addSun(this, 90, 130, 30);
    UI.addClouds(this, 4, 220);
    UI.addHills(this, this.world.mapHills[0], 480, 20, 1.5, 1);
    UI.addHills(this, this.world.mapHills[1], 540, 14, 2, 3);
    this.add.text(720, 600, this.world.icon, { fontSize: '90px' }).setOrigin(0.5, 1).setAlpha(0.9);
    UI.addFloatingSparkles(this);

    // --- Title and total stars ---
    const title = this.add.text(400, 42, 'WORLD ' + this.world.id + ': ' + this.world.name.toUpperCase(), {
      fontFamily: THEME.titleFont,
      fontSize: '38px',
      color: '#ffd60a',
      stroke: THEME.titleStroke,
      strokeThickness: 8
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(3, 4, 94, 0.3)', 3, true, true);
    title.y = -50;
    this.tweens.add({ targets: title, y: 42, duration: 600, ease: 'Back.easeOut' });

    this.add.text(400, 92, '★ ' + Progress.totalStars() + ' / ' + LEVELS.length * 3, {
      fontFamily: THEME.bodyFont,
      fontSize: '22px',
      fontStyle: '600',
      color: '#ffc300',
      stroke: THEME.titleStroke,
      strokeThickness: 4,
      backgroundColor: '#ffffffcc',
      padding: { x: 14, y: 4 }
    }).setOrigin(0.5);

    UI.makeIconButton(this, 40, 40, '🏠', () => UI.goToScene(this, 'HomeScene'));
    UI.makeSettingsButton(this, 760, 40);

    // --- Arrows to the previous / next world ---
    if (this.world.id > 1) {
      this.makeArrow(40, 320, '◀', this.world.id - 1);
    }
    if (this.world.id < WORLDS.length) {
      this.makeArrow(760, 320, '▶', this.world.id + 1);
    }

    this.drawPath();
    levels.forEach((level, i) => this.drawLevelSpot(level, MAP_SPOTS[i], i));
  }

  makeArrow(x, y, symbol, targetWorld) {
    const arrow = UI.makeIconButton(this, x, y, symbol, () => UI.goToScene(this, 'MapScene', { world: targetWorld }));
    arrow.iconText.setColor('#0077b6');
    // Nudge sideways now and then so players notice there is more to see
    this.tweens.add({ targets: arrow, x: x + (symbol === '▶' ? 6 : -6), duration: 400, yoyo: true, repeat: -1, repeatDelay: 1200 });
  }

  // A dotted trail that curves from one level to the next
  drawPath() {
    const curve = new Phaser.Curves.Spline([
      MAP_SPOTS[0].x, MAP_SPOTS[0].y,
      295, 410,
      MAP_SPOTS[1].x, MAP_SPOTS[1].y,
      505, 200,
      MAP_SPOTS[2].x, MAP_SPOTS[2].y
    ]);

    // Dots pop in one after another, like footsteps
    curve.getSpacedPoints(36).forEach((point, i) => {
      const dot = this.add.circle(point.x, point.y, 6, 0xffffff).setStrokeStyle(2, THEME.green);
      dot.setScale(0);
      this.tweens.add({ targets: dot, scale: 1, duration: 200, delay: 250 + i * 25, ease: 'Back.easeOut' });
    });
  }

  drawLevelSpot(level, spot, index) {
    const unlocked = Progress.isUnlocked(level.id);
    const stars = Progress.getStars(level.id);
    const color = unlocked ? this.world.mapColor : 0xadb5bd;

    // The round level button
    const g = this.add.graphics();
    g.fillStyle(0x03045e, 0.15);
    g.fillCircle(4, 8, 50);                  // shadow
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 50);
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(-14, -16, 17);              // shine
    g.lineStyle(6, 0xffffff, 1);
    g.strokeCircle(0, 0, 50);

    const content = unlocked
      ? this.add.text(0, 2, this.world.id + '-' + level.number, {
        fontFamily: THEME.titleFont, fontSize: '36px', color: '#ffffff', stroke: THEME.titleStroke, strokeThickness: 6
      }).setOrigin(0.5)
      : this.add.text(0, 0, '🔒', { fontSize: '40px' }).setOrigin(0.5);

    const parts = [g, content];
    if (level.timeLimit > 0) {
      parts.push(this.add.text(36, -36, '⏳', { fontSize: '26px' }).setOrigin(0.5)); // timer badge
    }
    const button = this.add.container(spot.x, spot.y, parts);
    if (!unlocked) button.setAlpha(0.75);

    // Small description under the circle
    const description = level.timeLimit > 0
      ? 'Beat the clock!'
      : level.rows * level.cols + ' cards';
    const label = this.add.text(spot.x, spot.y + 72, description, {
      fontFamily: THEME.bodyFont,
      fontSize: '18px',
      fontStyle: '600',
      color: THEME.textDark,
      backgroundColor: '#ffffffdd',
      padding: { x: 12, y: 4 }
    }).setOrigin(0.5);

    // Stars earned (gold) and not earned yet (outline)
    const starText = this.add.text(spot.x, spot.y + 104, '', {
      fontFamily: THEME.bodyFont, fontSize: '26px'
    }).setOrigin(0.5);
    if (unlocked) {
      starText.setText('★'.repeat(stars) + '☆'.repeat(3 - stars));
      starText.setColor(stars > 0 ? '#ffc300' : '#ffffff');
      starText.setStroke(THEME.titleStroke, 4);
    }

    // Pop everything in, one level after another
    [button, label, starText].forEach((obj) => obj.setScale(0));
    this.tweens.add({
      targets: [button, label, starText],
      scale: 1,
      duration: 500,
      delay: 400 + index * 200,
      ease: 'Back.easeOut'
    });

    button.setSize(110, 110);
    button.setInteractive({ useHandCursor: true });

    // Locked: wobble and say which level opens it
    if (!unlocked) {
      const before = LEVELS.find((l) => l.id === level.id - 1);
      button.on('pointerdown', () => {
        SoundManager.unlock();
        SoundManager.playMismatch();
        this.tweens.add({ targets: button, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 2,
          onComplete: () => button.setAngle(0) });
        UI.showToast(this, spot.x, spot.y - 80, 'Finish ' + before.world.id + '-' + before.number + ' to unlock!');
      });
      return;
    }

    // Clickable: grow on hover, start the level on click
    button.on('pointerover', () => {
      SoundManager.playHover();
      this.tweens.add({ targets: button, scale: 1.12, duration: 120, ease: 'Back.easeOut' });
    });
    button.on('pointerout', () => {
      this.tweens.add({ targets: button, scale: 1, duration: 120 });
    });
    button.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playClick();
      UI.goToScene(this, 'LevelScene', { level: level.id });
    });

    // The next level to play gets a bouncing pin above it
    if (stars === 0) {
      const pin = this.add.text(spot.x, spot.y - 62, '📍', { fontSize: '36px' }).setOrigin(0.5, 1).setAlpha(0);
      this.tweens.add({ targets: pin, alpha: 1, duration: 300, delay: 1100 });
      this.tweens.add({ targets: pin, y: spot.y - 76, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }
}
