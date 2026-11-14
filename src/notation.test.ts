import { expect, it } from 'vitest';
import { bit } from './vendor/sudokui/board';
import { snyderNotes } from './notation';

it('marks only digits with exactly two empty positions in the same box', () => {
  const values = Array<number>(81).fill(0), masks = Array<number>(81).fill(0);
  masks[0] = bit(1) | bit(2) | bit(3) | bit(4);
  masks[1] = bit(1) | bit(3);
  masks[9] = bit(3);
  masks[3] = bit(4); // The same row is not the same box.
  const notes = snyderNotes(values, masks);
  expect(notes[0]).toBe(bit(1));
  expect(notes[1]).toBe(bit(1));
  expect(notes.filter(Boolean)).toHaveLength(2);
  expect(masks[0]).toBe(bit(1) | bit(2) | bit(3) | bit(4));
});

it('does not note a digit already placed in its box or write into filled cells', () => {
  const values = Array<number>(81).fill(0), masks = Array<number>(81).fill(0);
  values[9] = 1; masks[0] = masks[1] = bit(1);
  values[3] = 2; masks[3] = masks[4] = bit(3);
  expect(snyderNotes(values, masks).every(mask => mask === 0)).toBe(true);
});
