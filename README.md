# Palindrome Sudoku Studio

A TypeScript/Vite maker, generator, and solver, based on the visual design and
shared solving foundation of [ThermoSudoku](https://github.com/nahiphog/ThermoSudoku).
There is one variant, Palindrome Sudoku:

> Normal sudoku rules apply. The grey lines are palindromes, that is the digits placed on them must read the same in either direction.

## Run locally

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests require Playwright Chromium (`npx playwright install chromium`).
The production output is `dist/`. Relative asset URLs support GitHub Pages
repository subpaths. A Pages workflow is included; configure the repository's
Pages source to GitHub Actions before publishing. No hosting account is needed
for local use.

## Features

- Enter givens using the keyboard or keypad. Arrow keys move selection.
- Draw lines by clicking adjacent cells in order and selecting **Finish line**.
  Erase line removes the most recently added line through the clicked cell.
  Undo restores edits, imports, and generated puzzles.
- Generate disjoint palindrome paths with selectable count and length, optional
  rotational symmetry of clue positions, and optional logical-only solving.
- Check for zero, one, or multiple solutions. Multiple solutions display two
  completed grids with differing cells highlighted. Timeouts remain inconclusive.
- Reveal/hide the verified solution without altering puzzle givens or exports.
- Replay the actual solution with candidate eliminations, placements, trials,
  backtracking, technique tallies, and difficulty ratings.
- Import JSON, PS1 puzzle strings, or 81 digits with `0`/`.` blanks. Imported
  entries are reset to the original givens for checking and editing.
- Copy puzzle strings, export JSON, save the displayed digits/lines as PNG,
  and automatically save the puzzle in local storage. Clipboard failure offers
  a selectable-text fallback.
- Responsive desktop/mobile layouts and a matching `12321` SVG logo/favicon.

## Constraints and solver

Mirrored positions have equal candidate domains. Equality propagates to a fixed
point along palindrome lines. The solver enforces normal rows, columns and
3×3 boxes at every search node. Even-length continuous paths are impossible:
their middle two neighboring cells would need equal digits. Generation offers
odd lengths 3, 5, 7 and 9; import accepts longer paths and reports contradictions
when checked. Palindrome lines cannot share cells or cross.

The actual sudokUI modules imported by ThermoSudoku are retained unchanged.
The logical repertoire includes singles, locked candidates, naked/hidden subsets
(2–4), basic fish (2–4), XY/XYZ/W wings, skyscrapers, two-string
kites, empty rectangles, and **Phistomefel Ring**. See THIRD_PARTY_NOTICES.md.

Phistomefel Ring is registered in `src/solver.ts`'s common `nextLogicalStep`,
independently of line constraints, so classic puzzles with no lines and future
categories using this shared solver inherit it. Its exact sets are:

- Ring: R3C3–R3C7, R4C3/R4C7, R5C3/R5C7, R6C3/R6C7, R7C3–R7C7.
- Corners: the four 2×2 corner blocks.

These are equal **multisets**, not pairs of corresponding equal cells.
Conservative per-digit lower/upper count bounds eliminate surplus candidates
or force required placements in either direction. Each productive per-digit
step adds **200 points**, regardless of the number of affected cells. A scan
without a deduction adds nothing. This applies to solving, logical generation
certification, walkthroughs, and tallies. Future categories must preserve normal
9×9 Sudoku rules and call the common logical runner. Other repositories are
not automatically changed.

Other ratings use the imported sudokUI weights; palindrome reduction rounds add
5 and palindrome locked candidates add 50. The latter transports a house's
possible digit positions through mirrored equality and removes that digit from
cells seen in every case.

Walkthroughs retain only the successful solution path. Each retained Brute force
guess adds 10,000 points and is explicitly labeled as a guess. Failed branches,
their deductions, and their scores are discarded; technique tallies refer only
to displayed steps. Difficulty is an engine-dependent estimate, not a calibrated
measure of human difficulty.

## Generation and limits

The generator randomizes a valid Sudoku grid, constructs matching paths, and
tests shuffled clue removals (rotational pairs when enabled). Every accepted
removal preserves proven uniqueness. Logical-only mode additionally requires
the shared logical solver to complete the puzzle. A final independent search
verifies uniqueness and records a walkthrough. This construction differs from
ThermoSudoku's layout-first method because mirrored equality is nondirectional.
By default all palindrome cells start empty. When clue symmetry is enabled, their rotated counterparts start empty too.

Generation is limited to 60 seconds, 1–12 disjoint lines, and at most 65 occupied
line cells. The generator only returns a puzzle after every remaining clue (or rotational clue group) has been shown necessary for uniqueness. A timeout cannot certify a puzzle.
Construction starts from shuffled standard-pattern grids rather than sampling
all Sudoku completions uniformly. Solver checks and walkthroughs each have a
15-second budget. Workers can be cancelled immediately without changing the
current puzzle. No unsupported fallback is silently accepted.

## Data format

JSON: `{ version: 1, values: number[81], givens: number[81], lines: number[][] }`.
Digits are 0–9; line cells are row-major indices 0–80. Paths contain distinct,
adjacent cells. A nonzero given must match its value.

Compact format: `PS1|<81 givens>|<paths>`; each path concatenates two-digit
row/column coordinates, and semicolons separate paths. Direction is irrelevant.
Neither the compact string nor JSON includes a revealed solution or walkthrough.

GPL-3.0-only. All puzzle processing stays in the browser. The inherited stylesheet
loads Google Fonts, with system fallbacks.
