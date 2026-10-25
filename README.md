# Tone Circle

A small interactive tool for exploring music theory: the 12 pitch classes of
12-tone equal temperament arranged in a circle like a 12-hour clock.

Each of the 12 "beads" (C, Db, D, … B, clockwise from the top) is an on/off
button, so any subset of pitch classes — a single tone, an interval, a chord,
a scale — can be drawn on the circle. Because pitch classes form the cyclic
group Z12, transposition corresponds to rotating the circle.

Features:

- click a bead to toggle a tone; drag a tone onto another bead to move it,
  or off the circle to remove it
- drag around the circle (off the beads) or use the ← → keys to transpose
- Delete (or submitting an empty chord field) clears all tones
- chord and scale names (e.g. "Am7", "C diatonic (major)")
- pick a key (click or drag a triangle outside the circle, or press ↑ ↓)
  to see Roman numeral chord names (`IVm7 in A`) and scale degrees
  (`1 b3 5`), also on the beads under the note names (L swaps them)
- press F to arrange the circle in fifths, where a diatonic scale and its
  chords form clusters of neighboring beads
- press C to color the tones by how close they are to the key (green
  inside, yellow for the tritone 4-7, red outside); diatonic tones are
  outlined
- type a chord (`F#m7b5`), scale (`D dorian`), notes (`C E G`) or, in a
  key, Roman numerals (`V7`) or degrees (`1 b3 5`) to set the tones

The music theory behind the features (circle of fifths, key colors, how
tones are named and listed) is explained in
[docs/music-theory.md](docs/music-theory.md).

This is a re-creation of the Android app *Tone Circle* (2013), originally
written in Java, first as a React component for the web, later as a
Rust/Tauri/React desktop app for macOS.

![original app icon](docs/original-icon.png)

## Development

Requirements: Node.js 20+.

```sh
npm install
npm run dev     # start the dev server at http://localhost:5173
npm test        # run unit tests (Vitest) in watch mode
npm run build   # type-check and build for production
```

## Project layout

- `src/music/` — pure, UI-independent music theory model (pitch class sets)
- `src/components/ToneCircle/` — the tone circle React component
- `src/components/ChordInput/` — text input parsing chord/scale names
- `docs/plan.md` — implementation plan and roadmap

## License

[MIT](LICENSE)
