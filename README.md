# Beat Strike

A browser-based rhythm click game. Hit the beat when the outer ring meets the inner circle — chain successful hits to stack your combo and multiply your score.

## How to Play

1. Open `index.html` in a web browser (or run a local server — see below).
2. Click **Start Game** or press **Space**.
3. When a magenta ring shrinks onto a cyan circle, **click** (or press **Space**) at the exact moment they overlap.
4. **Perfect** hits earn full points; **Good** hits earn half. **Miss** and your combo resets.
5. Each consecutive hit increases your combo multiplier — points stack: hit 1 = 100, hit 2 = 200, hit 3 = 300, and so on.
6. The game lasts 60 seconds. Too many misses ends the round early.

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
