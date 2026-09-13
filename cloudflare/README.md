# Deploying under oliverbarwell.com/step-pyramid/

This repo stays separate from your main site's repo. It deploys as its own
Cloudflare project, and a small Worker mounts it at `/step-pyramid/` on
your main domain. Everything here is free tier: static hosting (unlimited
requests) + Workers (100,000 requests/day).

## 1. Deploy this repo as its own site

Dashboard → **Workers & Pages** → **Create** → **Connect to Git** → pick
this repo.

- Build command: *(leave blank — it's plain static HTML)*
- Build output directory: `/`
- Project name: `step-pyramid` *(if you pick something else, or Cloudflare
  assigns a different hostname than expected, update `UPSTREAM` in
  `worker.js` to match)*

Cloudflare's dashboard currently offers two flows here — classic **Pages**
(→ `*.pages.dev`) or the newer **Workers with static assets** (→
`*.workers.dev`, under your account's workers.dev subdomain, e.g.
`step-pyramid.<your-subdomain>.workers.dev`). Either works fine for this;
just note the real hostname it lands on and make sure `UPSTREAM` in
`worker.js` matches exactly — check it loads before continuing.

## 2. Publish the Worker

Either:

- **Dashboard**: Workers & Pages → Create → Worker → paste in `worker.js` →
  Deploy.
- **CLI**: `cd cloudflare && npx wrangler deploy` (prompts a one-time
  `wrangler login`).

## 3. Route it under your domain

Dashboard → your `oliverbarwell.com` zone → **Workers Routes** → add two
routes, both pointing at the Worker from step 2:

| Route | Worker |
|---|---|
| `oliverbarwell.com/step-pyramid` | step-pyramid-mount |
| `oliverbarwell.com/step-pyramid/*` | step-pyramid-mount |

(Two entries because Cloudflare route globs don't cover "the path itself or
anything under it" in one pattern.)

This only works if `oliverbarwell.com` is proxied (orange cloud) in DNS —
Worker Routes never see traffic for a grey-clouded (DNS-only) record. If
your main site is already served through Cloudflare, this is already true.

## 4. Check it

- `https://www.oliverbarwell.com/step-pyramid/` loads the solver
- `https://www.oliverbarwell.com/step-pyramid/?n=3` loads the 3-layer mode
  (confirms the query string survives the proxy)
- Your main site at `/` and everywhere else is completely untouched — the
  Worker only ever sees requests starting with `/step-pyramid`

## Updating later

Push to this repo's `main` branch → auto-deploys → live immediately, no
Worker redeploy needed (the Worker just proxies, it has no cached copy of
the page).
