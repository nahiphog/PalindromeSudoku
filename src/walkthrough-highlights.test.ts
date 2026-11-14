import { expect, it } from 'vitest';
import { decodePuzzle } from './puzzle';
import { analyze } from './walkthrough';
import { walkthroughHighlights } from './walkthrough-highlights';
import { runLogical } from './logical-runner';
import { gridFromValues } from './vendor/sudokui/board';

const puzzle = decodePuzzle('PS1|000000980073004000000020000520040009000809000900060047000050000000600490067000000|5343322131;5767788979;5262728171;5848382939');

it('retains the Swordfish pattern and its base and cover houses at step 18', () => {
  const frame = analyze(puzzle).frames[17];
  expect(frame.title).toBe('Swordfish');
  expect(frame.highlights.primary!.length).toBeGreaterThanOrEqual(6);
  expect(frame.highlights.units!.filter(unit => unit.role === 'primary')).toHaveLength(3);
  expect(frame.highlights.units!.filter(unit => unit.role === 'secondary')).toHaveLength(3);
  const highlights = walkthroughHighlights(frame);
  expect(highlights.bands.primary.size).toBe(27);
  expect(highlights.bands.secondary.size).toBe(27);
  for (const mark of frame.highlights.primary!) {
    expect(highlights.cells.primary.has(mark.cell)).toBe(true);
    expect(highlights.candidates.primary.has(`${mark.cell}:${mark.digit}`)).toBe(true);
  }
});

it('preserves every logical technique’s recorded visual evidence', () => {
  const frames = analyze(puzzle).frames.filter(frame => frame.kind === 'logic');
  let index = 0;
  runLogical(gridFromValues(puzzle.givens), puzzle, Infinity, {
    palindrome: () => {},
    step: step => {
      const frame = frames[index++];
      for (const key of ['primary', 'secondary', 'fins', 'units', 'links', 'chainCells', 'sets', 'labels'] as const) {
        expect(frame.highlights[key]).toEqual(step[key]);
      }
      expect(frame.placements).toEqual(step.placements);
      expect(frame.eliminations).toEqual(step.eliminations);
    },
  });
  expect(index).toBe(frames.length);
});

it('highlights both ends of affected palindrome pairs and clears marks on the final frame', () => {
  const frames = analyze(puzzle).frames;
  for (const frame of frames.filter(frame => frame.kind === 'palindrome')) {
    const marks = walkthroughHighlights(frame).cells.primary;
    for (const { cell } of frame.eliminations) {
      expect(marks.has(cell)).toBe(true);
      for (const line of puzzle.lines.filter(line => line.includes(cell))) {
        expect(marks.has(line[line.length - 1 - line.indexOf(cell)])).toBe(true);
      }
    }
  }
  expect(walkthroughHighlights(frames.at(-1)).cells.primary.size).toBe(0);
});
