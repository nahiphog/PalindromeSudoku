import { adjacent, blank, linesOverlap, type Puzzle } from './puzzle';
import { solve } from './solver';
import { checkLogical } from './logical-runner';
import { analyze, type Analysis } from './walkthrough';
export interface GenerationOptions { lengths: number[]; emptyLines?: boolean; symmetricLines?: boolean; symmetric: boolean; logicalOnly: boolean }
export interface Generated { puzzle: Puzzle; solution: number[]; analysis: Analysis; elapsed: number; attempts: number }
const shuffle = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
const neighbors = Array.from({ length: 81 }, (_, c) => Array.from({ length: 81 }, (_, i) => i).filter(i => adjacent(c, i)));
export function completedGrid(random = Math.random): number[] {
  const order = () => shuffle([0, 1, 2], random).flatMap(b => shuffle([0, 1, 2], random).map(c => b * 3 + c));
  const rows = order(), cols = order(), digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  return rows.flatMap(r => cols.map(c => digits[(r * 3 + Math.floor(r / 3) + c) % 9]));
}
export function findLines(values: number[], lengths: number[], symmetric: boolean, random = Math.random): number[][] | null {
  const lines: number[][] = [], used = new Set<number>();
  const remaining = lengths.toSorted((a, b) => b - a);
  while (remaining.length) {
    const length = remaining.shift()!;
    const partner = symmetric ? remaining.indexOf(length) : -1;
    if (partner >= 0) remaining.splice(partner, 1);
    function extend(path: number[]): number[] | null {
      if (path.length === length) return path;
      for (const a of shuffle(neighbors[path[0]], random)) {
        if (used.has(a) || path.includes(a)) continue;
        for (const b of shuffle(neighbors[path.at(-1)!], random)) {
          if (a === b || used.has(b) || path.includes(b) || values[a] !== values[b]) continue;
          if (partner >= 0 && (a + b === 80 || path.includes(80 - a) || path.includes(80 - b) ||
            used.has(80 - a) || used.has(80 - b) || values[80 - a] !== values[80 - b])) continue;
          const found = extend([a, ...path, b]);
          if (found) return found;
        }
      }
      return null;
    }
    const centers = shuffle(Array.from({ length: 81 }, (_, i) => i), random);
    let line: number[] | null = null;
    for (const center of centers) {
      if (used.has(center) || (partner >= 0 && (center === 40 || used.has(80 - center)))) continue;
      line = extend([center]);
      if (line) break;
    }
    if (!line) return null;
    lines.push(line);
    if (partner >= 0) lines.push(line.map(c => 80 - c));
    for (const placed of lines) placed.forEach(c => used.add(c));
  }
  return lines;
}
/** Construction uses a known valid completion; each removal is independently checked.
 * Logical-only generation retries layouts whose final clue set needs search. */
export function generate(options: GenerationOptions, progress: (text: string) => void = () => {}, random = Math.random, budgetMs = 60000): Generated {
  const { lengths, symmetricLines = true } = options;
  if (!lengths.length || lengths.length > 12 || lengths.some(n => ![3, 5, 7, 9].includes(n)) ||
    lengths.reduce((sum, n) => sum + n, 0) > 65) {
    throw new Error('Enter 1–12 comma-separated lengths of 3, 5, 7 or 9, totaling at most 65 cells.');
  }
  const unpaired = [...new Set(lengths)].filter(n => lengths.filter(length => length === n).length % 2);
  if (symmetricLines && unpaired.length > 0) {
    throw new Error('Rotational symmetry requires each length to appear an even number of times. Change the lengths or turn off line symmetry.');
  }
  const start = performance.now(), deadline = start + budgetMs;
  let attempts = 0;
  layouts: while (performance.now() < deadline) {
    attempts++; progress(`Finding a palindrome layout · attempt ${attempts}`);
    const solution = completedGrid(random), lines = findLines(solution, lengths, symmetricLines, random);
    if (!lines || linesOverlap(lines)) continue;
    const puzzle: Puzzle = { ...blank(), lines, values: [...solution], givens: [...solution] };
    const orbits = shuffle(Array.from({ length: options.symmetric ? 41 : 81 }, (_, c) => c), random);
    if (options.emptyLines !== false) {
      for (const cell of lines.flat()) {
        puzzle.givens[cell] = puzzle.values[cell] = 0;
        if (options.symmetric) puzzle.givens[80 - cell] = puzzle.values[80 - cell] = 0;
      }
      const initial = solve(puzzle, deadline - performance.now(), false);
      if (!initial.exhausted || initial.solutions.length !== 1) continue;
    }
    for (const c of orbits) {
      if (performance.now() >= deadline) throw new Error('Generation time limit reached. Try fewer or shorter lines.');
      const cells = options.symmetric ? [...new Set([c, 80 - c])] : [c];
      if (!puzzle.givens[c]) continue;
      cells.forEach(i => { puzzle.givens[i] = 0; puzzle.values[i] = 0; });
      const check = solve(puzzle, deadline - performance.now(), false);
      if (!check.exhausted) continue layouts;
      // A second solution survives any subsequent clue removal, so this orbit
      // never needs to be checked again after a conclusive rejection.
      if (check.solutions.length !== 1) cells.forEach(i => { puzzle.givens[i] = solution[i]; puzzle.values[i] = solution[i]; });
      progress(`Removing clues · ${puzzle.givens.filter(Boolean).length} givens remain`);
    }
    const verified = solve(puzzle, Math.max(1, deadline - performance.now()), false);
    if (!verified.exhausted || verified.solutions.length !== 1) continue;
    if (options.logicalOnly && !checkLogical(puzzle, deadline)) continue;
    const analysis = analyze(puzzle, Math.max(1, deadline - performance.now()), !options.logicalOnly);
    return { puzzle, solution, analysis, elapsed: performance.now() - start, attempts };
  }
  throw new Error('No suitable layout found within the time limit. Try fewer or shorter lines.');
}
