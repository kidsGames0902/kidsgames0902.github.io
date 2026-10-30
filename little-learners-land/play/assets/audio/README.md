# Audio files

The game runs without any audio files: sound effects and music are synthesized and voice
lines use the device's speech synthesis. To use real recordings, drop files here and list
them in `src/config/assetManifest.ts`. Gameplay code does not change.

## Sound effects (`sfx/`) → `SFX_FILES`

| key | when |
| --- | --- |
| click | any menu button |
| tap | (spare) light tap |
| correct | right answer lands in the train |
| wrong | soft "try again" boop (keep it gentle) |
| star | each star earned |
| coin | coin reaches the counter |
| train | train whistle (enter / celebrate) |
| whoosh | train leaves |
| complete | round complete fanfare |
| locked | tapping something that's "Coming soon" |

## Music → `MUSIC_FILE`

One looping track, e.g. `music.mp3`.

## Voice (`voice/`) → `VOICE_FILES`

| key | line |
| --- | --- |
| missing-number | "What number is missing?" |
| try-again | "Try again!" |
| almost | "Almost!" |
| great-1 … great-20 | "Great! One!" … (praise with the number) |
| amazing | "Amazing! You did it!" |
| well-done | "Well done!" |

Important for Android: speech synthesis is unreliable inside Android WebView, so record the
voice lines before publishing to Google Play.
