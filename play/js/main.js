// main.js
// This file creates the Phaser game and tells it which scenes exist.
// The FIRST scene in the list is the one that starts automatically.

const config = {
  type: Phaser.AUTO,          // use WebGL if possible, otherwise Canvas
  width: 800,                 // game width in pixels
  height: 600,                // game height in pixels
  backgroundColor: '#caf0f8', // light sky blue
  parent: 'game',             // the id of the <div> in index.html
  scale: {
    mode: Phaser.Scale.FIT,             // shrink/grow to fit the window
    autoCenter: Phaser.Scale.CENTER_BOTH // keep it in the middle
  },
  audio: {
    noAudio: true             // we make our own sounds in SoundManager.js
  },
  scene: [HomeScene, MapScene, LevelScene]
};

// Browsers only allow sound after the player clicks or presses a key.
// On the first click we switch the sound on and start the music.
function enableSound() {
  SoundManager.unlock();
  SoundManager.startMusic();
}
window.addEventListener('pointerdown', enableSound);
window.addEventListener('keydown', enableSound);
window.addEventListener('touchend', enableSound);

// When the player switches to another app or tab, stop the sound.
// (Phaser pauses the game itself, so the level timer stops too.)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    SoundManager.pause('hidden');
  } else {
    SoundManager.resume('hidden');
  }
});

// On a phone held upright, index.html shows "Turn your phone sideways".
// Pause the game (and its timers) until the phone is turned.
const portraitPhone = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function checkOrientation() {
  if (!game) return;
  if (portraitPhone.matches) {
    game.pause();
    SoundManager.pause('rotate');
  } else {
    game.resume();
    SoundManager.resume('rotate');
  }
}
if (portraitPhone.addEventListener) {
  portraitPhone.addEventListener('change', checkOrientation);
} else {
  portraitPhone.addListener(checkOrientation); // older Safari
}

// Wait for the fun fonts to load before starting, so the text looks right.
// If something goes wrong, start anyway after 3 seconds.
let game = null;
function startGame() {
  if (game) return; // already started
  game = new Phaser.Game(config);
  game.events.once('ready', checkOrientation);
}

if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('48px "Luckiest Guy"'),
    document.fonts.load('600 20px "Fredoka"')
  ]).then(startGame, startGame);
  setTimeout(startGame, 3000);
} else {
  startGame();
}
