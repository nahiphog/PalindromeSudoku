import { expect, it } from 'vitest';
import { generate, randomLineLengths, type GenerationOptions } from './generator';
import { validatePuzzle } from './puzzle';

function seededRandom() {
  let seed = 44;
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

it.each([true, false])('random lengths respect limits and line symmetry=%s', symmetric => {
  const random = seededRandom();
  const combinations = new Set<string>();
  for (let trial = 0; trial < 500; trial++) {
    const lengths = randomLineLengths(symmetric, random);
    expect(lengths.length).toBeGreaterThanOrEqual(1);
    expect(lengths.length).toBeLessThanOrEqual(12);
    expect(lengths.reduce((sum, length) => sum + length, 0)).toBeLessThanOrEqual(65);
    for (const length of lengths) {
      expect(Number.isInteger(length) && length >= 2 && length <= 15).toBe(true);
      if (symmetric) expect(lengths.filter(value => value === length).length % 2).toBe(0);
    }
    combinations.add(lengths.join(','));
  }
  expect(combinations.size).toBeGreaterThan(1);
});

it('chooses fresh lengths when repeated trials reuse empty options', () => {
  const random = seededRandom();
  const options: GenerationOptions = { lengths: [], symmetric: true, logicalOnly: true };
  const combinations = new Set<string>();
  for (let trial = 0; trial < 3; trial++) {
    const result = generate(options, () => {}, random, 15000);
    expect(validatePuzzle(result.puzzle)).toEqual(result.puzzle);
    expect(result.analysis.guesses).toBe(0);
    combinations.add(result.puzzle.lines.map(line => line.length).join(','));
    expect(options.lengths).toEqual([]);
  }
  expect(combinations.size).toBeGreaterThan(1);
}, 60000);
