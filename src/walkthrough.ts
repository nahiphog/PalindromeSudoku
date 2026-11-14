import { TECHS } from './techniques';
import { conflicts } from './solver';
import { runLogical } from './logical-runner';
import { type Puzzle } from './puzzle';
import { bit, cellName, cloneGrid, digitsOf, gridFromValues, isSolved, popcount, setValue, type Grid } from './vendor/sudokui/board';
import { LEVELS, LEVEL_MAX_SCORE, type Level } from './vendor/sudokui/ratings';
import type { CellDigit } from './vendor/sudokui/steps';
import type { Step } from './techniques';

export type Highlights = Pick<Step, 'primary' | 'secondary' | 'fins' | 'units' | 'links' | 'chainCells' | 'sets' | 'labels'>;

export interface Frame { title: string; description: string; values: number[]; candidates: number[]; placements: CellDigit[]; eliminations: CellDigit[]; highlights: Highlights; kind: 'start' | 'logic' | 'palindrome' | 'guess' | 'contradiction' | 'backtrack' | 'finish' }
export interface Analysis { frames: Frame[]; score: number; level: Level; hardest: string; guesses: number; backtracks: number; techniques: Record<string, number> }
/** The successful solving path; failed trial branches are discarded with their scores.
 * This is an estimate: upstream technique weights + 5 per palindrome reduction +
 * 10000 per Brute force use. Trials always force Extreme, never masquerade as deductions. */
export class LogicalSolveStalled extends Error { constructor() { super('The supported logical techniques cannot complete this puzzle without Brute force.'); } }
export function analyze(p: Puzzle, budgetMs = 10000, allowBruteForce = true): Analysis {
  const result: Analysis = { frames: [], score: 0, level: 'Easy', hardest: 'None', guesses: 0, backtracks: 0, techniques: {} };
  const deadline = performance.now() + budgetMs;
  let hardestWeight = -1;
  if (conflicts(p).size) throw new Error('Cannot analyze a contradictory puzzle.');
  const add = (g: Grid, kind: Frame['kind'], title: string, description: string, placements: CellDigit[] = [], eliminations: CellDigit[] = [], highlights: Highlights = {}) => {
    if (result.frames.length >= 20000 || performance.now() >= deadline) throw new Error('Analysis budget reached before a complete walkthrough was recorded. Try generating again.');
    result.frames.push({ title, description, values: [...g.values], candidates: [...g.cands], kind, placements, eliminations, highlights });
  };
  const credit = (name: string, score: number, level: Level) => {
    result.score += score; result.techniques[name] = (result.techniques[name] ?? 0) + 1;
    const rank = LEVELS.indexOf(level), current = LEVELS.indexOf(result.level);
    if (rank > current || (rank === current && score > hardestWeight)) { result.level = level; result.hardest = name; hardestWeight = score; }
  };
  function search(g: Grid): Grid | null {
    const state = runLogical(g, p, deadline, {
      palindrome: removed => {
        const affected = new Set(removed.map(({ cell }) => cell));
        const mirrored = new Set<number>();
        for (const line of p.lines) for (let i = 0; i < Math.floor(line.length / 2); i++) {
          const a = line[i], b = line[line.length - 1 - i];
          if (affected.has(a) || affected.has(b)) { mirrored.add(a); mirrored.add(b); }
        }
        const primary = [...mirrored].flatMap(cell => digitsOf(g.values[cell] ? bit(g.values[cell]) : g.cands[cell]).map(digit => ({ cell, digit })));
        add(g, 'palindrome', 'Palindrome matching', `Remove ${removed.length} candidates incompatible with mirrored equality on a palindrome. Highlighted cells are the affected mirrored pairs; crossed red marks were removed.`, [], removed, { primary });
        credit('Palindrome matching', 5, 'Easy');
      },
      step: step => {
        const info = TECHS[step.tech]; credit(info.name, info.score, info.level);
        const { primary, secondary, fins, units, links, chainCells, sets, labels } = step;
        add(g, 'logic', info.name, step.description, step.placements, step.eliminations, { primary, secondary, fins, units, links, chainCells, sets, labels });
      },
    });
    if (state === 'solved') return g;
    if (state === 'contradiction') {
      add(g, 'contradiction', 'Contradiction', 'This trial leaves no legal completion: Sudoku candidates or palindrome equality cannot be satisfied.'); return null;
    }
    if (!allowBruteForce) throw new LogicalSolveStalled();
    let cell = -1, count = 10;
    for (let c = 0; c < 81; c++) if (!g.values[c] && popcount(g.cands[c]) < count) { cell = c; count = popcount(g.cands[c]); }
    const digits = digitsOf(g.cands[cell]);
    for (const d of digits) {
      const checkpoint = {
        length: result.frames.length, score: result.score, level: result.level,
        hardest: result.hardest, hardestWeight, guesses: result.guesses,
        techniques: { ...result.techniques },
      };
      const next = cloneGrid(g); setValue(next, cell, d); result.guesses++;
      credit('Brute force', 10000, 'Extreme');
      add(next, 'guess', 'Brute force', `Brute force correctly guesses ${cellName(cell)} = ${d} from candidates ${digits.join(', ')}. This choice leads to the solution; it is a guess, not a logical deduction. +10,000 difficulty points.`, [{ cell, digit: d }]);
      const completed = search(next); if (completed) return completed;
      result.backtracks++;
      result.frames.length = checkpoint.length;
      result.score = checkpoint.score; result.level = checkpoint.level;
      result.hardest = checkpoint.hardest; hardestWeight = checkpoint.hardestWeight;
      result.guesses = checkpoint.guesses; result.techniques = checkpoint.techniques;
    }
    return null;
  }
  const grid = gridFromValues(p.givens);
  add(grid, 'start', 'Starting puzzle', 'Begin with the original givens. The small digits show remaining candidates; no solution digits have been revealed.');
  const solved = search(grid); if (!solved) throw new Error('This puzzle has no solution walkthrough.');
  add(solved, 'finish', 'Puzzle complete', 'Every row, column, box, and palindrome satisfies the rules. The walkthrough has reached a valid completion.');
  let level = LEVELS.indexOf(result.level);
  while (level < LEVELS.length - 1 && result.score > LEVEL_MAX_SCORE[LEVELS[level]]) level++;
  result.level = LEVELS[level]; return result;
}
