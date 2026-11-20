# Emberwood

An endless, cozy 3D idle game. A glowing seed falls through the cracks of a giant's workbench.
Grow the tree, run ropes between branches, and look after the clockwork folk who wake in its light.

## Play
Open `docs/index.html` in any modern browser (phone, tablet or desktop). It is one self-contained file.
Progress saves in the browser and keeps accruing while you are away.

## Develop
```bash
npm install
npm run build   # bundles src/ into docs/index.html
npm test        # headless checks of the game rules (src/logic.js)
```

- `src/logic.js` game rules and simulation (no rendering)
- `src/data.js` folk, tales, memories, seasons and the forks in the wood
- `src/world.js` Three.js scene
- `src/main.js` input, UI, saving
