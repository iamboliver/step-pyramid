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
 *   2. Publish this file as a Worker via `wrangler deploy` from this
 *      folder (the service binding needs wrangler.toml, so dashboard
 *      paste alone won't configure it -- CLI or dashboard Bindings UI).
 *   3. Add one Route on the oliverbarwell.com zone pointing at that
 *      Worker: `oliverbarwell.com/step-pyramid*` (no slash before the *
 *      -- an exact, non-wildcard route doesn't reliably match once a
 *      query string is appended; see cloudflare/README.md step 3).
 *
 * Requires the zone to be proxied (orange-cloud) in Cloudflare DNS --
 * Worker Routes only intercept proxied traffic.
 */

const MOUNT_PATH = '/step-pyramid';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonicalize away the trailing slash: /step-pyramid/ -> /step-pyramid
    // (keeping the query string, e.g. ?n=3). Leaves deeper paths alone --
    // /step-pyramid/foo stays /step-pyramid/foo.
    if (url.pathname === MOUNT_PATH + '/') {
      url.pathname = MOUNT_PATH;
      return Response.redirect(url.toString(), 301);
    }

    // Strip the mount prefix; whatever's left (plus the original query
    // string) is forwarded to the target Worker's root.
    let upstreamPath = url.pathname.slice(MOUNT_PATH.length);
    if (upstreamPath === '') upstreamPath = '/';

    const upstreamUrl = new URL(upstreamPath, url.origin);
    upstreamUrl.search = url.search;

    const upstreamRequest = new Request(upstreamUrl, request);
    const response = await env.SITE.fetch(upstreamRequest);

    // Relay the response as-is (status, headers, body all pass through
    // untouched) so it reads as a normal same-origin page.
    return new Response(response.body, response);
  }
};
