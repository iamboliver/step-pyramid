# Deploying under oliverbarwell.com/step-pyramid

This repo stays separate from your main site's repo. It deploys as its own
Cloudflare project, and a small Worker mounts it at `/step-pyramid` (no
trailing slash — that's the canonical URL; `/step-pyramid/` 301s into it)
on your main domain. Everything here is free tier: static hosting
(unlimited requests) + Workers (100,000 requests/day).

## 1. Deploy this repo as its own site

Dashboard → **Workers & Pages** → **Create** → **Connect to Git** → pick
this repo.

- Build command: *(leave blank — it's plain static HTML)*
- Build output directory: `/`
- Project name: `step-pyramid` *(if you pick something else, update
  `service` in `wrangler.toml`'s `[[services]]` block to match)*

Cloudflare's dashboard currently offers two flows here — classic **Pages**
or the newer **Workers with static assets**. Either works fine; check it
loads at its own `*.pages.dev` / `*.workers.dev` URL before continuing.

## 2. Publish the mount Worker

**Must use the CLI**, not a dashboard code paste — the service binding
(step 2a below) lives in `wrangler.toml`, which the dashboard's inline
editor doesn't read.

```sh
cd cloudflare
npx wrangler deploy   # prompts a one-time `wrangler login`
```

### Why a service binding, not a plain fetch()

`worker.js` calls `env.SITE.fetch(...)` rather than `fetch("https://step-
pyramid...workers.dev/...")`. Cloudflare blocks a Worker calling `fetch()`
on another Worker's own `*.workers.dev` URL within the same account (a
documented loop/SSRF guard) — it silently 404s, which looks like a broken
deploy rather than a permissions issue. `wrangler.toml`'s `[[services]]`
block declares the binding; if you renamed the site project in step 1,
update `service` there to match.

## 3. Route it under your domain

Dashboard → your `oliverbarwell.com` zone → **Workers Routes** → add one
route pointing at `step-pyramid-mount`:

```
oliverbarwell.com/step-pyramid*
```

No slash before the `*`. This single pattern covers `/step-pyramid`,
`/step-pyramid/`, and `/step-pyramid/anything` -- including with a query
string, which an exact (non-wildcard) route pattern does not reliably
match: `oliverbarwell.com/step-pyramid` as a standalone Route matched fine
with no query string but 404'd (before even reaching the Worker) the
moment one was appended, e.g. `?n=3`. Confirmed by testing fresh,
never-cached URLs directly against the deployment through the Cloudflare
API -- not a caching artifact. Two separate routes (exact path + `/*`
wildcard) was the original setup here and hit exactly this gap; one
`step-pyramid*` pattern does not.

This only works if `oliverbarwell.com` is proxied (orange cloud) in DNS —
Worker Routes never see traffic for a grey-clouded (DNS-only) record. If
your main site is already served through Cloudflare, this is already true.

Trade-off: this pattern also matches an unrelated path like
`/step-pyramid-anything-else` (there's no way to say "this path or
anything under it" without also allowing that). Fine for a small personal
site where nothing else starts with that string.

## 4. Check it

- `https://www.oliverbarwell.com/step-pyramid` loads the solver
- `https://www.oliverbarwell.com/step-pyramid/` 301s to the URL above
- `https://www.oliverbarwell.com/step-pyramid?n=3` loads the 3-layer mode
  (confirms the query string survives the proxy)
- Your main site at `/` and everywhere else is completely untouched — the
  Worker only ever sees requests starting with `/step-pyramid`

## Updating later

Push to this repo's `main` branch → the site project auto-deploys → live
immediately. The mount Worker itself only needs redeploying if you change
`cloudflare/worker.js` or `wrangler.toml`.
