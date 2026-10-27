// UI.js
// Shared colors, fonts and helper functions used by every scene.
// Keeping them in one place makes all the screens look like the same game.

// Where the privacy policy lives (our website on GitHub Pages)
const PRIVACY_POLICY_URL = 'https://kidsgames0902.github.io/privacy-policy.html';

// A bright, sunny palette: sky blue, sunshine yellow and teal green
const THEME = {
  titleFont: '"Luckiest Guy", "Arial Black", sans-serif',
  bodyFont: '"Fredoka", "Trebuchet MS", sans-serif',
  gold: 0xffd60a,         // sunshine yellow
  orange: 0xff9f1c,
  pink: 0xff70a6,
  green: 0x2ec4b6,        // teal green
  blue: 0x0096c7,         // sky blue (deeper, for buttons)
  deepBlue: 0x0077b6,     // outlines
  textDark: '#05668d',    // dark teal text, easy to read on light colors
  titleStroke: '#0077b6',
  sparkleColors: [0xffd60a, 0xffffff, 0x90e0ef, 0x80ffdb]
};

const UI = {
  // Draw small images (sparkle, glow, confetti) once, so every scene can reuse them
  createTextures(scene) {
    if (scene.textures.exists('sparkle')) return; // already made

    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // A small white dot (we tint it different colors later)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('sparkle', 16, 16);
    g.clear();

    // A big soft glow: many see-through circles stacked on top of each other
    for (let i = 0; i < 20; i++) {
      g.fillStyle(0xffffff, 0.05);
      g.fillCircle(64, 64, 64 - i * 3);
    }
    g.generateTexture('glow', 128, 128);
    g.clear();

    // A confetti piece
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 10, 16);
    g.generateTexture('confetti', 10, 16);
    g.clear();

    // A fluffy cloud made of overlapping circles
    g.fillStyle(0xffffff, 1);
    g.fillCircle(45, 55, 30);
    g.fillCircle(80, 42, 38);
    g.fillCircle(115, 55, 28);
    g.fillRoundedRect(15, 50, 130, 34, 17);
    g.generateTexture('cloud', 160, 90);
    g.clear();

    // A see-through bubble with a little shine
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(16, 16, 14);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(11, 10, 3);
    g.generateTexture('bubble', 32, 32);
    g.destroy();
  },

  // A smooth color gradient background.
  // stops = list of [position 0..1, color], from top to bottom.
  makeBackground(scene, key, stops) {
    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, 800, 600);
      const ctx = texture.getContext();
      const gradient = ctx.createLinearGradient(0, 0, 0, 600);
      stops.forEach(([position, color]) => gradient.addColorStop(position, color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 600);
      texture.refresh();
    }
    return scene.add.image(400, 300, key);
  },

  // Fluffy clouds that slowly drift across the sky, then come back around
  addClouds(scene, count, maxY) {
    for (let i = 0; i < count; i++) {
      const cloud = scene.add.image(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(30, maxY),
        'cloud'
      );
      cloud.setScale(Phaser.Math.FloatBetween(0.5, 1.1));
      cloud.setAlpha(Phaser.Math.FloatBetween(0.7, 0.95));
      const speed = Phaser.Math.Between(10, 25); // pixels per second

      const drift = () => {
        scene.tweens.add({
          targets: cloud,
          x: 900,
          duration: ((900 - cloud.x) / speed) * 1000,
          onComplete: () => {
            cloud.x = -100;  // jump back to the left side
            drift();
          }
        });
      };
      drift();
    }
  },

  // A shining sun with slowly turning rays
  addSun(scene, x, y, radius) {
    const glow = scene.add.image(x, y, 'glow').setScale(radius / 20).setTint(0xfff3b0);
    scene.tweens.add({ targets: glow, scale: radius / 17, alpha: 0.7, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const rays = scene.add.graphics({ x, y });
    rays.fillStyle(0xffe066, 0.8);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tipX = Math.cos(angle) * radius * 1.7;
      const tipY = Math.sin(angle) * radius * 1.7;
      const leftX = Math.cos(angle - 0.15) * radius * 1.05;
      const leftY = Math.sin(angle - 0.15) * radius * 1.05;
      const rightX = Math.cos(angle + 0.15) * radius * 1.05;
      const rightY = Math.sin(angle + 0.15) * radius * 1.05;
      rays.fillTriangle(leftX, leftY, tipX, tipY, rightX, rightY);
    }
    scene.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });

    const sun = scene.add.graphics({ x, y });
    sun.fillStyle(0xffd60a, 1);
    sun.fillCircle(0, 0, radius);
    sun.fillStyle(0xfff3b0, 0.6);
    sun.fillCircle(-radius * 0.25, -radius * 0.25, radius * 0.5); // shine
  },

  // Rolling hills: a wavy line across the screen, filled down to the bottom
  addHills(scene, color, baseY, height, waves, shift) {
    const points = [{ x: 0, y: 600 }];
    for (let x = 0; x <= 800; x += 20) {
      const y = baseY + Math.sin((x / 800) * Math.PI * 2 * waves + shift) * height;
      points.push({ x, y });
    }
    points.push({ x: 800, y: 600 });

    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillPoints(points, true);
    return g;
  },

  // Magic dust that floats upwards across the whole screen
  addFloatingSparkles(scene, colors) {
    return scene.add.particles(0, 0, 'sparkle', {
      x: { min: 0, max: 800 },
      y: { min: 0, max: 620 },
      lifespan: 5000,
      speedY: { min: -20, max: -60 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 220,
      tint: colors || THEME.sparkleColors
    });
  },

  // A big, round, shiny button that grows when you point at it
  makeButton(scene, x, y, label, onClick, options = {}) {
    const width = options.width || 260;
    const height = options.height || 64;
    const color = options.color || THEME.green;
    const fontSize = options.fontSize || 28;
    const darker = Phaser.Display.Color.IntegerToColor(color).darken(30).color;
    const radius = height / 2;

    const g = scene.add.graphics();
    g.fillStyle(darker, 1);                                                     // 3D bottom edge
    g.fillRoundedRect(-width / 2, -height / 2 + 6, width, height, radius);
    g.fillStyle(color, 1);                                                      // main color
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    g.fillStyle(0xffffff, 0.25);                                                // shine on top
    g.fillRoundedRect(-width / 2 + 12, -height / 2 + 6, width - 24, height / 2 - 6, (height / 2 - 6) / 2);
    g.lineStyle(3, 0xffffff, 0.9);                                              // white outline
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);

    const text = scene.add.text(0, -1, label, {
      fontFamily: THEME.titleFont,
      fontSize: fontSize + 'px',
      color: '#ffffff',
      stroke: '#' + darker.toString(16).padStart(6, '0'),
      strokeThickness: 5
    }).setOrigin(0.5);

    const button = scene.add.container(x, y, [g, text]);
    button.setSize(width, height + 6);
    button.setInteractive({ useHandCursor: true });
    button.labelText = text; // so the label can be changed later

    button.on('pointerover', () => {
      SoundManager.playHover();
      scene.tweens.add({ targets: button, scale: 1.08, duration: 120, ease: 'Back.easeOut' });
    });
    button.on('pointerout', () => {
      scene.tweens.add({ targets: button, scale: 1, duration: 120 });
    });
    button.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playClick();
      // Squish down and back up, then do the action
      scene.tweens.add({ targets: button, scale: 0.92, duration: 70, yoyo: true, onComplete: onClick });
    });

    return button;
  },

  // A round button with an emoji icon (used for Home, Map, Settings, arrows)
  // The tap area (64) is a bit bigger than the circle so it's easy to hit on a phone.
  makeIconButton(scene, x, y, icon, onClick) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(0, 0, 29);
    g.lineStyle(3, THEME.green, 1);
    g.strokeCircle(0, 0, 29);

    const text = scene.add.text(0, 0, icon, { fontSize: '30px' }).setOrigin(0.5);

    const button = scene.add.container(x, y, [g, text]);
    button.setSize(64, 64);
    button.setInteractive({ useHandCursor: true });
    button.iconText = text;

    button.on('pointerover', () => {
      SoundManager.playHover();
      scene.tweens.add({ targets: button, scale: 1.15, duration: 120, ease: 'Back.easeOut' });
    });
    button.on('pointerout', () => {
      scene.tweens.add({ targets: button, scale: 1, duration: 120 });
    });
    button.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playClick();
      scene.tweens.add({ targets: button, scale: 0.85, duration: 70, yoyo: true, onComplete: onClick });
    });

    return button;
  },

  // A gear button that opens the Settings popup
  makeSettingsButton(scene, x, y) {
    return UI.makeIconButton(scene, x, y, '⚙️', () => UI.showSettings(scene));
  },

  // Settings popup: music on/off, sounds on/off, privacy policy
  showSettings(scene) {
    if (scene.settingsOpen) return;
    scene.settingsOpen = true;
    scene.time.paused = true; // freezes the level timer while the popup is open

    // In a level the cards are hidden while the game is paused, so nobody can study them
    const dim = scene.scene.key === 'LevelScene' ? 0.92 : 0.45;
    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x023e8a, dim).setDepth(50).setInteractive();
    const panel = scene.add.container(400, 300).setDepth(51);

    const box = scene.add.graphics();
    box.fillStyle(0xffffff, 1);
    box.fillRoundedRect(-180, -175, 360, 350, 26);
    box.lineStyle(6, THEME.green, 1);
    box.strokeRoundedRect(-180, -175, 360, 350, 26);
    panel.add(box);

    panel.add(scene.add.text(0, -128, 'SETTINGS', {
      fontFamily: THEME.titleFont, fontSize: '38px', color: '#ffd60a', stroke: THEME.titleStroke, strokeThickness: 7
    }).setOrigin(0.5));

    const label = (which) => (which === 'music' ? 'MUSIC: ' : 'SOUNDS: ') + (SoundManager.settings[which] ? 'ON' : 'OFF');
    const options = { width: 240, height: 54, fontSize: 24 };

    const musicButton = UI.makeButton(scene, 0, -55, label('music'), () => {
      SoundManager.toggle('music');
      musicButton.labelText.setText(label('music'));
    }, Object.assign({ color: THEME.green }, options));

    const sfxButton = UI.makeButton(scene, 0, 15, label('sfx'), () => {
      SoundManager.toggle('sfx');
      sfxButton.labelText.setText(label('sfx'));
    }, Object.assign({ color: THEME.blue }, options));

    const privacy = scene.add.text(0, 72, 'Privacy Policy', {
      fontFamily: THEME.bodyFont, fontSize: '18px', fontStyle: '600', color: THEME.textDark
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    privacy.on('pointerdown', () => window.open(PRIVACY_POLICY_URL, '_blank'));

    const close = () => {
      scene.time.paused = false;
      scene.settingsOpen = false;
      overlay.destroy();
      panel.destroy();
    };
    const closeButton = UI.makeButton(scene, 0, 128, 'CLOSE', close,
      { width: 160, height: 50, fontSize: 22, color: THEME.orange });

    panel.add([musicButton, sfxButton, privacy, closeButton]);
    panel.setScale(0);
    scene.tweens.add({ targets: panel, scale: 1, duration: 350, ease: 'Back.easeOut' });
  },

  // A small yes/no popup, e.g. "Leave this level?". The game is paused while it is open.
  showConfirm(scene, message, yesLabel, onYes, noLabel) {
    if (scene.settingsOpen) return;
    scene.settingsOpen = true;
    scene.time.paused = true;

    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x023e8a, 0.6).setDepth(50).setInteractive();
    const panel = scene.add.container(400, 300).setDepth(51);

    const box = scene.add.graphics();
    box.fillStyle(0xffffff, 1);
    box.fillRoundedRect(-210, -120, 420, 240, 26);
    box.lineStyle(6, THEME.green, 1);
    box.strokeRoundedRect(-210, -120, 420, 240, 26);
    panel.add(box);

    panel.add(scene.add.text(0, -45, message, {
      fontFamily: THEME.bodyFont, fontSize: '26px', fontStyle: '600', color: THEME.textDark,
      align: 'center', wordWrap: { width: 360 }
    }).setOrigin(0.5));

    const close = (then) => {
      scene.time.paused = false;
      scene.settingsOpen = false;
      overlay.destroy();
      panel.destroy();
      if (then) then();
    };
    const options = { width: 170, height: 60, fontSize: 22 };
    panel.add(UI.makeButton(scene, -95, 60, noLabel || 'NO', () => close(),
      Object.assign({ color: THEME.blue }, options)));
    panel.add(UI.makeButton(scene, 95, 60, yesLabel, () => close(onYes),
      Object.assign({ color: THEME.orange }, options)));

    panel.setScale(0);
    scene.tweens.add({ targets: panel, scale: 1, duration: 300, ease: 'Back.easeOut' });
  },

  // A short message that pops up, waits, and fades away (e.g. "Finish 1-1 to unlock!")
  showToast(scene, x, y, message) {
    const text = scene.add.text(x, y, message, {
      fontFamily: THEME.bodyFont, fontSize: '24px', fontStyle: '600', color: THEME.textDark,
      backgroundColor: '#ffffffee', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setDepth(40).setScale(0);
    scene.tweens.add({ targets: text, scale: 1, duration: 200, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: text, alpha: 0, duration: 400, delay: 1800, onComplete: () => text.destroy() });
  },

  // Fade the screen to white, then switch to another scene.
  // data (optional) is passed to the next scene, e.g. { level: 2 }
  goToScene(scene, key, data) {
    if (scene.isLeaving) return; // already switching (stops double clicks)
    scene.isLeaving = true;
    scene.cameras.main.fadeOut(350, 255, 255, 255);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
      scene.scene.start(key, data);
    });
  }
};
