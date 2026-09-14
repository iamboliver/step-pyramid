# Step Pyramid

A step-by-step Pyraminx solver. Colour in each side of your puzzle, and the
app works out the moves and walks you through them with a large interactive
3D guide for every turn. Supports both the standard 3-layer Pyraminx and the
4-layer Master Pyraminx.

One static page, no build step: `index.html`.

## Running locally

Any static file server works, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
#   or    http://localhost:8000/?n=3  for the 3-layer puzzle
```

## Deploying

Deploys as its own Cloudflare project — no build command, output directory
`/`. `wrangler.jsonc` sets `not_found_handling: "single-page-application"`,
which is required: without it, this deployment 404s on any request
carrying a query string (including `?n=3`), since there's no Worker script
to fall back to `index.html` when the built-in asset matcher doesn't
recognise the exact request. To mount it at `oliverbarwell.com/step-pyramid`
instead of a `*.pages.dev`/`*.workers.dev` subdomain, without merging this
repo into the main site's, see
[`cloudflare/README.md`](cloudflare/README.md) (a small Worker proxies the
subpath to this deployment; both free tier).

## How the solver works

The move engine is derived from the puzzle's 3D geometry: each sticker's
layer position along the four corner axes identifies which physical piece
it belongs to. Layer count (`N`, from `?n=3` or the default 4) drives the
geometry, sticker counts, and move set throughout.

**4-layer (Master):** 30 pieces (4 tips, 4 corners, 4 centres, 6 middle
edges, 12 wings), solved in four stages, each preserving the previous ones:

1. **Centres & middle edges** via 3-layer slice turns, solved from an
   exact breadth-first lookup table (138,240 states, God's number 10).
2. **Corners**, one twist each.
3. **Wings**, using commutators that 3-cycle wing pieces and touch
   nothing else.
4. **Tips**, one twist each.

**3-layer (standard):** 14 pieces (4 tips, 4 corners, 6 edges). No slice
moves exist at this size, and every vertex turn also spins that vertex's
own corner block, so edges are solved with corner/tip-neutral commutators
(the same technique as the wing stage above) rather than a raw BFS:

1. **Corners**, one twist each.
2. **Edges**, via commutators.
3. **Tips**, one twist each.

Target face colours are read from the puzzle itself in both modes, so it
solves correctly no matter which way you were holding it.

## SEO

Live at `https://oliverbarwell.com/step-pyramid` (canonical is the apex
domain -- `www.oliverbarwell.com` 301s into it, so canonical/OG/JSON-LD
urls in `index.html` all point at the non-www form). Update every URL in
`index.html`, `robots.txt`, and `sitemap.xml` if deployed elsewhere.

- `robots.txt` and `sitemap.xml` in this repo only actually deploy under
  `/step-pyramid/`, e.g. `oliverbarwell.com/step-pyramid/robots.txt` --
  **not** at the zone root, which is the only place a crawler looks. The
  real `oliverbarwell.com/robots.txt` is Cloudflare's own zone-level
  managed file, outside this repo; it already Disallows several AI
  crawlers (GPTBot, ClaudeBot, Google-Extended, ...) site-wide while
  allowing normal search indexing. See the comment in `robots.txt` for
  detail. Submit `sitemap.xml`'s real URL directly in Search Console
  rather than relying on discovery, since nothing links to it.
- No `og:image`/`twitter:image` yet -- there's no real screenshot asset,
  and a missing one silently returns the HTML page instead of a 404
  (`not_found_handling: "single-page-application"`, see above), which
  would be worse than no image tag at all for link previews. Add a real
  1200x630 image at `/step-pyramid-og.png` and reinstate the tags in
  `index.html` once it exists.
