import { validatePuzzle, type Puzzle } from './puzzle';
import { solve } from './solver';
import { analyze } from './walkthrough';
import { generate, type GenerationOptions } from './generator';
self.onmessage = (event: MessageEvent<{ action: 'generate' | 'check'; puzzle: Puzzle; options: GenerationOptions }>) => {
  try {
    if (event.data.action === 'generate') {
      let last = 0;
      const generated = generate(event.data.options, text => { if (performance.now() - last > 100) { self.postMessage({ progress: text }); last = performance.now(); } });
      self.postMessage({ generated });
    } else {
      const puzzle = validatePuzzle(event.data.puzzle);
      puzzle.values = [...puzzle.givens];
      const result = solve(puzzle, 15000);
      let analysis, analysisError;
      if (result.exhausted && result.solutions.length === 1) {
        try { analysis = analyze(puzzle, 15000); } catch (error) { analysisError = (error as Error).message; }
      }
      self.postMessage({ result, analysis, analysisError });
    }
  } catch (error) { self.postMessage({ error: (error as Error).message }); }
};
