# Attribution and license

This application is distributed under **GPL-3.0-only**; see LICENSE.

## ThermoSudoku

The shared solver structure, logical runner, walkthrough/rating system,
Phistomefel Ring implementation and tests, technique catalogue/tallies, and
visual styling are adapted from [nahiphog/ThermoSudoku](https://github.com/nahiphog/ThermoSudoku),
using the local reference checkout available on November 13, 2026.
Palindrome constraints, construction, puzzle format, and the editor integration
are implemented for this application. The source repository is not modified.

## sudokUI

Files under `src/vendor/sudokui` are copied unchanged through ThermoSudoku from
[AImenes/sudokUI](https://github.com/AImenes/sudokUI), pinned by that project to
commit `cf7ce55e09ee7ea879327f4f995f9e603d4fb17a`.

Imported modules: board, steps, ratings, text, singles, intersections, subsets,
fish, wings, and singleDigit. These are the actual implementations used by the
solver, not merely technique names. Upstream's complete technique catalogue is
not enabled; the curated repertoire matches ThermoSudoku. Techniques relying
on ordinary-Sudoku uniqueness assumptions are excluded.

The original source comments and copyright/license notices are retained.
