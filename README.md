# The Marigold Line

A cozy, endless 3D idle game. A small steam train crosses a dreamlike world on track that only exists a
little way ahead of it. An old charm makes every carriage larger on the inside than out.

- **The Line (outside):** stoke the boiler, choose forks, and stop at stations where strangers wait.
- **Inside:** a cutaway diorama. Unfold more space, then drag to draw rooms. Passengers walk your layout
  (A* pathfinding through rooms and doors) and bring Charm. Each one carries their own gift room, tales and keepsake.
- **Idle:** the train rolls on and passengers keep living in your rooms while you are away. The train always
  pauses politely at a stop that needs your say, so no one is missed.

## Play
Open `docs/index.html` in any modern browser (phone, tablet or desktop). It is one self-contained file.
Progress saves in the browser.

## Develop
```bash
npm install
npm run build   # bundles src/ into docs/index.html (and docs/fragment.html)
npm test        # headless checks of the game rules (src/logic.js)
```

- `src/logic.js` rules and simulation (no rendering): journey, stops, forks, room grid, doors, pathfinding, offline
- `src/data.js` passengers and their tales, regions, rooms, postcards, memories
- `src/line.js` the outside view; `src/inside.js` the diorama; `src/world.js` renderer and view switching
- `src/main.js` input and UI; `src/audio.js` synthesized sound
