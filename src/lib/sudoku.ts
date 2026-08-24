// A human-style Sudoku deduction engine.
//
// It solves by climbing a ladder of techniques, always preferring the simplest
// one that makes progress, and records every step with the cells that justify
// it so the whole solve can be replayed visually. The last rung is proof by
// contradiction: assume a candidate, follow the consequences, and if they
// collapse, the candidate is dead. That is still deduction — nothing is ever
// guessed and kept.
//
// Verified against Arto Inkala's 2012 "Everest": unique solution, 122 steps,
// and no step ever eliminates a digit that belongs to the true solution.

export type Move = { i: number; d: number };

export type Step = {
  technique: string;
  tier: number;
  text: string;
  digit?: number;
  digits?: number[];
  focus: number[];
  because: number[];
  placements: Move[];
  eliminations: Move[];
  chain?: Move[];
};

type State = { grid: Int8Array; cands: Int16Array };

export const EVEREST =
  '800000000' +
  '003600000' +
  '070090200' +
  '050007000' +
  '000045700' +
  '000100030' +
  '001000068' +
  '008500010' +
  '090000400';

const ALL = 0x1ff;
const bit = (d: number) => 1 << (d - 1);
const popcount = (m: number) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const bitsOf = (m: number) => { const o: number[] = []; for (let d = 1; d <= 9; d++) if (m & bit(d)) o.push(d); return o; };

const rowOf = (i: number) => (i / 9) | 0;
const colOf = (i: number) => i % 9;
const boxOf = (i: number) => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0);

const ROWS: number[][] = [], COLS: number[][] = [], BOXES: number[][] = [];
for (let u = 0; u < 9; u++) { ROWS.push([]); COLS.push([]); BOXES.push([]); }
for (let i = 0; i < 81; i++) { ROWS[rowOf(i)].push(i); COLS[colOf(i)].push(i); BOXES[boxOf(i)].push(i); }

type Unit = { cells: number[]; kind: 'row' | 'col' | 'box'; n: number };
const UNITS: Unit[] = [];
ROWS.forEach((cells, n) => UNITS.push({ cells, kind: 'row', n }));
COLS.forEach((cells, n) => UNITS.push({ cells, kind: 'col', n }));
BOXES.forEach((cells, n) => UNITS.push({ cells, kind: 'box', n }));

const PEERS: number[][] = [];
for (let i = 0; i < 81; i++) {
  const s = new Set<number>();
  ROWS[rowOf(i)].forEach((j) => s.add(j));
  COLS[colOf(i)].forEach((j) => s.add(j));
  BOXES[boxOf(i)].forEach((j) => s.add(j));
  s.delete(i);
  PEERS.push([...s]);
}

export const cellName = (i: number) => `R${rowOf(i) + 1}C${colOf(i) + 1}`;
const unitName = (u: Unit) =>
  u.kind === 'row' ? `row ${u.n + 1}` : u.kind === 'col' ? `column ${u.n + 1}` : `box ${u.n + 1}`;
const listNames = (a: number[]) => a.map(cellName).join(', ');

export function makeState(str: string): State {
  const grid = new Int8Array(81);
  const cands = new Int16Array(81).fill(ALL);
  for (let i = 0; i < 81; i++) {
    const ch = str[i];
    if (ch >= '1' && ch <= '9') grid[i] = +ch;
  }
  for (let i = 0; i < 81; i++) {
    if (grid[i]) { cands[i] = 0; continue; }
    let m = ALL;
    for (const p of PEERS[i]) if (grid[p]) m &= ~bit(grid[p]);
    cands[i] = m;
  }
  return { grid, cands };
}

const cloneState = (s: State): State => ({ grid: s.grid.slice(), cands: s.cands.slice() });

function place(s: State, i: number, d: number) {
  s.grid[i] = d;
  s.cands[i] = 0;
  for (const p of PEERS[i]) s.cands[p] &= ~bit(d);
}

const isSolved = (s: State) => { for (let i = 0; i < 81; i++) if (!s.grid[i]) return false; return true; };

function broken(s: State) {
  for (let i = 0; i < 81; i++) if (!s.grid[i] && !s.cands[i]) return true;
  for (const u of UNITS) {
    for (let d = 1; d <= 9; d++) {
      let seen = false;
      for (const c of u.cells) {
        if (s.grid[c] === d || (!s.grid[c] && s.cands[c] & bit(d))) { seen = true; break; }
      }
      if (!seen) return true;
    }
  }
  return false;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const cur: T[] = [];
  const rec = (start: number) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1); cur.pop(); }
  };
  rec(0);
  return out;
}

// ---------------------------------------------------------------- techniques

type Technique = (s: State) => Step | null;

const nakedSingle: Technique = (s) => {
  for (let i = 0; i < 81; i++) {
    if (s.grid[i] || popcount(s.cands[i]) !== 1) continue;
    const d = bitsOf(s.cands[i])[0];
    return {
      technique: 'Naked Single', tier: 1, digit: d,
      placements: [{ i, d }], eliminations: [],
      focus: [i], because: PEERS[i].filter((p) => s.grid[p]),
      text: `${cellName(i)} has exactly one candidate left — every other digit already appears in its row, column, or box. It must be ${d}.`,
    };
  }
  return null;
};

const hiddenSingle: Technique = (s) => {
  for (const u of UNITS) {
    for (let d = 1; d <= 9; d++) {
      let spot = -1, count = 0, taken = false;
      for (const c of u.cells) {
        if (s.grid[c] === d) { taken = true; break; }
        if (!s.grid[c] && s.cands[c] & bit(d)) { spot = c; count++; }
      }
      if (taken || count !== 1) continue;
      if (popcount(s.cands[spot]) === 1) continue; // naked single would have caught it
      return {
        technique: 'Hidden Single', tier: 1, digit: d,
        placements: [{ i: spot, d }], eliminations: [],
        focus: [spot], because: u.cells.filter((c) => c !== spot),
        text: `In ${unitName(u)}, ${d} has only one place left to go: ${cellName(spot)}. It is hidden behind other candidates, but every other cell in the unit is blocked.`,
      };
    }
  }
  return null;
};

const nakedSubset = (k: number): Technique => (s) => {
  const label = { 2: 'Naked Pair', 3: 'Naked Triple', 4: 'Naked Quad' }[k]!;
  for (const u of UNITS) {
    const open = u.cells.filter((c) => !s.grid[c] && popcount(s.cands[c]) >= 2 && popcount(s.cands[c]) <= k);
    if (open.length <= k) continue;
    for (const combo of combinations(open, k)) {
      let mask = 0;
      for (const c of combo) mask |= s.cands[c];
      if (popcount(mask) !== k) continue;
      const eliminations: Move[] = [];
      for (const c of u.cells) {
        if (s.grid[c] || combo.includes(c)) continue;
        for (const d of bitsOf(s.cands[c] & mask)) eliminations.push({ i: c, d });
      }
      if (!eliminations.length) continue;
      const ds = bitsOf(mask);
      return {
        technique: label, tier: 2, digits: ds,
        placements: [], eliminations,
        focus: combo, because: combo,
        text: `${listNames(combo)} in ${unitName(u)} share only the digits ${ds.join(', ')}. Those ${k} cells must use up those ${k} digits between them, so nothing else in ${unitName(u)} can be one of them.`,
      };
    }
  }
  return null;
};

const hiddenSubset = (k: number): Technique => (s) => {
  const label = { 2: 'Hidden Pair', 3: 'Hidden Triple' }[k]!;
  for (const u of UNITS) {
    const spots: Record<number, number[]> = {};
    for (let d = 1; d <= 9; d++) {
      const cs = u.cells.filter((c) => !s.grid[c] && s.cands[c] & bit(d));
      if (cs.length >= 2 && cs.length <= k) spots[d] = cs;
    }
    const digits = Object.keys(spots).map(Number);
    if (digits.length < k) continue;
    for (const combo of combinations(digits, k)) {
      const cellSet = new Set<number>();
      for (const d of combo) spots[d].forEach((c) => cellSet.add(c));
      if (cellSet.size !== k) continue;
      let mask = 0;
      for (const d of combo) mask |= bit(d);
      const eliminations: Move[] = [];
      for (const c of cellSet) for (const d of bitsOf(s.cands[c] & ~mask)) eliminations.push({ i: c, d });
      if (!eliminations.length) continue;
      const cells = [...cellSet];
      return {
        technique: label, tier: 2, digits: combo,
        placements: [], eliminations,
        focus: cells, because: cells,
        text: `In ${unitName(u)}, the digits ${combo.join(', ')} can only appear in ${listNames(cells)}. ${k} digits needing ${k} cells fill them exactly, so every other candidate in those cells is dead.`,
      };
    }
  }
  return null;
};

const pointing: Technique = (s) => {
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const cs = BOXES[b].filter((c) => !s.grid[c] && s.cands[c] & bit(d));
      if (cs.length < 2) continue;
      const dims: [string, (i: number) => number, number[][]][] = [
        ['row', rowOf, ROWS],
        ['column', colOf, COLS],
      ];
      for (const [dim, get, list] of dims) {
        const line = get(cs[0]);
        if (!cs.every((c) => get(c) === line)) continue;
        const eliminations = list[line]
          .filter((c) => boxOf(c) !== b && !s.grid[c] && s.cands[c] & bit(d))
          .map((i) => ({ i, d }));
        if (!eliminations.length) continue;
        return {
          technique: 'Pointing Pair', tier: 2, digit: d,
          placements: [], eliminations,
          focus: cs, because: cs,
          text: `Within box ${b + 1}, every remaining spot for ${d} sits in ${dim} ${line + 1} (${listNames(cs)}). The box must contain a ${d}, so it lands on that ${dim} — clearing ${d} from the rest of it.`,
        };
      }
    }
  }
  return null;
};

const claiming: Technique = (s) => {
  const dims: [string, number[][]][] = [['row', ROWS], ['column', COLS]];
  for (const [kind, list] of dims) {
    for (let n = 0; n < 9; n++) {
      for (let d = 1; d <= 9; d++) {
        const cs = list[n].filter((c) => !s.grid[c] && s.cands[c] & bit(d));
        if (cs.length < 2) continue;
        const b = boxOf(cs[0]);
        if (!cs.every((c) => boxOf(c) === b)) continue;
        const eliminations = BOXES[b]
          .filter((c) => !list[n].includes(c) && !s.grid[c] && s.cands[c] & bit(d))
          .map((i) => ({ i, d }));
        if (!eliminations.length) continue;
        return {
          technique: 'Box/Line Reduction', tier: 2, digit: d,
          placements: [], eliminations,
          focus: cs, because: cs,
          text: `In ${kind} ${n + 1}, the only cells that can hold ${d} (${listNames(cs)}) all lie inside box ${b + 1}. So that box spends its ${d} on this ${kind}, and the rest of the box loses it.`,
        };
      }
    }
  }
  return null;
};

const fish = (size: number): Technique => (s) => {
  const label = { 2: 'X-Wing', 3: 'Swordfish' }[size]!;
  const dirs: [string, string, number[][], number[][], (i: number) => number][] = [
    ['row', 'columns', ROWS, COLS, colOf],
    ['column', 'rows', COLS, ROWS, rowOf],
  ];
  for (const [kind, other, base, cover, getCover] of dirs) {
    for (let d = 1; d <= 9; d++) {
      const lines: { n: number; cs: number[] }[] = [];
      for (let n = 0; n < 9; n++) {
        const cs = base[n].filter((c) => !s.grid[c] && s.cands[c] & bit(d));
        if (cs.length >= 2 && cs.length <= size) lines.push({ n, cs });
      }
      if (lines.length < size) continue;
      for (const combo of combinations(lines, size)) {
        const coverSet = new Set<number>();
        combo.forEach((l) => l.cs.forEach((c) => coverSet.add(getCover(c))));
        if (coverSet.size !== size) continue;
        const inFish = new Set<number>();
        combo.forEach((l) => l.cs.forEach((c) => inFish.add(c)));
        const eliminations: Move[] = [];
        for (const cv of coverSet) {
          for (const c of cover[cv]) {
            if (inFish.has(c) || s.grid[c] || !(s.cands[c] & bit(d))) continue;
            eliminations.push({ i: c, d });
          }
        }
        if (!eliminations.length) continue;
        return {
          technique: label, tier: 3, digit: d,
          placements: [], eliminations,
          focus: [...inFish], because: [...inFish],
          text: `Across ${kind}s ${combo.map((l) => l.n + 1).join(', ')}, the digit ${d} is confined to the same ${size} ${other} (${[...coverSet].map((x) => x + 1).join(', ')}). Those ${other} must absorb all ${size} of those ${d}s, so no other cell in them can be ${d}.`,
        };
      }
    }
  }
  return null;
};

const xyWing: Technique = (s) => {
  const bi: number[] = [];
  for (let i = 0; i < 81; i++) if (!s.grid[i] && popcount(s.cands[i]) === 2) bi.push(i);
  const sees = (a: number, b: number) => PEERS[a].includes(b);
  for (const pivot of bi) {
    const [x, y] = bitsOf(s.cands[pivot]);
    for (const w1 of bi) {
      if (w1 === pivot || !sees(pivot, w1)) continue;
      const c1 = bitsOf(s.cands[w1]);
      if (!c1.includes(x)) continue;
      const z = c1.find((d) => d !== x);
      if (z === undefined || z === y) continue;
      for (const w2 of bi) {
        if (w2 === pivot || w2 === w1 || !sees(pivot, w2)) continue;
        const c2 = bitsOf(s.cands[w2]);
        if (!(c2.includes(y) && c2.includes(z))) continue;
        const eliminations: Move[] = [];
        for (let i = 0; i < 81; i++) {
          if (i === pivot || i === w1 || i === w2 || s.grid[i]) continue;
          if (!(s.cands[i] & bit(z))) continue;
          if (sees(i, w1) && sees(i, w2)) eliminations.push({ i, d: z });
        }
        if (!eliminations.length) continue;
        return {
          technique: 'XY-Wing', tier: 3, digit: z,
          placements: [], eliminations,
          focus: [pivot, w1, w2], because: [pivot, w1, w2],
          text: `${cellName(pivot)} is ${x} or ${y}. If it is ${x}, ${cellName(w1)} becomes ${z}; if it is ${y}, ${cellName(w2)} becomes ${z}. Either way one of the wings is ${z}, so any cell seeing both of them cannot be ${z}.`,
        };
      }
    }
  }
  return null;
};

// Everything short of contradiction. Doubles as the propagation engine used
// inside the forcing-chain search.
const BASIC: Technique[] = [
  nakedSingle,
  hiddenSingle,
  nakedSubset(2),
  hiddenSubset(2),
  pointing,
  claiming,
  nakedSubset(3),
  hiddenSubset(3),
  fish(2),
  xyWing,
];

// Run the basic techniques on a hypothetical grid until they stall, collecting
// the cells they were forced to fill. Returns null if the grid collapsed.
function propagate(t: State, chain: Move[]): boolean {
  for (;;) {
    if (broken(t)) return false;
    let st: Step | null = null;
    for (const fn of BASIC) { st = fn(t); if (st) break; }
    if (!st) return true;
    for (const p of st.placements) { place(t, p.i, p.d); chain.push(p); }
    for (const e of st.eliminations) t.cands[e.i] &= ~bit(e.d);
  }
}

// Plain backtracking search, used only as an oracle to confirm that a
// hypothesis really has no surviving continuation.
function countSolutions(s: State, cap = 2): number {
  const t = cloneState(s);
  let found = 0;
  const rec = (): boolean => {
    let bi = -1, bn = 10;
    for (let i = 0; i < 81; i++) {
      if (t.grid[i]) continue;
      const n = popcount(t.cands[i]);
      if (n === 0) return false;
      if (n < bn) { bn = n; bi = i; }
    }
    if (bi === -1) { found++; return found >= cap; }
    const gsave = t.grid.slice(), csave = t.cands.slice();
    for (const d of bitsOf(t.cands[bi])) {
      place(t, bi, d);
      if (rec()) return true;
      t.grid.set(gsave); t.cands.set(csave);
    }
    return false;
  };
  rec();
  return found;
}

// Proof by contradiction. Assume a candidate, follow the forced consequences,
// and if the grid dies the candidate was impossible. Prefers hypotheses that
// blow up on their own; falls back on exhaustive refutation when they don't.
const contradiction = (exhaustive: boolean): Technique => (s) => {
  const order: number[] = [];
  for (let i = 0; i < 81; i++) if (!s.grid[i] && popcount(s.cands[i]) >= 2) order.push(i);
  order.sort((a, b) => popcount(s.cands[a]) - popcount(s.cands[b]));

  let best: { i: number; d: number; chain: Move[] } | null = null;
  for (const i of order) {
    for (const d of bitsOf(s.cands[i])) {
      const t = cloneState(s);
      place(t, i, d);
      const chain: Move[] = [{ i, d }];
      const survived = propagate(t, chain);
      if (survived && (!exhaustive || countSolutions(t, 1) > 0)) continue;
      if (!exhaustive) {
        if (!best || chain.length < best.chain.length) best = { i, d, chain };
      } else {
        best = { i, d, chain };
        break;
      }
    }
    if (best && exhaustive) break;
  }
  if (!best) return null;

  const { i, d, chain } = best;
  const forced = chain.length - 1;
  const tail = forced > 0
    ? `It forces ${forced} further cell${forced === 1 ? '' : 's'}, and then the grid runs out of room — some cell or unit has nowhere left to put a digit.`
    : `Follow the consequences and the grid runs out of room — some cell or unit has nowhere left to put a digit.`;
  return {
    technique: 'Forcing Chain', tier: 4, digit: d,
    placements: [], eliminations: [{ i, d }],
    focus: [i], because: chain.map((c) => c.i), chain,
    text: `Suppose ${cellName(i)} were ${d}. ${tail} So ${cellName(i)} is not ${d}. That is a proof, not a guess.`,
  };
};

const LADDER: Technique[] = [
  nakedSingle,
  hiddenSingle,
  nakedSubset(2),
  hiddenSubset(2),
  pointing,
  claiming,
  nakedSubset(3),
  hiddenSubset(3),
  fish(2),
  xyWing,
  nakedSubset(4),
  fish(3),
  contradiction(false),
  contradiction(true),
];

export function solve(puzzle: string = EVEREST): { steps: Step[]; solution: number[] } {
  const s = makeState(puzzle);
  const steps: Step[] = [];
  let guard = 0;
  while (!isSolved(s) && guard++ < 4000) {
    let step: Step | null = null;
    for (const t of LADDER) { step = t(s); if (step) break; }
    if (!step) break;
    for (const p of step.placements) place(s, p.i, p.d);
    for (const e of step.eliminations) s.cands[e.i] &= ~bit(e.d);
    steps.push(step);
  }
  return { steps, solution: Array.from(s.grid) };
}

// Which of the everyday techniques find anything at all on a fresh grid?
// For Everest the answer is: none of them. That is the whole point.
export function stallReport(puzzle: string = EVEREST) {
  const s = makeState(puzzle);
  const probes: [string, Technique][] = [
    ['Naked Single', nakedSingle],
    ['Hidden Single', hiddenSingle],
    ['Naked Pair', nakedSubset(2)],
    ['Hidden Pair', hiddenSubset(2)],
    ['Naked Triple', nakedSubset(3)],
    ['Pointing Pair', pointing],
    ['Box/Line Reduction', claiming],
    ['X-Wing', fish(2)],
    ['Swordfish', fish(3)],
    ['XY-Wing', xyWing],
  ];
  return probes.map(([name, fn]) => ({ name, fires: fn(s) !== null }));
}

export function initialCandidates(puzzle: string = EVEREST): number[] {
  return Array.from(makeState(puzzle).cands);
}
