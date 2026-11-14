import { expect, it } from 'vitest';
import { findPalindromeLockedCandidates } from './palindrome-locked';
import { bit, emptyGrid, UNITS } from './vendor/sudokui/board';
import { decodePuzzle } from './puzzle';
import { analyze } from './walkthrough';
import { solve } from './solver';
import { techniqueScore } from './technique-tallies';

export const longPuzzle = 'PS1|000103700400000050000020000000070005000204000900060000000010000020000006004605000|3132334352;7978776758;7273636251;3837474859';

it('transports a required house digit through a palindrome, with evidence for every removal', () => {
  const g = emptyGrid();
  // Row 1 places 9 at r1c1 or r1c5; r1c1 equals r4c4.
  for (const cell of UNITS[0]) if (cell !== 0 && cell !== 4) g.cands[cell] &= ~bit(9);
  const step = findPalindromeLockedCandidates(g, [[0, 10, 20, 21, 30]])!;
  expect(step.tech).toBe('PALINDROME_LOCKED_CANDIDATES');
  expect(step.primary).toEqual([{ cell: 0, digit: 9 }, { cell: 4, digit: 9 }]);
  expect(step.secondary).toEqual([{ cell: 30, digit: 9 }]);
  expect(step.eliminations).toContainEqual({ cell: 31, digit: 9 });
  expect(step.eliminations).not.toContainEqual({ cell: 32, digit: 9 });
  expect(step.eliminations).not.toContainEqual({ cell: 0, digit: 9 });
  expect(step.eliminations).not.toContainEqual({ cell: 4, digit: 9 });
});

it('does not eliminate when another house position escapes the restriction', () => {
  const g = emptyGrid();
  expect(findPalindromeLockedCandidates(g, [[0, 10, 20, 21, 30]])).toBeNull();
  expect(findPalindromeLockedCandidates(g, [])).toBeNull();
});

it('shortens the reported search and agrees with an independent singles-only solve', () => {
  const p = decodePuzzle(longPuzzle);
  const independent = solve(p, 15000, false);
  expect(independent.exhausted).toBe(true);
  expect(independent.solutions).toHaveLength(1);
  const analysis = analyze(p, 15000);
  expect(analysis.frames.length).toBeLessThan(150);
  expect(analysis.guesses).toBeLessThan(50);
  expect(analysis.guesses).toBeGreaterThan(0);
  expect(analysis.techniques['Palindrome locked candidates']).toBeGreaterThan(0);
  expect(analysis.frames.at(-1)!.values).toEqual(independent.solutions[0]);
  expect(analysis.frames.some(frame => frame.kind === 'backtrack' || frame.kind === 'contradiction')).toBe(false);
  expect(analysis.techniques['Brute force']).toBe(analysis.frames.filter(frame => frame.kind === 'guess').length);
  expect(analysis.guesses).toBe(analysis.techniques['Brute force']);
  const tallies: Record<string, number> = {};
  for (const frame of analysis.frames.filter(frame => ['logic', 'palindrome', 'guess'].includes(frame.kind))) tallies[frame.title] = (tallies[frame.title] ?? 0) + 1;
  expect(analysis.techniques).toEqual(tallies);
  expect(analysis.score).toBe(Object.entries(analysis.techniques).reduce((sum, [name, count]) => sum + techniqueScore(name) * count, 0));
  // Every retained deduction and guess must agree with the unique completion.
  for (const frame of analysis.frames) {
    for (const { cell, digit } of frame.eliminations) expect(digit).not.toBe(independent.solutions[0][cell]);
    for (const { cell, digit } of frame.placements) expect(digit).toBe(independent.solutions[0][cell]);
  }
});

it('never removes the known solution from candidate supersets', () => {
  const p = decodePuzzle(longPuzzle), solution = solve(p, 15000, false).solutions[0];
  let seed = 817;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let trial = 0; trial < 100; trial++) {
    const g = emptyGrid();
    for (let cell = 0; cell < 81; cell++) {
      if (random() < .2) { g.values[cell] = solution[cell]; g.cands[cell] = 0; }
      else {
        g.cands[cell] = bit(solution[cell]);
        for (let digit = 1; digit <= 9; digit++) if (random() < .3) g.cands[cell] |= bit(digit);
      }
    }
    for (const removal of findPalindromeLockedCandidates(g, p.lines)?.eliminations ?? []) expect(removal.digit).not.toBe(solution[removal.cell]);
  }
});
