/**
 * Serves this repo's Cloudflare deployment under a subpath of the main
 * site, e.g. https://www.oliverbarwell.com/step-pyramid/ -- there's no
 * built-in way to stitch a second, separately-deployed project under an
 * existing domain's path, so a small Worker fetches from that deployment
 * and relays the response as if it lived at that path natively.
 *
 * Setup (see cloudflare/README.md for the full walkthrough):
 *   1. Deploy this repo as its own Cloudflare project (Pages, or the
 *      newer Workers-with-static-assets -- either lands on a
 *      *.pages.dev or *.workers.dev hostname). Put that hostname in
 *      UPSTREAM below.
 *   2. Publish this file as a Worker (dashboard paste, or `wrangler deploy`
 *      from this folder).
 *   3. Add two Routes on the oliverbarwell.com zone pointing at that
 *      Worker: `oliverbarwell.com/step-pyramid` and
 *      `oliverbarwell.com/step-pyramid/*`.
 *
 * Requires the zone to be proxied (orange-cloud) in Cloudflare DNS --
 * Worker Routes only intercept proxied traffic.
 */

const UPSTREAM = 'https://step-pyramid.oliver-j-barwell.workers.dev';
const MOUNT_PATH = '/step-pyramid';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Strip the mount prefix; whatever's left (plus the original query
    // string, e.g. ?n=3) is forwarded to the Pages project's root.
    let upstreamPath = url.pathname.slice(MOUNT_PATH.length);
    if (upstreamPath === '') upstreamPath = '/';

    const upstreamUrl = new URL(upstreamPath, UPSTREAM);
    upstreamUrl.search = url.search;

    const upstreamRequest = new Request(upstreamUrl, request);
    const response = await fetch(upstreamRequest);

    // Relay the Pages response as-is (status, headers, body all pass
    // through untouched) so it reads as a normal same-origin page.
    return new Response(response.body, response);
  }
};
