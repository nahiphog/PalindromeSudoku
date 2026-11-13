import { describe, expect, it } from 'vitest';
import { blank, decodePuzzle, encodePuzzle, example, validatePuzzle } from './puzzle';
import { candidates, conflicts, propagate, solve } from './solver';
import { bit, emptyGrid, UNITS } from './vendor/sudokui/board';
import { generate } from './generator';
import { analyze } from './walkthrough';
import { techniqueScore } from './technique-tallies';

const solution = [...'534678912672195348198342567859761423426853791713924856961537284287419635345286179'].map(Number);
function audit(values: number[], lines: number[][]) {
  for (const unit of UNITS) expect(unit.map(c => values[c]).sort()).toEqual([1,2,3,4,5,6,7,8,9]);
  for (const line of lines) expect(line.map(c => values[c])).toEqual(line.toReversed().map(c => values[c]));
}
describe('palindrome constraints', () => {
  it('solves the example and independently audits every constraint', () => {
    const p = example(), result = solve(p);
    expect(result.exhausted).toBe(true); expect(result.solutions).toEqual([solution]); audit(result.solutions[0], p.lines);
    const replay = analyze(p); expect(replay.frames.at(-1)?.values).toEqual(solution);
    expect(replay.score).toBe(Object.entries(replay.techniques).reduce((sum, [name, count]) => sum + techniqueScore(name) * count, 0));
  });
  it('propagates equality in both directions and across overlaps', () => {
    const g = emptyGrid(); g.cands[1] = bit(3);
    expect(propagate(g, [[21, 31, 41], [1, 11, 21]])).toBe(true);
    expect(g.cands[21]).toBe(bit(3)); expect(g.cands[41]).toBe(bit(3));
    expect(propagate(g, [[21, 11, 1].reverse(), [41, 31, 21]])).toBe(true);
  });
  it('rejects equal mirrored peers, incompatible givens, and even-length lines', () => {
    for (const line of [[0, 1, 2], [0, 1], [0, 10, 20, 30]]) {
      const p = blank(); p.lines = [line]; expect(candidates(p).valid).toBe(false); expect(solve(p).solutions).toEqual([]);
    }
    const p = example(); p.values[1] = p.givens[1] = 4; p.values[21] = p.givens[21] = 6;
    expect(conflicts(p).size).toBeGreaterThan(0); expect(solve(p).solutions).toEqual([]);
  });
  it('distinguishes two completions from a timeout', () => {
    const result = solve(blank(), 5000, false); expect(result.solutions).toHaveLength(2);
    result.solutions.forEach(values => audit(values, []));
    expect(solve(blank(), 0).exhausted).toBe(false);
  });
  it('round-trips lines and givens and rejects malformed input', () => {
    const p = example(); expect(decodePuzzle(encodePuzzle(p))).toEqual(p); expect(decodePuzzle(JSON.stringify(p))).toEqual(p);
    expect(decodePuzzle(p.values.join('')).lines).toEqual([]);
    for (const lines of [[[0, 80]], [[1, 2, 1]], [[-1, 0]], [[0]]]) expect(() => validatePuzzle({ ...p, lines })).toThrow();
    expect(() => decodePuzzle('not a puzzle')).toThrow();
  });
});
describe('generation', () => {
  it('generates unique, symmetric, logically solved puzzles with correct line lengths', () => {
    let seed = 92; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (const length of [3, 5, 7]) {
      const generated = generate({ lengths: [length, length, length], symmetricLines: false, symmetric: true, logicalOnly: true }, () => {}, random, 15000);
      expect(generated.puzzle.lines).toHaveLength(3); generated.puzzle.lines.forEach(line => expect(line).toHaveLength(length));
      audit(generated.solution, generated.puzzle.lines);
      const result = solve(generated.puzzle, 10000); expect(result.exhausted).toBe(true); expect(result.solutions).toEqual([generated.solution]);
      expect(generated.analysis.guesses).toBe(0); expect(generated.analysis.frames.at(-1)?.values).toEqual(generated.solution);
      generated.puzzle.givens.forEach((v, c, values) => expect(Boolean(v)).toBe(Boolean(values[80 - c])));
    }
  }, 60000);
});

it('generates mixed lengths with two rotated pairs by default', () => {
  let seed = 44;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const { puzzle, solution } = generate({ lengths: [3, 3, 5, 5], symmetric: true, logicalOnly: true }, () => {}, random, 15000);
  expect(puzzle.lines.map(line => line.length).sort()).toEqual([3, 3, 5, 5]);
  for (const line of puzzle.lines) {
    const rotated = line.map(cell => 80 - cell).join(',');
    expect(puzzle.lines.some(path => path.join(',') === rotated || path.toReversed().join(',') === rotated)).toBe(true);
  }
  audit(solution, puzzle.lines);
});
