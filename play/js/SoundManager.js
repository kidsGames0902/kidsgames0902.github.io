// SoundManager.js
// Makes ALL the music and sound effects with code (the Web Audio API),
// so the game doesn't need any sound files.
//
// Every sound is built from "notes": an oscillator (a tone generator)
// whose volume quickly rises and then fades out.

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.6;

const SoundManager = {
  ctx: null,        // the browser's audio engine (created on the first click)
  musicGain: null,  // music volume
  sfxGain: null,    // sound effects volume
  musicTimer: null,
  pauseReasons: new Set(), // e.g. 'ad' or 'hidden' - sound stays off while any reason is set

  // Remember the settings between visits (localStorage can fail, so we use try/catch)
  settings: (() => {
    try {
      return JSON.parse(localStorage.getItem('memoryAdventureSound')) || { music: true, sfx: true };
    } catch (e) {
      return { music: true, sfx: true };
    }
  })(),

  // Switch the audio engine on. Browsers only allow this after a click.
  unlock() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return; // very old browser: no sound

      this.ctx = new AudioContextClass();

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);

      this.applySettings();
    }
    if (this.ctx.state === 'suspended' && this.pauseReasons.size === 0) {
      this.ctx.resume();
    }
  },

  applySettings() {
    if (!this.ctx) return;
    this.musicGain.gain.value = this.settings.music ? MUSIC_VOLUME : 0;
    this.sfxGain.gain.value = this.settings.sfx ? SFX_VOLUME : 0;
  },

  // which = 'music' or 'sfx'. Returns the new value (true = on).
  toggle(which) {
    this.settings[which] = !this.settings[which];
    this.applySettings();
    try {
      localStorage.setItem('memoryAdventureSound', JSON.stringify(this.settings));
    } catch (e) {
      // not saved - that's ok
    }
    return this.settings[which];
  },

  // Stop all sound for a while (during an ad, or when the app goes to the background)
  pause(reason) {
    this.pauseReasons.add(reason);
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  },

  resume(reason) {
    this.pauseReasons.delete(reason);
    if (this.ctx && this.pauseReasons.size === 0) {
      this.ctx.resume();
    }
  },

  // Turn a piano key number (60 = middle C) into a pitch in Hz
  midi(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  },

  // Play one note.
  //   freq   = pitch in Hz
  //   when   = start time (in audio-engine seconds)
  //   length = how long it lasts in seconds
  //   type   = 'sine' (soft), 'triangle' (flute-like), 'square' (retro game)
  note(freq, when, length, type, volume, output) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.02); // fade in quickly
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length); // fade out

    osc.connect(gain);
    gain.connect(output || this.sfxGain);
    osc.start(when);
    osc.stop(when + length + 0.05);
    return osc;
  },

  // ---------- Sound effects ----------

  playHover() {
    if (!this.ctx) return;
    this.note(880, this.ctx.currentTime, 0.06, 'sine', 0.05);
  },

  playClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.note(660, t, 0.08, 'square', 0.07);
    this.note(990, t + 0.05, 0.1, 'square', 0.06);
  },

  playDeal() {
    if (!this.ctx) return;
    this.note(1200 + Math.random() * 300, this.ctx.currentTime, 0.05, 'sine', 0.08);
  },

  playFlip() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.note(500, t, 0.12, 'triangle', 0.25);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1); // "whoosh" upwards
  },

  playMatch() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // A happy rising arpeggio: C E G C
    [72, 76, 79, 84].forEach((n, i) => {
      this.note(this.midi(n), t + i * 0.07, 0.35, 'triangle', 0.22);
      this.note(this.midi(n + 12), t + i * 0.07, 0.25, 'sine', 0.06); // sparkle on top
    });
  },

  playMismatch() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // A low "uh-oh"
    this.note(this.midi(50), t, 0.18, 'square', 0.07);
    this.note(this.midi(46), t + 0.14, 0.28, 'square', 0.07);
  },

  playStar(index) {
    if (!this.ctx) return;
    // Each star plays a higher note than the last
    this.note(this.midi(76 + index * 4), this.ctx.currentTime, 0.45, 'triangle', 0.25);
  },

  playTick() {
    if (!this.ctx) return;
    this.note(1000, this.ctx.currentTime, 0.05, 'square', 0.05);
  },

  playLose() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // A sad slide downwards
    [67, 63, 60, 55].forEach((n, i) => {
      this.note(this.midi(n), t + i * 0.18, 0.3, 'triangle', 0.2);
    });
  },

  playWin() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // A little victory fanfare
    const melody = [
      [67, 0.0, 0.15], [72, 0.12, 0.15], [76, 0.24, 0.15], [79, 0.36, 0.3],
      [76, 0.56, 0.12], [79, 0.68, 0.12], [84, 0.8, 0.9]
    ];
    melody.forEach(([n, start, length]) => {
      this.note(this.midi(n), t + start, length + 0.1, 'square', 0.08);
      this.note(this.midi(n), t + start, length + 0.2, 'triangle', 0.2);
    });
    [60, 64, 67].forEach((n) => this.note(this.midi(n), t + 0.8, 1.2, 'triangle', 0.12));
  },

  // ---------- Background music ----------
  // A looping adventure tune: 4 chords (A minor, F, C, G), 8 notes per chord.

  bars: [
    { bass: 45, chord: [69, 72, 76] }, // A minor
    { bass: 41, chord: [65, 69, 72] }, // F
    { bass: 48, chord: [67, 72, 76] }, // C
    { bass: 43, chord: [67, 71, 74] }  // G
  ],

  startMusic() {
    if (!this.ctx || this.musicTimer) return; // no audio yet, or already playing

    const stepLength = 60 / 104 / 2; // eighth notes at 104 beats per minute
    let step = 0;
    let nextTime = this.ctx.currentTime + 0.1;

    // Every 60 ms, schedule any notes that are due in the next 0.25 seconds
    this.musicTimer = setInterval(() => {
      const now = this.ctx.currentTime;
      if (nextTime < now) {
        nextTime = now + 0.05; // we fell behind (e.g. tab was hidden) - skip ahead
      }
      while (nextTime < now + 0.25) {
        this.playMusicStep(step, nextTime, stepLength);
        nextTime += stepLength;
        step = (step + 1) % 32;
      }
    }, 60);
  },

  playMusicStep(step, time, stepLength) {
    const bar = this.bars[Math.floor(step / 8)];
    const beat = step % 8;

    // Bass note twice per bar
    if (beat === 0 || beat === 4) {
      this.note(this.midi(bar.bass), time, stepLength * 3.5, 'triangle', 0.5, this.musicGain);
    }

    // Arpeggio: play the chord notes one after another
    const pattern = [0, 1, 2, 1, 0, 1, 2, 1];
    const noteNumber = bar.chord[pattern[beat]] + (beat >= 4 ? 12 : 0);
    this.note(this.midi(noteNumber), time, stepLength * 1.5, 'sine', 0.18, this.musicGain);

    // A twinkle on top near the end of each bar
    if (beat === 6) {
      this.note(this.midi(bar.chord[2] + 12), time, stepLength * 2, 'triangle', 0.1, this.musicGain);
    }
  }
};
