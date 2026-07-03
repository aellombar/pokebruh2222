# Beat Strike

A browser-based rhythm click game synced to procedural genre songs. Hit the beat when shrinking lines align with the shape — in perfect time with the music.

## How to Play

1. Open `index.html` in a browser (or run a local server below).
2. Click **Choose Song** and pick a track from the level select screen.
3. Watch the outer lines shrink onto the shape **on the beat**.
4. **Click** or press **Space** when lines align exactly with the music.
5. Chain **Perfect** hits to build combo and speed up.

## Songs

| Track | Genre | BPM | Instruments |
|-------|-------|-----|-------------|
| Neon Drift | Electronic | 128 | Synth Bass, Arpeggiator, Drum Machine, Pad Synth |
| Midnight Blue | Jazz | 110 | Grand Piano, Upright Bass, Brush Drums, Tenor Sax |
| Iron Highway | Rock | 140 | Electric Guitar, Bass Guitar, Rock Drums, Power Chords |
| Royal March | Orchestral | 96 | Strings, French Horns, Timpani, Woodwinds |
| Block Party | Hip Hop | 90 | 808 Kick, Snare Clap, Hi-Hats, Synth Stabs |

## Run Locally

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

## Tech

- Vanilla HTML, CSS, JavaScript — no build step
- Web Audio API procedural music (5 unique genre arrangements)
- Beat-synced note spawning locked to song BPM
- Canvas rendering with combo scoring
