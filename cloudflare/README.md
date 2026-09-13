# Deploying under oliverbarwell.com/step-pyramid/

This repo stays separate from your main site's repo. It deploys as its own
Cloudflare Pages project, and a small Worker mounts it at `/step-pyramid/`
on your main domain. Everything here is free tier: Pages (unlimited static
requests) + Workers (100,000 requests/day).

## 1. Deploy this repo as a Pages project

Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
→ pick this repo.

- Build command: *(leave blank — it's plain static HTML)*
- Build output directory: `/`
- Project name: `step-pyramid` *(if you pick something else, update
  `UPSTREAM` in `worker.js` to match its `*.pages.dev` hostname)*

Deploy. You'll get `https://step-pyramid.pages.dev` — check it loads before
continuing.

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

Push to this repo's `main` branch → Pages auto-deploys → live immediately,
no Worker redeploy needed (the Worker just proxies, it has no cached copy
of the page).
