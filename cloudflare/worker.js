/**
 * Serves this repo's Cloudflare deployment under a subpath of the main
 * site, e.g. https://oliverbarwell.com/step-pyramid -- there's no
 * built-in way to stitch a second, separately-deployed project under an
 * existing domain's path, so a small Worker relays requests to that
 * deployment as if it lived at that path natively.
 *
 * Canonical URL has no trailing slash (/step-pyramid, not /step-pyramid/).
 * The wildcard Route below still routes the slash form here too, so this
 * Worker can 301 it into the canonical one -- otherwise both URLs would
 * serve identical content, which is a duplicate-content smell.
 *
 * Uses a Service Binding (env.SITE, bound in wrangler.toml) rather than a
 * plain fetch() to the *.workers.dev hostname. Cloudflare blocks Worker ->
 * Worker fetch() over *.workers.dev / routes on the same account -- it's a
 * documented loop/SSRF guard, not a config mistake -- so a raw fetch() to
 * the sibling Worker's own URL 404s. A service binding invokes the target
 * Worker directly, in-process, and isn't subject to that restriction.
 *
 * Setup (see cloudflare/README.md for the full walkthrough):
 *   1. Deploy this repo as its own Cloudflare project. Note its Worker/
 *      Pages project name and put it in wrangler.toml's [[services]] block.
 *   2. Publish this file as a Worker with
 *      `npx wrangler deploy --config cloudflare/wrangler.toml` (the
 *      --config matters, see cloudflare/README.md; the service binding
 *      needs wrangler.toml, so a dashboard paste alone won't configure it).
 *   3. Add one Route on the oliverbarwell.com zone pointing at that
 *      Worker: `oliverbarwell.com/step-pyramid*` (no slash before the *
 *      -- an exact, non-wildcard route doesn't reliably match once a
 *      query string is appended; see cloudflare/README.md step 3).
 *
 * Requires the zone to be proxied (orange-cloud) in Cloudflare DNS --
 * Worker Routes only intercept proxied traffic.
 */

const MOUNT_PATH = '/step-pyramid';

// Everything the step-pyramid deployment actually serves, as paths below the
// mount. Anything else gets a real 404 here: the deployment's SPA fallback
// (needed for query strings, see wrangler.jsonc) would otherwise answer every
// unknown path, even /step-pyramid/wp-login.php, with the solver page and a
// 200, which search engines read as soft 404s. Add new pages here.
const PAGES = new Set([
  '/',
  '/how-to-solve',
  '/robots.txt',
  '/sitemap.xml',
  '/og.png',
  '/og-guide.png',
]);

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page not found</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #0a0e1a; color: #94a3b8; display: grid; place-items: center;
           min-height: 100vh; margin: 0; padding: 1rem; text-align: center; line-height: 1.6; }
    h1 { color: #f8fafc; font-size: 1.6rem; margin: 0 0 0.5rem; }
    a { color: #c4b5fd; }
  </style>
</head>
<body>
  <main>
    <h1>Page not found</h1>
    <p>Try the <a href="${MOUNT_PATH}?n=3">Pyraminx solver</a> or the
      <a href="${MOUNT_PATH}/how-to-solve">beginner's guide</a>.</p>
  </main>
</body>
</html>`;

const notFound = () =>
  new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

const redirect = (url, path) => {
  url.pathname = path;
  return Response.redirect(url.toString(), 301);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The route pattern (oliverbarwell.com/step-pyramid*) also matches
    // look-alikes such as /step-pyramids or /step-pyramid-og.png. Those
    // aren't under the mount, so there's nothing to serve.
    if (url.pathname !== MOUNT_PATH && !url.pathname.startsWith(MOUNT_PATH + '/')) {
      return notFound();
    }

    // Canonicalize away trailing slashes, keeping the query string (e.g.
    // ?n=3): /step-pyramid/ -> /step-pyramid, and the same for deeper pages.
    if (url.pathname.endsWith('/')) {
      return redirect(url, url.pathname.replace(/\/+$/, ''));
    }

    // Strip the mount prefix; whatever's left (plus the original query
    // string) is what the target Worker serves.
    let upstreamPath = url.pathname.slice(MOUNT_PATH.length) || '/';

    // .html spellings of a page redirect to its canonical URL. Left to the
    // target Worker, its asset handling would redirect to the unprefixed
    // path (/how-to-solve), which isn't this site.
    if (upstreamPath.endsWith('.html')) {
      const page = upstreamPath === '/index.html' ? '/' : upstreamPath.slice(0, -'.html'.length);
      if (PAGES.has(page)) return redirect(url, page === '/' ? MOUNT_PATH : MOUNT_PATH + page);
    }

    if (!PAGES.has(upstreamPath)) return notFound();

    const upstreamUrl = new URL(upstreamPath, url.origin);
    upstreamUrl.search = url.search;

    const upstreamRequest = new Request(upstreamUrl, request);
    const response = await env.SITE.fetch(upstreamRequest);

    // Relay the response as-is (status, headers, body all pass through
    // untouched) so it reads as a normal same-origin page.
    return new Response(response.body, response);
  }
};
