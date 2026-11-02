// Checks cloudflare/worker.js routing: which paths are forwarded to the
// step-pyramid deployment, which redirect, and which get a real 404.
//
// Run: node tools/check_worker.mjs
// Add a case here whenever you add a page to PAGES in worker.js.

import worker from '../cloudflare/worker.js';
const seen = [];
const env = { SITE: { fetch: async (req) => { seen.push(new URL(req.url).pathname + new URL(req.url).search); return new Response('upstream ' + new URL(req.url).pathname, { status: 200, headers: { 'x-up': '1' } }); } } };
const cases = [
  ['/step-pyramid', 200, null, '/'],
  ['/step-pyramid?n=3', 200, null, '/?n=3'],
  ['/step-pyramid/', 301, 'https://oliverbarwell.com/step-pyramid'],
  ['/step-pyramid/?n=3', 301, 'https://oliverbarwell.com/step-pyramid?n=3'],
  ['/step-pyramid/how-to-solve', 200, null, '/how-to-solve'],
  ['/step-pyramid/how-to-solve/', 301, 'https://oliverbarwell.com/step-pyramid/how-to-solve'],
  ['/step-pyramid/how-to-solve.html', 301, 'https://oliverbarwell.com/step-pyramid/how-to-solve'],
  ['/step-pyramid/index.html?n=3', 301, 'https://oliverbarwell.com/step-pyramid?n=3'],
  ['/step-pyramid/og.png', 200, null, '/og.png'],
  ['/step-pyramid/og-guide.png', 200, null, '/og-guide.png'],
  ['/step-pyramid/robots.txt', 200, null, '/robots.txt'],
  ['/step-pyramid/sitemap.xml', 200, null, '/sitemap.xml'],
  ['/step-pyramid/nonexistent-page', 404],
  ['/step-pyramid/wp-login.php', 404],
  ['/step-pyramid/.git/config', 404],
  ['/step-pyramid/tools/check_guide.py', 404],
  ['/step-pyramid/nope.html', 404],
  ['/step-pyramids', 404],
  ['/step-pyramid-og.png', 404],
];
let bad = 0;
for (const [path, status, loc, up] of cases) {
  seen.length = 0;
  const res = await worker.fetch(new Request('https://oliverbarwell.com' + path), env);
  const l = res.headers.get('location');
  const ok = res.status === status && (loc == null || l === loc) && (up == null || seen[0] === up) && (status !== 404 || seen.length === 0);
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', path.padEnd(38), res.status, l || '', seen[0] || '');
}
const r = await worker.fetch(new Request('https://oliverbarwell.com/step-pyramid/zzz'), env);
console.log('404 content-type:', r.headers.get('content-type'), (await r.text()).includes('Page not found'));
process.exit(bad ? 1 : 0);
