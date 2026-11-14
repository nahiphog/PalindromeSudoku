import { bit, UNITS } from './vendor/sudokui/board';

/** Snyder notes mark digits with exactly two remaining positions in a box. */
export function snyderNotes(values: readonly number[], candidates: readonly number[]): number[] {
  const notes = Array<number>(81).fill(0);
  for (const box of UNITS.slice(18)) for (let digit = 1; digit <= 9; digit++) {
    if (box.some(cell => values[cell] === digit)) continue;
    const positions = box.filter(cell => !values[cell] && (candidates[cell] & bit(digit)));
    if (positions.length === 2) for (const cell of positions) notes[cell] |= bit(digit);
  }
  return notes;
}
