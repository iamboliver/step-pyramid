// Checks the solver in index.html against random scrambles, for both sizes.
//
// Run: node tools/check_solver.mjs [scrambles per size, default 300]
//
// index.html is one page with the engine and the UI in a single inline
// script, so this runs that script in a Node VM with a do-nothing stand-in
// for the DOM, then calls the engine directly: scramble a solved puzzle,
// ask solvePyraminx for a solution, apply it, and check the result is solved.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length !== 1) throw new Error(`expected 1 inline app script, found ${scripts.length}`);

// Anything the UI code touches (elements, canvas contexts, audio) is this:
// callable, constructible, and every property is another one of these.
function absorber() {
  const target = function () {};
  return new Proxy(target, {
    get(_, key) {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === Symbol.iterator) return function* () {};
      if (key === 'then') return undefined;
      return absorber();
    },
    set: () => true,
    apply: () => absorber(),
    construct: () => absorber(),
  });
}

function loadEngine(n) {
  const context = vm.createContext({
    document: absorber(),
    window: absorber(),
    navigator: absorber(),
    localStorage: absorber(),
    AudioContext: absorber(),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    location: { search: `?n=${n}` },
    console,
    Math, Array, Object, String, Number, Set, Map, JSON, URLSearchParams,
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Int32Array, Float32Array,
  });
  const exportLine = `\n;globalThis.__engine = { N, PER_FACE, MOVE_PERMS, applyMove, solvePyraminx, isCubeSolved };`;
  vm.runInContext(scripts[0] + exportLine, context, { filename: 'index.html' });
  return context.__engine;
}

// Small seeded PRNG so failures are reproducible.
function rng(seed) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

const perSize = Number(process.argv[2]) || 300;
let failed = false;

for (const n of [3, 4]) {
  const e = loadEngine(n);
  const moves = Object.keys(e.MOVE_PERMS);
  const rand = rng(n * 7919);
  const solved = ['red', 'blue', 'green', 'yellow'].map(c => Array(e.PER_FACE).fill(c));
  let total = 0, longest = 0;

  for (let i = 0; i < perSize; i++) {
    let st = solved;
    const scramble = Array.from({ length: 40 }, () => moves[Math.floor(rand() * moves.length)]);
    for (const m of scramble) st = e.applyMove(st, m);

    const result = e.solvePyraminx(st);
    if (!result) {
      console.error(`n=${n}: no solution for scramble ${scramble.join(' ')}`);
      failed = true;
      continue;
    }
    for (const m of result.moves) st = e.applyMove(st, m);
    if (!e.isCubeSolved(st)) {
      console.error(`n=${n}: solution doesn't solve scramble ${scramble.join(' ')}`);
      failed = true;
      continue;
    }
    total += result.moves.length;
    longest = Math.max(longest, result.moves.length);
  }
  console.log(`n=${n}: ${perSize} scrambles, avg ${(total / perSize).toFixed(1)} moves, longest ${longest}`);
}

process.exit(failed ? 1 : 0);
