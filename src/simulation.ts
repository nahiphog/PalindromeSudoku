import type { Generated, GenerationOptions } from './generator';
import { encodePuzzle } from './puzzle';

export function mountSimulation(root: HTMLElement, options: () => GenerationOptions, open: (result: Generated) => void) {
  root.innerHTML = `<section class="card"><h1>Simulation</h1>
  <p>Generate and rate multiple puzzles using the current Maker settings.</p>
  <div class="generation-options"><label>Total trials <select id="sim-trials"><option>1</option><option selected>10</option><option>100</option><option>1000</option></select></label>
  <label>Minimum difficulty <input id="sim-min" type="number" min="0" value="0"></label>
  <label><input id="sim-logical" type="checkbox" checked> Display grids without brute force</label></div>
  <button id="sim-start" class="primary">Start simulation</button>
  <p id="sim-status" role="status">Ready.</p><progress id="sim-progress" value="0" max="10" aria-label="Completed trials"></progress>
  <p id="sim-counts"></p><h2>Difficulty distribution</h2><div id="sim-chart"></div>
  <h2>Matching grids</h2><p>Highest difficulty first.</p>
  <button id="sim-prev" class="outline">Previous page</button> <button id="sim-next" class="outline">Next page</button>
  <div id="sim-results"></div><textarea id="sim-copy" readonly hidden aria-label="Puzzle string"></textarea></section>`;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>('#sim-' + id)!;
  let worker: Worker | null = null, total = 10, completed = 0, failed = 0, page = 0;
  const scores = new Map<number, number>();
  const matches: { trial: number; result: Generated }[] = [];
  function render() {
    const progress = el<HTMLProgressElement>('progress');
    progress.max = total; progress.value = completed + failed;
    el('counts').textContent = `${completed} completed · ${matches.length} matching · ${failed} failed`;
    el('start').textContent = worker ? 'Stop simulation' : 'Start simulation';
    for (const id of ['trials', 'min', 'logical']) el<HTMLInputElement>('' + id).disabled = !!worker;
    el<HTMLButtonElement>('prev').disabled = page === 0;
    el<HTMLButtonElement>('next').disabled = (page + 1) * 12 >= matches.length;
    const width = Math.max(250, Math.ceil((Math.max(0, ...scores.keys()) + 1) / 5000) * 250);
    const bins = new Map<number, number>();
    for (const [score, count] of scores) {
      const low = Math.floor(score / width) * width;
      bins.set(low, (bins.get(low) ?? 0) + count);
    }
    el('chart').innerHTML = [...bins].sort(([a], [b]) => a - b).map(([low, count]) =>
      `<div><span>${low}–${low + width - 1}</span> <meter min="0" max="${completed}" value="${count}" aria-label="${low}–${low + width - 1}"></meter> ${count}</div>`).join('') || '<p>No completed trials yet.</p>';
    el('results').replaceChildren();
    for (const { trial, result } of matches.slice(page * 12, page * 12 + 12)) {
      const card = document.createElement('article');
      card.className = 'card';
      const { puzzle, analysis, elapsed } = result;
      const lines = puzzle.lines.map(line => `<polyline points="${line.map(c => `${c % 9 * 100 + 50},${Math.floor(c / 9) * 100 + 50}`).join(' ')}"/>`).join('');
      card.innerHTML = `<h3>Trial ${trial}</h3><div class="board" style="max-width:260px"><svg class="line-overlay" viewBox="0 0 900 900" aria-hidden="true">${lines}</svg><div class="cells">${puzzle.givens.map((digit, cell) => `<div class="cell given ${[2, 5].includes(cell % 9) ? 'box-right' : ''} ${[2, 5].includes(Math.floor(cell / 9)) ? 'box-bottom' : ''}">${digit || ''}</div>`).join('')}</div></div>
      <p>${analysis.level} · ${analysis.score} points · ${puzzle.givens.filter(Boolean).length} givens · ${(elapsed / 1000).toFixed(2)} s</p>
      <p>Hardest technique: ${analysis.hardest}</p><button class="primary">View walkthrough</button> <button class="outline">Copy puzzle string</button>`;
      const [walk, copy] = card.querySelectorAll('button');
      walk.onclick = () => open(result);
      copy.onclick = async () => {
        const text = encodePuzzle(puzzle);
        try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; }
        catch { const field = el<HTMLTextAreaElement>('copy'); field.hidden = false; field.value = text; field.select(); }
      };
      el('results').append(card);
    }
  }
  function stop(message: string) {
    worker?.terminate(); worker = null; el('status').textContent = message; render();
  }
  el('start').onclick = () => {
    if (worker) { stop('Stopped. Completed results are retained.'); return; }
    total = Number(el<HTMLSelectElement>('trials').value);
    const minimum = Number(el<HTMLInputElement>('min').value);
    const logical = el<HTMLInputElement>('logical').checked;
    const settings = options();
    completed = failed = page = 0;
    scores.clear(); matches.length = 0;
    const active = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
    worker = active;
    function next() {
      if (completed + failed === total) { stop('Simulation complete.'); return; }
      el('status').textContent = `Generating trial ${completed + failed + 1} of ${total}…`;
      active.postMessage({ action: 'generate', options: settings });
    }
    active.onmessage = ({ data }: MessageEvent<{ generated?: Generated; error?: string }>) => {
      if (worker !== active) return;
      if (data.error) { failed++; stop(data.error); return; }
      if (!data.generated) return;
      const result = data.generated;
      completed++;
      const { score, guesses } = result.analysis;
      scores.set(score, (scores.get(score) ?? 0) + 1);
      if (score >= minimum && (!logical || guesses === 0)) {
        matches.push({ trial: completed + failed, result });
        matches.sort((a, b) => b.result.analysis.score - a.result.analysis.score);
      }
      render(); next();
    };
    active.onerror = () => { failed++; stop('The simulation worker failed.'); };
    render(); next();
  };
  el('prev').onclick = () => { page--; render(); };
  el('next').onclick = () => { page++; render(); };
  render();
}
