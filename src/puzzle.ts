export interface Puzzle { version: 1; values: number[]; givens: number[]; lines: number[][] }
export const adjacent = (a: number, b: number) => a !== b && Math.abs(Math.floor(a / 9) - Math.floor(b / 9)) <= 1 && Math.abs(a % 9 - b % 9) <= 1;
export function blank(): Puzzle { return { version: 1, values: Array(81).fill(0), givens: Array(81).fill(0), lines: [] }; }
export function validatePuzzle(input: unknown): Puzzle {
  const p = input as Puzzle;
  if (!p || p.version !== 1) throw new Error('Unsupported puzzle format. Expected version 1.');
  for (const values of [p.values, p.givens]) if (!Array.isArray(values) || values.length !== 81 || values.some(v => !Number.isInteger(v) || v < 0 || v > 9)) throw new Error('A grid must contain exactly 81 digits from 0 to 9.');
  if (p.givens.some((v, i) => v && v !== p.values[i])) throw new Error('A given must match its cell value.');
  if (!Array.isArray(p.lines) || p.lines.length > 100) throw new Error('Expected at most 100 palindrome lines.');
  for (const line of p.lines) if (!Array.isArray(line) || line.length < 2 || line.length > 81 || new Set(line).size !== line.length || line.some(c => !Number.isInteger(c) || c < 0 || c > 80) || line.some((c, i) => i > 0 && !adjacent(line[i - 1], c))) throw new Error('Lines need 2–81 distinct adjacent cells.');
  return structuredClone({ version: 1, values: p.values, givens: p.givens, lines: p.lines });
}
export function example(): Puzzle {
  const p = blank();
  p.values = [...'530070000600195000098000060800060003400803001700020006060000280000419005000080079'].map(Number);
  p.givens = [...p.values];
  p.lines = [[1,11,21],[2,12,22],[6,5,13]];
  return p;
}
export function encodePuzzle(p: Puzzle): string {
  return `PS1|${p.givens.join('')}|${p.lines.map(line => line.map(c => `${Math.floor(c / 9) + 1}${c % 9 + 1}`).join('')).join(';')}`;
}
export function decodePuzzle(text: string): Puzzle {
  const input = text.trim();
  if (input.startsWith('{')) return validatePuzzle(JSON.parse(input));
  const embedded = input.match(/PS1\|[^\s]*/)?.[0];
  const token = embedded?.match(/^PS1\|([0-9]{81})\|([1-9;]*)$/);
  if (embedded && !token) throw new Error('Malformed PS1 puzzle string. Check the digits and line coordinates.');
  const p = blank();
  if (token) {
    p.givens = [...token[1]].map(Number);
    p.lines = token[2] ? token[2].split(';').map(path => {
      if (path.length % 2) throw new Error('Line coordinates must be row/column pairs.');
      return (path.match(/../g) ?? []).map(pair => (Number(pair[0]) - 1) * 9 + Number(pair[1]) - 1);
    }) : [];
  } else {
    const grid = input.replace(/\s/g, '');
    if (!/^[0-9.]{81}$/.test(grid)) throw new Error('Paste a PS1 puzzle string, puzzle JSON, or 81 digits (0 or . for blanks).');
    p.givens = [...grid].map(c => c === '.' ? 0 : Number(c));
  }
  p.values = [...p.givens]; return validatePuzzle(p);
}
