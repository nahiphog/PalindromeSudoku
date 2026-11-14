import { UNITS } from './vendor/sudokui/board';
import type { Frame } from './walkthrough';

export function walkthroughHighlights(frame?: Frame) {
  const roles = ['primary', 'secondary', 'fins'] as const;
  const cells = { primary: new Set<number>(), secondary: new Set<number>(), fins: new Set<number>() };
  const candidates = { primary: new Set<string>(), secondary: new Set<string>(), fins: new Set<string>() };
  const bands = { primary: new Set<number>(), secondary: new Set<number>(), fins: new Set<number>() };
  const highlights = frame?.highlights ?? {};
  for (const role of roles) for (const mark of highlights[role] ?? []) {
    cells[role].add(mark.cell); candidates[role].add(`${mark.cell}:${mark.digit}`);
  }
  for (const band of highlights.units ?? []) {
    const role = band.role === 'fin' ? 'fins' : band.role;
    for (const cell of UNITS[band.unit]) {
      if (band.within === undefined || UNITS[band.within].includes(cell)) bands[role].add(cell);
    }
  }
  const chainMarks = [...(highlights.links ?? []).flatMap(link => [...link.from, ...link.to]), ...(highlights.sets ?? []).flatMap(set => set.members)];
  for (const mark of chainMarks) {
    const key = `${mark.cell}:${mark.digit}`;
    if (!roles.some(role => candidates[role].has(key))) {
      cells.primary.add(mark.cell); candidates.primary.add(key);
    }
  }
  for (const cell of highlights.chainCells ?? []) if (!roles.some(role => cells[role].has(cell))) cells.primary.add(cell);
  return { cells, candidates, bands };
}
