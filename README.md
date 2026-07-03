# Beat Strike

A browser-based rhythm click game. Hit the beat when the outer ring meets the inner circle — chain successful hits to stack your combo and multiply your score.

## How to Play

1. Open `index.html` in a web browser (or run a local server — see below).
2. Click **Start Game** or press **Space**.
3. Watch as **outer line outlines shrink inward** onto target shapes (circles, squares, triangles, hexagons, diamonds).
4. **Click** (or press **Space**) when the shrinking lines perfectly line up with the inner shape.
5. **Perfect** timing earns points and builds your combo. **Early** or **Late** resets your combo.
6. A **progress bar** at the bottom tracks your remaining time. The game lasts 60 seconds.

## Run Locally

```bash
# Python 3
python3 -m http.server 8080

# Then open http://localhost:8080
```

Or simply open `index.html` directly in your browser.

## Tech

- Vanilla HTML, CSS, and JavaScript — no build step required
- Canvas rendering for beat circles and particle effects
- Web Audio API for hit feedback sounds
