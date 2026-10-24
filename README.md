# Tone Circle

A small interactive tool for exploring music theory: the 12 pitch classes of
12-tone equal temperament arranged in a circle like a 12-hour clock.

Each of the 12 "beads" (C, Db, D, … B, clockwise from the top) is an on/off
button, so any subset of pitch classes — a single tone, an interval, a chord,
a scale — can be drawn on the circle. Because pitch classes form the cyclic
group Z12, transposition corresponds to rotating the circle.

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
- `docs/plan.md` — implementation plan and roadmap

## License

[MIT](LICENSE)
