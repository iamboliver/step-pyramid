# Step Pyramid

A step-by-step solver for the 4-layer (Master) Pyraminx. Colour in each
side of your puzzle, and the app walks you through the turns to solve it,
with a large interactive 3D guide for every move.

Two static pages, no build step:

| File | What it is |
|------|------------|
| `pyraminx.html` | The Step Pyramid solver |
| `index.html` | "Hello, World(s)" solar-system page (links to the solver) |

## Running locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/pyraminx.html
```

## How the solver works

The move engine is derived from the puzzle's 3D geometry: each sticker's
layer position along the four corner axes identifies which of the 30
physical pieces it belongs to (4 tips, 4 corners, 4 centres, 6 middle
edges, 12 wings). The solve runs in four stages, each preserving the
previous ones:

1. **Centres & middle edges** via 3-layer slice turns, solved from an
   exact breadth-first lookup table (138,240 states, God's number 10).
2. **Corners**, one twist each.
3. **Wings**, using commutators that 3-cycle wing pieces and touch
   nothing else.
4. **Tips**, one twist each.

Target face colours are read from the puzzle itself, so it solves
correctly no matter which way you were holding it.
