"""Checks the method in how-to-solve.html against random scrambles.

Run: python3 tools/check_guide.py

A geometric 3-layer Pyraminx simulator, plus the guide's method coded step
by step using only the move sequences the page teaches. If you change a
sequence or an instruction on the page, change it here too and re-run.

Orientation (WCA): front face toward you, one vertex up.
U = top, L = front-bottom-left, R = front-bottom-right, B = back.
U/L/R/B turn the two layers at that vertex 120 deg clockwise as seen looking
at that vertex from outside; u/l/r/b turn the tip only.
"""
import itertools, math, random

class Vec(tuple):
    def __new__(cls, *a): return tuple.__new__(cls, a)
    def __add__(s, o): return Vec(*(x+y for x,y in zip(s,o)))
    def __sub__(s, o): return Vec(*(x-y for x,y in zip(s,o)))
    def __mul__(s, k): return Vec(*(x*k for x in s))
    __rmul__ = __mul__
    def __truediv__(s, k): return Vec(*(x/k for x in s))
    def __matmul__(s, o): return sum(x*y for x,y in zip(s,o))
    def norm(s): return math.sqrt(s@s)
def mat_vec(M, v): return Vec(*(sum(M[r][c]*v[c] for c in range(3)) for r in range(3)))

# Vertices. Viewer is on +z (front). Front face = U, L, R. B is behind.
U = Vec(0.0, 1.0, 0.0)
B = Vec(0.0, -1/3, -math.sqrt(8)/3)
L = Vec(-math.sqrt(6)/3, -1/3, math.sqrt(2)/3)
R = Vec(math.sqrt(6)/3, -1/3, math.sqrt(2)/3)
V = {'U': U, 'L': L, 'R': R, 'B': B}
FACES = {'F': ('U', 'L', 'R'), 'Lf': ('U', 'B', 'L'), 'Rf': ('U', 'R', 'B'), 'D': ('L', 'B', 'R')}

def subtriangles(a, b, c, n=3):
    out = []
    P = lambda i, j: a + (b - a) * i / n + (c - a) * j / n
    for i in range(n):
        for j in range(n - i):
            out.append((P(i, j) + P(i + 1, j) + P(i, j + 1)) / 3)
            if i + j < n - 1:
                out.append((P(i + 1, j) + P(i, j + 1) + P(i + 1, j + 1)) / 3)
    return out

STICKERS = []  # (face, position)
for f, vs in FACES.items():
    for p in subtriangles(*(V[v] for v in vs)):
        STICKERS.append((f, p))
POS = [p for _, p in STICKERS]
N = len(STICKERS)

def rot(axis, ang):
    k = axis / axis.norm()
    c, s_ = math.cos(ang), math.sin(ang)
    x, y, z = k
    return [[c+x*x*(1-c), x*y*(1-c)-z*s_, x*z*(1-c)+y*s_],
            [y*x*(1-c)+z*s_, c+y*y*(1-c), y*z*(1-c)-x*s_],
            [z*x*(1-c)-y*s_, z*y*(1-c)+x*s_, c+z*z*(1-c)]]

def perm_for(vertex, depth):
    v = V[vertex]
    thresh = {1: 5/9, 2: 1/9}[depth]
    M = rot(v, -2 * math.pi / 3)  # clockwise viewed from outside
    perm = list(range(N))  # perm[dest] = src
    for i in range(N):
        if POS[i] @ v > thresh - 1e-9:
            q = mat_vec(M, POS[i])
            j = min(range(N), key=lambda t: (POS[t]-q).norm())
            assert (POS[j]-q).norm() < 1e-6
            perm[j] = i
    return perm

MOVES = {}
for name in 'ULRB':
    MOVES[name] = perm_for(name, 2)
    MOVES[name.lower()] = perm_for(name, 1)
def inv(p):
    q = [0] * N
    for d, s_ in enumerate(p):
        q[s_] = d
    return q
for k in list(MOVES):
    MOVES[k + "'"] = inv(MOVES[k])

def apply(state, alg):
    for m in alg.split():
        p = MOVES[m]
        state = [state[p[i]] for i in range(N)]
    return state

SOLVED = [f for f, _ in STICKERS]

# Piece classification by geometry.
def classify(i):
    p = POS[i]
    d = {k: p @ v for k, v in V.items()}
    near = [k for k in d if d[k] > 5/9]
    if near:
        return ('tip', near[0])
    near2 = [k for k in d if d[k] > 1/9]
    if len(near2) == 1:
        return ('corner', near2[0])
    return ('edge', ''.join(sorted(near2)))
CLASS = [classify(i) for i in range(N)]


# ---- The guide's method ----

idx = {}
for i, c in enumerate(CLASS): idx.setdefault(c, []).append(i)
face = lambda i: STICKERS[i][0]
def on(piece, f):  # sticker index of piece on face f
    r = [i for i in idx[piece] if face(i) == f]; return r[0] if r else None

# Whole-puzzle rotation about the U axis: which vertex sits where when face X is in front.
# Held frame names -> real vertex names. F in front is identity.
def vertex_perm(k):
    M = rot(V['U'], -2 * math.pi / 3 * k)
    out = {}
    for n, v in V.items():
        w = mat_vec(M, v)
        out[n] = min(V, key=lambda m: (V[m] - w).norm())
    return out
FRAMES = {}
for k in range(3):
    vp = vertex_perm(k)  # rotating puzzle by k: the vertex at position n came from inv
    inv_vp = {b: a for a, b in vp.items()}
    # the face that ends up in front after rotating puzzle by k
    front_real = [f for f, vs in FACES.items() if set(inv_vp[v] for v in FACES['F']) == set(vs)][0]
    FRAMES[front_real] = inv_vp  # held name -> real vertex
def held(alg, front):
    m = FRAMES[front]
    out = []
    for t in alg.split():
        v = m[t[0].upper()]
        out.append((v.lower() if t[0].islower() else v) + t[1:])
    return ' '.join(out)

INSERT_LEFT, INSERT_RIGHT = "R U' R'", "L' U L"
CYCLE = "R U R' U R U R'"
FLIP = "R' L R L' U L' U' L"
stats = {'cycle': [0, 0, 0], 'flip': 0, 'pops': 0}

def solve(st):
    moves = []
    def do(a):
        nonlocal st
        st = apply(st, a); moves.append(a)
    # 1. tips: twist until the tip matches its corner on every face
    for v in 'ULRB':
        for _ in range(3):
            tip, cor = ('tip', v), ('corner', v)
            if all(st[on(tip, f)] == st[on(cor, f)] for f in FACES if v in FACES[f]): break
            do(v.lower())
        else: raise Exception('tip')
    # 2. corners: bottom colour = the colour missing from the top corner
    top_cols = {st[i] for i in idx[('corner', 'U')]}
    bottom = ({'F', 'Lf', 'Rf', 'D'} - top_cols).pop()
    for v in 'LRB':
        for _ in range(3):
            if st[on(('corner', v), 'D')] == bottom: break
            do(v)
        else: raise Exception('corner')
    front_col = st[on(('corner', 'L'), 'F')]
    for _ in range(3):
        if st[on(('corner', 'U'), 'F')] == front_col: break
        do('U')
    assert all(len({st[on(('corner', v), f)] for v in FACES[f]}) == 1 for f in FACES), 'centres'
    col = {f: st[on(('corner', FACES[f][1]), f)] for f in FACES}  # face -> its colour
    colface = {c: f for f, c in col.items()}
    # 3. first-layer edges
    bottom_edges = [e for e in idx if e[0] == 'edge' and 'U' not in e[1]]
    top_edges = [e for e in idx if e[0] == 'edge' and 'U' in e[1]]
    for _ in range(20):
        if all(st[i] == col[face(i)] for e in bottom_edges for i in idx[e]): break
        cand = [e for e in top_edges if col['D'] in {st[i] for i in idx[e]}]
        if cand:
            e = cand[0]
            X = [st[i] for i in idx[e] if st[i] != col['D']][0]
            front = colface[X]
            pcols = {col['D'], X}
            # turn U until the X sticker of this edge sits on the front face
            for _ in range(3):
                spot = [e2 for e2 in top_edges if {st[i] for i in idx[e2]} == pcols][0]
                where = [face(i) for i in idx[spot] if st[i] == X][0]
                if where == front: break
                do('U')
            other = [face(i) for i in idx[spot] if st[i] != X][0]
            # held frame: is the other sticker on the left side face or the right side face?
            left_face = [f for f in FACES if f not in ('D', front) and set(FACES[f]) >= {'U', FRAMES[front]['L']}][0]
            do(held(INSERT_LEFT if other == left_face else INSERT_RIGHT, front))
        else:
            # an edge is stuck in the bottom layer: hold that slot in front and pop it out
            bad = [e for e in bottom_edges if any(st[i] != col[face(i)] for i in idx[e])][0]
            front = [f for f in FACES if f != 'D' and on(bad, f) is not None][0]
            do(held(INSERT_LEFT, front)); stats['pops'] += 1
    else: raise Exception('first layer')
    # 4. last layer: re-align the top, cycle edges into place, then flip
    for _ in range(3):
        if st[on(('corner', 'U'), 'F')] == col['F']: break
        do('U')
    in_place = lambda: all({st[i] for i in idx[e]} == {col[face(i)] for i in idx[e]} for e in top_edges)
    n = 0
    while not in_place():
        do(CYCLE); n += 1
        assert n <= 2, 'cycle'
    stats['cycle'][n] += 1
    flipped = [e for e in top_edges if any(st[i] != col[face(i)] for i in idx[e])]
    assert len(flipped) in (0, 2), flipped
    if flipped:
        good = [e for e in top_edges if e not in flipped][0]
        # hold the puzzle so the good edge is at the back: front face is the one the good edge isn't on
        front = [f for f in ('F', 'Lf', 'Rf') if on(good, f) is None][0]
        do(held(FLIP, front)); stats['flip'] += 1
    assert st == SOLVED, 'not solved'
    return moves

if __name__ == '__main__':
    random.seed(1)
    ALL = list(MOVES)
    for t in range(2000):
        solve(apply(SOLVED, ' '.join(random.choice(ALL) for _ in range(30))))
    print('2000/2000 solved', stats)
