# KeyFlow

A browser piano game: free play with recording, Synthesia-style song lessons, rhythm challenges with scoring, and practice drills. Built with Next.js (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Zustand and Lucide. Audio is synthesized with the raw Web Audio API, so there are no sample downloads.

## Run it

Requires **Node 20.9+**. This machine's default `node` is v14, so switch first:

```powershell
nvm use 22.19.0
npm install
npm run dev
```

Then open http://localhost:3000. `scripts/dev.cmd` starts the dev server on port 3123 with `C:\Program Files\nodejs` (Node 24) first on PATH, without changing your global Node.

If you ever start the dev server under an old Node, delete `.next/` before trying again. Turbopack caches the Node path it used.

Other scripts: `npm run build`, `npm start`, `npm test` (unit tests for scoring, music theory and MIDI I/O, run with Node's built-in test runner), `npm run lint` (type-check).

## Modes

| Route | What it does |
|---|---|
| `/` | Home: playable piano preview, continue learning, daily challenge, stats, popular songs |
| `/play` | Free play: chords, sustain, octave shift, live chord naming, light-trail visualizer, record / play back / clear, export `.mid`, save the take as a song, metronome with BPM |
| `/learn` | Song library by difficulty, audio previews, MIDI import. The player has *Wait for me*, 25–125 % speed, left/right/both hands, section range + loop, and Watch mode |
| `/challenges` | Rhythm game at Easy / Normal / Hard / Expert. Perfect 100 · Great 75 · Good 50 · Miss 0, ×1–×4 combo multiplier, −25 for wrong keys, S–D grades, local leaderboard, seeded daily challenge |
| `/practice` | Note recognition (treble/bass staff), scales (evenness tracking), chords (by ear / build it), melody echo, rhythm tapping with millisecond feedback |
| `/profile` | Skill level & XP, stats, achievements, theme, volume/reverb, key remapping, MIDI, export/import/reset progress |

## Controls

- **Mouse / touch**: click or tap keys. Multi-touch and glissando work. Tapping lower on a key plays it louder.
- **Computer keyboard**: two rows, Z-row = lower octave and Q-row = upper (layout-aware labels). **Space** = sustain, **← →** = octave, **Esc** = pause, **Enter** = start.
- **MIDI keyboard**: "MIDI" button in Free Play or Profile (Chrome/Edge). Velocity and sustain pedal (CC64) are supported.

## Architecture

```
src/lib/audio.ts        AudioEngine: synthesized piano voices, sustain, scheduling, metronome clicks
src/lib/engine.ts       GameEngine + SongClock: audio-clock timeline, judging, combos, wait mode, loops
src/lib/input.ts        One input bus for pointer, keyboard and Web MIDI
src/lib/playback.ts     Note playback, Recorder, Metronome (lookahead scheduling)
src/lib/scoring.ts      Pure scoring rules, grades, levels, streaks
src/lib/midi-file.ts    Standard MIDI File reader/writer
src/lib/repository.ts   Persistence boundary (localStorage now; swap in an API later)
src/data/songs.ts       Built-in songs in a compact notation (see data/build.ts)
src/store/*             Zustand stores: settings, live piano state, progress, library, toasts
src/components/...      PianoKeyboard, FallingNotes (canvas), GameScreen, GameResults, exercises
```

**Timing.** Everything reads one clock: the audio output time from `AudioContext.getOutputTimestamp()`. Accompaniment notes are scheduled ahead on the audio clock. Game logic runs on a 20 ms timer pump and rendering on `requestAnimationFrame`, so frame drops never shift note timing. Pausing, speed changes and wait mode re-anchor the clock and cancel only future voices.

**Data.** `Song`, `Note` (midi, startTime, duration, velocity, track), `UserProgress` and leaderboard-ready `ScoreEntry` types live in `src/lib/types.ts`. All storage goes through `repository.ts`.

## Songs

Public domain: Twinkle Twinkle, Mary Had a Little Lamb, Ode to Joy, Jingle Bells, Minuet in G (Petzold), Greensleeves, Canon in D, Gymnopédie No. 1, Für Elise (opening), Prelude in C (BWV 846), Rondo alla Turca (opening). Originals: Neon Drift, Midnight Arcade, Starfall Étude. All are simplified arrangements.
