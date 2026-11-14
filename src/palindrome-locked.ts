import { bit, cellName, PEERS, UNITS, type Grid } from './vendor/sudokui/board';
import type { Step } from './techniques';

/** Transport a house's required digit through mirrored equality before intersecting peers. */
export function findPalindromeLockedCandidates(g: Grid, lines: number[][]): Step | null {
  const equals = Array.from({ length: 81 }, (_, cell) => new Set([cell]));
  for (const line of lines) for (let i = 0; i < Math.floor(line.length / 2); i++) {
    const a = line[i], b = line[line.length - 1 - i];
    const group = new Set([...equals[a], ...equals[b]]);
    for (const cell of group) equals[cell] = group;
  }
  const sees = equals.map(group => new Set([...group].flatMap(cell => PEERS[cell])));
  for (const [unit, house] of UNITS.entries()) for (let digit = 1; digit <= 9; digit++) {
    if (house.some(cell => g.values[cell] === digit)) continue;
    const positions = house.filter(cell => !g.values[cell] && (g.cands[cell] & bit(digit)));
    if (positions.length < 2 || positions.every(cell => equals[cell].size === 1)) continue;
    const eliminations = [...sees[positions[0]]].filter(cell => !g.values[cell] && (g.cands[cell] & bit(digit)) && positions.every(source => sees[source].has(cell))).map(cell => ({ cell, digit }));
    if (!eliminations.length) continue;
    const mirrors = [...new Set(positions.flatMap(cell => [...equals[cell]]))].filter(cell => !positions.includes(cell));
    const houseName = unit < 9 ? `row ${unit + 1}` : unit < 18 ? `column ${unit - 8}` : `box ${unit - 17}`;
    return {
      tech: 'PALINDROME_LOCKED_CANDIDATES', placements: [], eliminations,
      primary: positions.map(cell => ({ cell, digit })), secondary: mirrors.map(cell => ({ cell, digit })),
      units: [{ unit, role: 'primary' }],
      labels: { primary: `possible ${digit}s in ${houseName}`, secondary: 'equal mirrored cells' },
      description: `Palindrome locked candidates: ${houseName} must contain ${digit} in ${positions.map(cellName).join(', ')}. Mirrored cells have the same value (${positions.filter(cell => equals[cell].size > 1).map(cell => `${cellName(cell)} = ${[...equals[cell]].filter(other => other !== cell).map(cellName).join(' = ')}`).join('; ')}). Whichever position holds ${digit}, it or its mirror sees every removal cell. Remove ${digit} from ${eliminations.map(({ cell }) => cellName(cell)).join(', ')}.`,
    };
  }
  return null;
}
