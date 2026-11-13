import { findPhistomefelRing } from './phistomefel-ring';
import { bit, cloneGrid, digitsOf, gridFromValues, isBroken, isSolved, PEERS, popcount, setValue, type Grid } from './vendor/sudokui/board';
import type { Step } from './techniques';
import { findFullHouse, findHiddenSingle, findNakedSingle } from './vendor/sudokui/techniques/singles';
import { findLockedCandidates1, findLockedCandidates2 } from './vendor/sudokui/techniques/intersections';
import { findHiddenSubset, findNakedSubset } from './vendor/sudokui/techniques/subsets';
import { findBasicFish } from './vendor/sudokui/techniques/fish';
import { findWWing, findXYWing, findXYZWing } from './vendor/sudokui/techniques/wings';
import { findEmptyRectangle, findTurbotFamily } from './vendor/sudokui/techniques/singleDigit';
import { validatePuzzle, type Puzzle } from './puzzle';

// Explicitly opt in only to deductions independent of uniqueness assumptions.
const finders: ((g: Grid) => Step | null)[] = [
  findFullHouse, findNakedSingle, findHiddenSingle,
  findLockedCandidates1, findLockedCandidates2,
  ...[2, 3, 4].flatMap(n => [(g: Grid) => findNakedSubset(g, n, false), (g: Grid) => findHiddenSubset(g, n)]),
  ...[2, 3, 4].map(n => (g: Grid) => findBasicFish(g, n)),
  findXYWing, findXYZWing, findWWing,
  (g: Grid) => findTurbotFamily(g, 'SKYSCRAPER'), (g: Grid) => findTurbotFamily(g, 'TWO_STRING_KITE'), findEmptyRectangle,
  findPhistomefelRing,
];
export function nextLogicalStep(g: Grid): Step | null {
  for (const finder of finders) { const step = finder(g); if (step) return step; }
  return null;
}
export function applyLogicalStep(g: Grid, step: Step): void {
  for (const { cell, digit } of step.eliminations) g.cands[cell] &= ~bit(digit);
  for (const { cell, digit } of step.placements) setValue(g, cell, digit);
}
const domain = (g: Grid, c: number) => g.values[c] ? bit(g.values[c]) : g.cands[c];
export function conflicts(p: Puzzle): Set<number> {
  const bad = new Set<number>();
  p.values.forEach((v, c) => { if (v) for (const other of PEERS[c]) if (p.values[other] === v) { bad.add(c); bad.add(other); } });
  for (const line of p.lines) for (let i = 0; i < line.length / 2; i++) {
    const a = line[i], b = line[line.length - 1 - i];
    if (a !== b && (PEERS[a].includes(b) || (p.values[a] && p.values[b] && p.values[a] !== p.values[b]))) { bad.add(a); bad.add(b); }
  }
  return bad;
}
export function propagate(g: Grid, lines: number[][]): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (const line of lines) for (let i = 0; i < Math.floor(line.length / 2); i++) {
      const a = line[i], b = line[line.length - 1 - i];
      if (PEERS[a].includes(b)) return false;
      const shared = domain(g, a) & domain(g, b);
      if (!shared) return false;
      for (const c of [a, b]) if (!g.values[c] && g.cands[c] !== shared) { g.cands[c] = shared; changed = true; }
    }
  }
  return !isBroken(g);
}
export function candidates(p: Puzzle): { grid: Grid; valid: boolean } {
  const grid = gridFromValues(p.values);
  return { grid, valid: conflicts(p).size === 0 && propagate(grid, p.lines) };
}
export interface Hint { description: string; values: number[]; candidates: number[]; technique: string }
export function hint(p: Puzzle): Hint | null {
  p = validatePuzzle(p);
  const { grid: g, valid } = candidates(p);
  if (!valid) throw new Error('This position has a contradiction. Check the highlighted digits or undo your last move.');
  const base = gridFromValues(p.values);
  const narrowed = [...g.cands].filter((mask, i) => !g.values[i] && mask !== base.cands[i]).length;
  const descriptions: string[] = narrowed ? [`Palindrome matching narrows the candidates in ${narrowed} cells before applying Sudoku techniques.`] : [];
  for (let iteration = 0; iteration < 200; iteration++) {
    const step = finders.reduce<Step | null>((found, fn) => found ?? fn(g), null);
    if (!step) return descriptions.length ? { description: descriptions.join('\n'), values: [...g.values], candidates: [...g.cands], technique: 'Candidate eliminations' } : null;
    for (const { cell, digit } of step.eliminations) g.cands[cell] &= ~bit(digit);
    for (const { cell, digit } of step.placements) setValue(g, cell, digit);
    descriptions.push(step.description);
    if (!propagate(g, p.lines)) throw new Error('No valid continuation from this position.');
    if (step.placements.length) return { description: descriptions.join('\n'), values: [...g.values], candidates: [...g.cands], technique: step.tech.replaceAll('_', ' ') };
  }
  return null;
}
export interface SolveResult { solutions: number[][]; exhausted: boolean; nodes: number }
export function solve(p: Puzzle, budgetMs = 5000, logical = true): SolveResult {
  p = validatePuzzle(p);
  const { grid, valid } = candidates(p);
  const result: SolveResult = { solutions: [], exhausted: true, nodes: 0 };
  if (!valid) return result;
  const deadline = performance.now() + budgetMs;
  function visit(g: Grid): void {
    if (result.solutions.length >= 2 || !result.exhausted) return;
    if (performance.now() >= deadline) { result.exhausted = false; return; }
    result.nodes++;
    while (true) {
      if (!propagate(g, p.lines)) return;
      if (performance.now() >= deadline) { result.exhausted = false; return; }
      const step = logical ? nextLogicalStep(g) : findNakedSingle(g) ?? findHiddenSingle(g);
      if (!step) break;
      applyLogicalStep(g, step);
    }
    if (isSolved(g)) { result.solutions.push([...g.values]); return; }
    let cell = -1, count = 10;
    for (let c = 0; c < 81; c++) if (!g.values[c] && popcount(g.cands[c]) < count) { cell = c; count = popcount(g.cands[c]); }
    for (const d of digitsOf(g.cands[cell])) { const next = cloneGrid(g); setValue(next, cell, d); visit(next); }
  }
  visit(grid);
  return result;
}
