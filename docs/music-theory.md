# Music theory behind the features

Design notes explaining why some features of Tone Clock work the way they
do. The code lives in `src/music/` (pure functions) and is visualized by
`src/components/ToneClock/`.

## Why a clock

Pitch classes are the integers mod 12, like the hours on a clock face:
C = 0 sits at the top, where 12 ≡ 0 sits on a clock. Transposing a set
is turning it around the dial and inverting it is a mirror image across an
axis. Textbooks of pitch-class set theory draw sets on such a "clock face"
for the same reason.

The name also nods to Peter Schat's *Tone Clock* (*Toonklok*, 1980s),
developed further by Jenny McLeod. It is a different idea though: the 12
"hours" of Schat's clock are the 12 trichord types, not the 12 pitch
classes. The original Android app (2013) was called *Tone Circle*.

## Two orders of the circle: semitones and fifths

The 12 pitch classes can be arranged around the circle in two useful ways:

- **semitones** (chromatic): C Db D Eb E F Gb G Ab A Bb B,
- **fifths**: C G D A E B Gb Db Ab Eb Bb F.

A bead's position is `pitch class × step mod 12`, with a step of 1 or 7
semitones. Since 7 × 7 = 49 ≡ 1 (mod 12), the same formula maps positions
back to pitch classes: the circle of fifths is its own inverse.

One step around the circle is always one bead. So on the circle of fifths
the arrow keys and dragging transpose by a fifth, and moving the key by one
step adds a sharp (or removes a flat) from the key signature.

### What forms a cluster on the circle of fifths

The circle of fifths makes some structures visible as **contiguous arcs**
of neighboring beads:

- a **diatonic scale** is an arc of 7 tones, e.g. C major = F C G D A E B,
- a **pentatonic scale** is an arc of 5 tones, e.g. C D E G A = C G D A E.

Chords built by stacking thirds (triads, 7th, 9th chords) do **not** form
clusters, which can be surprising at first. A third doesn't follow the
7-semitone steps: a major third is 4 steps on the circle of fifths and a
minor third is 3 steps back (4 × 7 = 28 ≡ 4, 3 × 7 = 21 ≡ 9 ≡ -3). Within
the 7-tone diatonic arc, a third is a walk by 4 positions (modulo 7), so a
triad is spread out over the arc: C major (C E G) takes the 2nd, 3rd and
6th beads of F C G D A E B, reached as C → E → G by steps of 4 (C at index
1, E at 1 + 4 = 5, G at 5 + 4 = 9 ≡ 2). Only the 11th and 13th chords, which stack all 7 tones of the
scale, fill the arc completely.

## Key colors: how "inside" a key a tone is

With a key selected, the beads can be colored by how close each tone is to
the key (`keyLevel` in `src/music/keyLevel.ts`).

### The structure of the chromatic scale in a key

The 12 tones split into nested parts:

- the **diatonic scale** (1 2 3 4 5 6 7) and its complement, the **outer
  pentatonic** (b2 b3 b5 b6 b7),
- the diatonic scale itself is an **inner pentatonic** (1 2 3 5 6) plus two
  **transition tones**, 4 and 7, which form a tritone,
- the tritone together with the outer pentatonic forms a **mirrored diatonic
  scale**: the major scale a tritone away (in C: F B + Db Eb Gb Ab Bb = Gb
  major).

### The levels

On the circle of fifths, relative to the tonic, the degrees are at these
positions:

| position | 0 | 1 | 2 | 3 | 4 | 5 | 6  | 7  | 8  | 9  | 10 | 11 |
|----------|---|---|---|---|---|---|----|----|----|----|----|----|
| degree   | 1 | 5 | 2 | 6 | 3 | 7 | b5 | b2 | b6 | b3 | b7 | 4  |

The diatonic arc (4 1 5 2 6 3 7) is centered at **degree 2**. The tritone
4-7 is the axis that cuts the circle in half: the diatonic side and the
other side. The level of a tone is 3 minus its distance from degree 2 around
the circle, which gives 7 symmetric levels:

| level   | +3 | +2   | +1   | 0           | -1     | -2     | -3 |
|---------|----|------|------|-------------|--------|--------|----|
| degrees | 2  | 5, 6 | 1, 3 | 4, 7        | b5, b7 | b2, b3 | b6 |

So:

- diatonic tones have levels 0..3, the others -1..-3,
- the inner pentatonic has levels 1..3, the outer pentatonic -1..-3,
- on the circle of fifths the levels change smoothly around the circle, in
  semitones they alternate.

### The visual representation

- The **hue** shows the level: green (+3) via yellow (0, the tritone) to red
  (-3). This is a discrete gradient of 7 colors; the three groups (inner
  pentatonic, tritone, outer pentatonic) are still recognizable as green,
  yellow and red.
- The **lightness** shows whether a tone is active or not, as without key
  colors, so the chord and its relation to the key can be read at once. For
  that the lightness must not depend on the hue. In HSL it does (a yellow
  of the same "lightness" looks much brighter than a green or red one), so
  active beads looked inconsistent when squinting or on a dim screen. The
  colors are therefore defined in **OKLCH**, a color space whose lightness
  is perceptual: all active beads share one lightness and all inactive
  beads another. The price is a somewhat muted, ochre yellow, since a
  saturated yellow can't be as dark as a green.
- In the **dark theme** the same rule holds the other way round: inactive
  beads are dark (with light labels) and active ones keep their lightness,
  so the active tones are the bright ones.
- **Labels are inverse**: white on active beads, a dark shade of the bead's
  hue on inactive ones, which is easier to read and another cue for which
  tones are active.
- The **diatonic scale** is marked by a **scale arc**, a band just inside
  the ring of beads covering the diatonic tones. On the circle of fifths it
  is one continuous arc over 7 beads (in C: F C G D A E B), showing the key
  as a region next to the tonic marker. In semitones it splits into pieces
  with gaps at the outer pentatonic, like the white and black keys of a
  piano (inverted: dark marks for the "white" keys). It encodes membership
  by position, not by color, so it works without key colors, for color
  blind people and when squinting. (A first attempt with a thin outline of
  diatonic beads was too subtle.) It is muted and translucent, so that it
  supports the beads rather than dominating them.
- The **key markers** (triangles) take the hue of their tone's level, like
  the beads.
- The **root ring** of a chord is a dark shade of its bead's hue (like the
  inactive labels), and the **chord path** a light green tint without a
  border: neutral black and gray looked harsh and out of place among the
  colored beads.
- Switching key colors on and off changes **only the hues** of the beads
  and markers. The chord path, the scale arc and the lightness of the
  markers stay the same in both modes, so that nothing else catches the
  eye.

## Naming and listing tones

### Roman numerals are case-sensitive

Chord qualities are parsed case-insensitively where unambiguous (`CMAJ7`,
`cDim`), but `m` (minor) and `M` (major) differ. Roman numerals stay
uppercase only: by a common convention, lowercase numerals mean a minor
chord (`ii7` = IIm7, `vi` = VIm), so reading `v7` as V7 would be
misleading.

### Tones are listed from the chord root

The table of selected tones starts at the root of the chord name (else the
tonic, else C), since that is how a chord is read: Em7 = E G B D. Below the
notes there are two rows of degrees:

- **chord**: relative to the chord root (Em7 = 1 b3 5 b7),
- **key**: relative to the tonic (Em7 in A = 5 b7 2 4).

This is a simplification: in practice the order depends on the voicing
(inversions, upper extensions). Chord degrees use the names within one
octave (`b3`, not `#9`).

### Choosing a key without one

When there is no key, the first ↑/↓ press picks one: the root of the scale
name if any, else of the chord name, else the lowest tone. A scale is
preferred because e.g. the full C diatonic set is also named as a G13 chord,
but C is the more natural key.

## Spelling the notes: accidentals

Each black key has two names (C# = Db), and which one musicians expect
depends on the key: in D major it is F#, never Gb. The app offers three
settings: **by the key** (default), **always flats** and **always sharps**.
The last two are fixed 12-name tables; spelling by the key works as follows.

### The key's own name

A major key is named by its usual key signature: flats for F Bb Eb Ab Db,
sharps for G D A E B. Db (5 flats) wins over C# (7 sharps) and B (5 sharps)
over Cb (7 flats). The only tie is 6 accidentals, F# major vs. Gb major;
F# is used.

### Diatonic tones: the key signature

The seven tones of the key use each letter once, so their accidentals are
those of the key signature: D E F# G A B C# in D, Eb F G Ab Bb C D in Eb.
In F# major this means E# rather than F, as written in sheet music.

### Chromatic tones: the common alterations

The other five tones have no single correct name; it depends on their
function. A common convention, also seen in the chromatic scale of C in pop
and jazz (C# Eb F# Ab Bb), is:

- **#1 and #4** (raised): leading tones to 2 and 5, as in the secondary
  dominants V/ii (A7 in C, with C#) and V/V (D7 in C, with F#),
- **b3, b6 and b7** (lowered): borrowed from the parallel minor (modal
  mixture), as in bIII, bVI and bVII (Eb, Ab and Bb in C).

These are written relative to the letters of the key: in G, b3 = Bb and
b7 = F; in Bb, #4 = E. When such an alteration lands on a white key, the
natural name is used instead of E#, B#, Cb, Fb or a double accidental: in E
#1 = F (not E#), in Ab b3 = B and b6 = E (not Cb, Fb), in Db b6 = A (not
Bbb). As a result, flat keys (except F, with its F#) use only flats, while
sharp keys borrow some flats (Bb and Eb in G).

Without a key, the notes are spelled as in C.

### Limitations

This is a key-based spelling, not a chord-based one. A chord is ideally
spelled from its own root by its intervals: an E major chord in C is
E G# B, and Db major (the Neapolitan chord) is Db F Ab, while the key
spelling gives E Ab B and C# F Ab. Likewise heptatonic scales other than
the major one (e.g. harmonic minor) would need each letter once. The scale
degree labels keep their own names (`b2`, `b5`), which may differ from the
note spelling (`#1`, `#4`).
