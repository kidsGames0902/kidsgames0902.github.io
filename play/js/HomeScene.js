// HomeScene.js
// The title screen: a sunny sky with clouds over teal-green hills,
// a bouncing title, and a big "Start Adventure" button.

class HomeScene extends Phaser.Scene {
  constructor() {
    // 'HomeScene' is the name we use to switch to this scene
    super('HomeScene');
  }

  // create() runs once when the scene starts. We build everything here.
  create() {
    this.isLeaving = false;
    UI.createTextures(this);
    this.cameras.main.fadeIn(600, 255, 255, 255); // fade in from white

    this.drawScenery();
    this.drawMap();
    this.dropInWord('MEMORY', 180, 0);
    this.dropInWord('ADVENTURE', 255, 6);
    this.drawSubtitle();
    this.drawStartButton();
    this.drawHowToPlay();

    UI.makeSettingsButton(this, 760, 40);
  }

  // --- Sky, sun, clouds and rolling hills ---
  drawScenery() {
    // Sky blue at the top, fading to a soft sunny yellow at the bottom
    UI.makeBackground(this, 'bg-home-day', [
      [0, '#48cae4'],
      [0.45, '#90e0ef'],
      [0.75, '#caf0f8'],
      [1, '#fff3b0']
    ]);

    UI.addSun(this, 110, 100, 42);
    UI.addClouds(this, 6, 260);

    // Three layers of hills: far ones are lighter, near ones are deeper teal
    UI.addHills(this, 0xb5ead7, 425, 22, 2, 0.5);
    UI.addHills(this, 0x7bdcb5, 480, 18, 1.5, 2);
    UI.addHills(this, 0x2ec4b6, 545, 14, 2.5, 1);

    // Little flowers swaying on the hills
    [[60, 540], [230, 560], [580, 555], [700, 535], [760, 565]].forEach(([x, y], i) => {
      const flower = this.add.text(x, y, i % 2 ? '🌼' : '🌷', { fontSize: '28px' }).setOrigin(0.5, 1);
      this.tweens.add({ targets: flower, angle: { from: -8, to: 8 }, duration: 1200 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    UI.addFloatingSparkles(this);
  }

  // --- A treasure map that floats, wobbles and glows ---
  drawMap() {
    const glow = this.add.image(400, 85, 'glow').setScale(1.4).setTint(0xfff3b0);
    this.tweens.add({ targets: glow, alpha: 0.5, scale: 1.7, duration: 1000, yoyo: true, repeat: -1 });

    const map = this.add.text(400, 85, '🗺️', { fontSize: '72px' }).setOrigin(0.5);
    map.setScale(0);
    this.tweens.add({ targets: map, scale: 1, duration: 600, delay: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [map, glow], y: 100, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: map, angle: { from: -8, to: 8 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- The title: each letter falls from the sky, bounces, then gently waves ---
  dropInWord(word, y, delayOffset) {
    const style = {
      fontFamily: THEME.titleFont,
      fontSize: '72px',
      color: '#ffd60a',
      stroke: THEME.titleStroke,
      strokeThickness: 10
    };

    // Make one text object per letter
    const letters = word.split('').map((ch) =>
      this.add.text(0, y, ch, style).setOrigin(0.5).setShadow(0, 6, 'rgba(3, 4, 94, 0.35)', 4, true, true)
    );

    // Work out where each letter goes so the whole word is centered
    const spacing = 2;
    const totalWidth = letters.reduce((sum, t) => sum + t.width + spacing, 0) - spacing;
    let x = 400 - totalWidth / 2;

    letters.forEach((letter, i) => {
      letter.x = x + letter.width / 2;
      x += letter.width + spacing;

      const delay = 300 + (delayOffset + i) * 70;
      letter.y = y - 320;
      letter.setAlpha(0);

      // Fall down and bounce
      this.tweens.add({ targets: letter, y, alpha: 1, duration: 800, delay, ease: 'Bounce.easeOut' });

      // Then keep waving up and down forever
      this.tweens.add({ targets: letter, y: y - 8, duration: 900, delay: delay + 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  drawSubtitle() {
    const subtitle = this.add.text(400, 318, 'Find the matching treasures!', {
      fontFamily: THEME.bodyFont,
      fontSize: '26px',
      fontStyle: '600',
      color: '#ffffff',
      stroke: THEME.titleStroke,
      strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: subtitle, alpha: 1, y: 310, duration: 600, delay: 1300 });
  }

  drawStartButton() {
    // A pulsing sunny glow behind the button to draw the eye
    const glow = this.add.image(400, 395, 'glow').setScale(3.2, 1.2).setTint(0xfff3b0).setAlpha(0);
    this.tweens.add({ targets: glow, alpha: { from: 0.4, to: 1 }, duration: 900, delay: 1600, yoyo: true, repeat: -1 });

    // Returning players see "CONTINUE" instead
    const label = Progress.totalStars() > 0 ? 'CONTINUE' : 'START ADVENTURE';
    const button = UI.makeButton(this, 400, 395, label, () => {
      UI.goToScene(this, 'MapScene');
    }, { width: 340, height: 72, fontSize: 32, color: THEME.orange });

    // Pop in after the title has landed
    button.setScale(0);
    this.tweens.add({ targets: button, scale: 1, duration: 500, delay: 1500, ease: 'Back.easeOut' });
  }

  drawHowToPlay() {
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.85);
    panel.fillRoundedRect(130, 490, 540, 70, 20);
    panel.lineStyle(3, THEME.green, 1);
    panel.strokeRoundedRect(130, 490, 540, 70, 20);

    const text = this.add.text(400, 525, '👆 Flip two cards    💎 Match the pairs    🏆 Win!', {
      fontFamily: THEME.bodyFont,
      fontSize: '20px',
      fontStyle: '600',
      color: THEME.textDark
    }).setOrigin(0.5);

    panel.setAlpha(0);
    text.setAlpha(0);
    this.tweens.add({ targets: [panel, text], alpha: 1, duration: 600, delay: 1800 });
  }
}
