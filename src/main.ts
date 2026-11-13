import './style.css';
import './studio.css';
import { adjacent, blank, linesOverlap, decodePuzzle, encodePuzzle, example, validatePuzzle, type Puzzle } from './puzzle';
import { candidates, conflicts, type SolveResult } from './solver';
import { digitsOf } from './vendor/sudokui/board';
import { repertoire } from './techniques-page';
import { renderTechniqueTallies } from './technique-tallies';
import type { Analysis } from './walkthrough';
import type { Generated } from './generator';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let puzzle = example(), selected = 0, tool = 'digit', draft: number[] = [], history: Puzzle[] = [];
let worker: Worker | null = null, analysis: Analysis | null = null, solutions: number[][] = [], slide: number | null = null, revealed = false;
let showCandidates = false, generationStart = 0, timer: ReturnType<typeof setInterval> | undefined;
try { const saved = localStorage.getItem('palindrome-studio-v1'); if (saved) puzzle = validatePuzzle(JSON.parse(saved)); puzzle.values = [...puzzle.givens]; } catch { /* Local storage is optional. */ }
$('#app').innerHTML = `
<header class="topbar"><details id="page-menu"><summary>Maker</summary><nav class="page-nav" aria-label="Pages"><a href="?page=maker">Maker</a><a href="?page=import-grid">Import grid</a><a href="?page=techniques">Techniques</a></nav></details><a class="brand" href="./"><img class="brand-icon" src="${import.meta.env.BASE_URL}palindrome.svg" alt="12321 logo">palindrome<span class="brand-dot">.</span></a><button id="about" class="outline header-actions">About</button></header>
<main id="studio">
<section id="import-panel" class="card settings-card" hidden><h2>Import grid</h2><p class="muted">Paste a PS1 puzzle string, exported JSON, or 81 digits with 0 or . for blanks. Loading replaces the current puzzle; Undo restores it.</p><textarea id="import-text" aria-label="Puzzle to import" spellcheck="false"></textarea><button id="load" class="primary">Load and check puzzle</button></section>
<section id="generation" class="card settings-card"><div class="settings-heading"><h2>Make your next puzzle</h2><span class="pill">PALINDROME SUDOKU</span></div><div class="generation-options"><label>Palindrome line lengths (comma-separated) <input id="line-lengths" type="text" value="5, 5, 5, 5"></label><label><input id="symmetric-lines" type="checkbox" checked> Rotationally symmetric lines</label><label><input id="symmetric" type="checkbox" checked> Rotationally symmetric givens</label><label><input id="empty-lines" type="checkbox" checked> Leave palindrome cells empty</label><label><input id="logical-only" type="checkbox" checked> Logical techniques only</label></div><div class="generate-row"><p class="muted">Generate a unique puzzle, or use the tools below to design your own.</p><button id="generate" class="primary">Generate puzzle</button></div></section>
<div id="status" class="status-box" role="status" aria-live="polite"><span id="status-text">Your canvas is ready. Select a cell to get started.</span><span id="elapsed"></span><button id="cancel" class="text-button" hidden>Cancel</button></div>
<div class="workspace"><section class="board-panel"><div class="board-heading"><span id="view-label">YOUR PUZZLE</span><button id="new" class="text-button">＋ Blank grid</button></div><div id="board" class="board" role="group" aria-label="Palindrome Sudoku grid"><svg id="lines" class="line-overlay" viewBox="0 0 900 900" aria-hidden="true"></svg><div id="cells" class="cells"></div></div><div class="board-footer"><span id="filled"></span><span id="selected-label"></span></div><div class="keypad">${Array.from({ length: 9 }, (_, i) => `<button data-digit="${i + 1}">${i + 1}</button>`).join('')}<button data-digit="0" aria-label="Erase digit">⌫</button></div><p class="keyboard-help">1–9 enter a digit · Delete clears · Arrow keys move · Ctrl/Cmd + Z undoes</p><div class="button-pair grid-actions"><button id="reveal" class="primary" disabled>Reveal solution</button><button id="walk" class="outline" disabled>Solution walkthrough</button></div>
<section id="walkthrough-panel" hidden><div class="walk-heading"><h2>Solution walkthrough</h2><button id="close-walk" class="text-button">Return to puzzle</button></div><p id="slide-count" class="muted"></p><h3 id="slide-title"></h3><p id="slide-description" class="muted"></p><input id="slide-range" type="range" min="0" value="0" aria-label="Solution step"><div class="button-pair"><button id="prev" class="outline">Previous step</button><button id="next" class="primary">Next step</button></div><div id="tallies"></div></section>
<div class="export-actions"><button id="copy" class="text-button">Copy puzzle string</button><button id="export" class="text-button">Export JSON</button><button id="image" class="text-button">Save grid image</button></div></section>
<aside><section class="card"><div class="section-label">CREATE & EDIT</div><h2>Your toolkit</h2><div class="tool-grid"><button class="tool active" data-tool="digit" aria-label="Digits"><span>1</span>Digits</button><button class="tool" data-tool="line" aria-label="Draw line"><span>⌁</span>Draw line</button><button class="tool" data-tool="erase" aria-label="Erase line"><span>×</span>Erase line</button></div><p id="tool-help" class="muted">Select a cell, then type a digit or use the keypad. Digits are puzzle givens.</p><button id="finish-line" class="outline full" hidden>Finish line</button><div class="button-pair"><button id="undo" class="text-button">Undo</button><button id="example" class="text-button">Load example</button></div><label class="toggle-row"><input id="candidates" type="checkbox"> Show candidates</label><button id="check" class="primary full">Check & solve</button></section>
<section id="report" class="card" hidden><div class="section-label">SOLVING REPORT</div><h2 id="rating"></h2><p id="hardest" class="muted"></p><p class="muted">Scores add the technique weight for each productive use. Palindrome matching: +5 per step. Phistomefel Ring: +200. Brute force: +10,000 per trial.</p></section>
</aside></div>
<section id="alternatives" class="card" hidden><h2>Two valid completions</h2><p class="muted">This puzzle is not unique. Highlighted cells differ between these solutions.</p><div class="import-columns" id="alternative-grids"></div></section></main>
<main id="techniques" hidden><section class="card"><h1>Techniques</h1><p class="muted">Supported solving techniques and their difficulty ratings. Points are charged per productive use.</p><div class="techniques-scroll"><table class="technique-catalog"><thead><tr><th>Technique</th><th>Rating</th><th>Level</th><th>Category</th></tr></thead><tbody>${repertoire.map(t => `<tr><td>${t.name}</td><td>+${t.score}</td><td>${t.level}</td><td>${t.category}</td></tr>`).join('')}</tbody></table></div></section></main>
<dialog id="about-dialog"><form method="dialog"><button class="text-button close" aria-label="Close About">✕</button></form><h2>Palindrome Sudoku</h2><p>Fill each row, column and 3 × 3 box with 1–9 exactly once. Every grey line must read the same in both directions.</p><p>Solving runs locally in a cancellable worker. Difficulty is an engine estimate. A timed-out check never claims uniqueness.</p><p>Based on ThermoSudoku and its GPL-licensed sudokUI technique imports.</p></dialog>
<dialog id="copy-dialog"><form method="dialog"><button class="text-button close">Close</button></form><h2>Copy puzzle string</h2><textarea id="copy-text" aria-label="Puzzle string" readonly></textarea></dialog>`;

const cells = Array.from({ length: 81 }, (_, c) => {
  const button = document.createElement('button'); button.className = 'cell'; button.dataset.cell = String(c);
  button.onclick = () => select(c); $('#cells').append(button); return button;
});
function status(text: string) { $('#status-text').textContent = text; }
function save() { try { localStorage.setItem('palindrome-studio-v1', JSON.stringify(puzzle)); } catch { /* Optional. */ } }
function cancel() { worker?.terminate(); worker = null; clearInterval(timer); $('#cancel').hidden = true; render(); }
function invalidate() { analysis = null; solutions = []; slide = null; revealed = false; $('#alternatives').hidden = true; }
function change(update: () => void) { if (worker) return; history.push(structuredClone(puzzle)); if (history.length > 100) history.shift(); update(); invalidate(); save(); render(); }
function select(c: number) {
  selected = c;
  if (!worker && slide === null && !revealed) {
    if (tool === 'line') {
      if (draft.at(-1) === c && draft.length > 1) finishLine();
      else if (!draft.length || (!draft.includes(c) && adjacent(draft.at(-1)!, c))) {
        if (linesOverlap([...puzzle.lines, [...draft, c]])) status('Palindrome lines cannot share cells or cross.');
        else draft.push(c);
      }
      else status('Choose an adjacent, unused cell. Click Finish line when ready.');
    } else if (tool === 'erase') {
      const index = puzzle.lines.findLastIndex(line => line.includes(c));
      if (index >= 0) change(() => puzzle.lines.splice(index, 1));
    }
  }
  render();
}
function finishLine() {
  if (draft.length < 2) { status('Select at least two cells for a line.'); return; }
  const line = [...draft]; draft = []; change(() => puzzle.lines.push(line)); status('Line added. Check & solve will check whether it is possible.');
}
function digit(value: number) { if (slide !== null || revealed || worker || tool !== 'digit') return; change(() => { puzzle.values[selected] = value; puzzle.givens[selected] = value; }); }
function lineMarkup(lines: number[][]) { return lines.map(line => `<polyline points="${line.map(c => `${c % 9 * 100 + 50},${Math.floor(c / 9) * 100 + 50}`).join(' ')}"/>`).join(''); }
function render() {
  const frame = slide !== null ? analysis?.frames[slide] : undefined;
  const values = frame?.values ?? (revealed ? solutions[0] : puzzle.values);
  const bad = conflicts(puzzle), masks = frame?.candidates ?? (showCandidates ? [...candidates(puzzle).grid.cands] : []);
  $('#lines').innerHTML = lineMarkup(puzzle.lines) + `<g class="draft">${lineMarkup(draft.length > 1 ? [draft] : [])}</g>`;
  cells.forEach((button, c) => {
    button.className = ['cell', c % 9 === 2 || c % 9 === 5 ? 'box-right' : '', [2, 5].includes(Math.floor(c / 9)) ? 'box-bottom' : '', c === selected ? 'selected' : '', puzzle.givens[c] ? 'given' : '', !revealed && !frame && bad.has(c) ? 'conflict' : '', draft.includes(c) ? 'draft-cell' : '', frame?.placements.some(p => p.cell === c) ? 'step-placement' : ''].join(' ');
    button.setAttribute('aria-label', `Row ${Math.floor(c / 9) + 1}, column ${c % 9 + 1}, ${values[c] || 'empty'}`);
    button.setAttribute('aria-pressed', String(c === selected));
    const removed = frame?.eliminations.filter(e => e.cell === c).map(e => e.digit) ?? [];
    button.innerHTML = values[c] ? `<span class="digit">${values[c]}</span>` : masks.length ? `<span class="pencil">${Array.from({ length: 9 }, (_, i) => `<span class="${removed.includes(i + 1) ? 'removed-candidate' : ''}">${digitsOf(masks[c]).includes(i + 1) || removed.includes(i + 1) ? i + 1 : ''}</span>`).join('')}</span>` : '';
  });
  $('#filled').textContent = `${puzzle.givens.filter(Boolean).length} givens · ${puzzle.lines.length} lines`;
  $('#selected-label').textContent = `R${Math.floor(selected / 9) + 1}C${selected % 9 + 1}`;
  $('#view-label').textContent = frame ? 'SOLUTION WALKTHROUGH' : revealed ? 'VERIFIED SOLUTION' : 'YOUR PUZZLE';
  $('#walkthrough-panel').hidden = !frame;
  $('#finish-line').hidden = tool !== 'line';
  $<HTMLButtonElement>('#finish-line').disabled = !!worker || draft.length < 2;
  for (const id of ['generate', 'check', 'new', 'example', 'undo', 'load']) $<HTMLButtonElement>('#' + id).disabled = !!worker || (id === 'undo' && !history.length);
  $<HTMLButtonElement>('#reveal').disabled = !!worker || solutions.length !== 1;
  $<HTMLButtonElement>('#walk').disabled = !!worker || !analysis;
  $('#reveal').textContent = revealed ? 'Hide solution' : 'Reveal solution';
  $('#report').hidden = !analysis;
  if (analysis) { $('#rating').textContent = `${analysis.level} · ${analysis.score.toLocaleString()} points`; $('#hardest').textContent = `Hardest technique: ${analysis.hardest}. ${analysis.guesses} trials, ${analysis.backtracks} rollbacks.`; }
  if (frame && analysis) {
    $('#slide-count').textContent = `Step ${slide! + 1} of ${analysis.frames.length}`; $('#slide-title').textContent = frame.title; $('#slide-description').textContent = frame.description;
    $<HTMLInputElement>('#slide-range').max = String(analysis.frames.length - 1); $<HTMLInputElement>('#slide-range').value = String(slide);
    $<HTMLButtonElement>('#prev').disabled = slide === 0; $<HTMLButtonElement>('#next').disabled = slide === analysis.frames.length - 1;
  }
}
function start(action: 'generate' | 'check') {
  if (worker) return;
  if (draft.length) { status('Finish the current line or switch to Digits to discard it before solving.'); return; }
  generationStart = performance.now(); $('#elapsed').textContent = ''; $('#cancel').hidden = false;
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  timer = setInterval(() => { $('#elapsed').textContent = `${((performance.now() - generationStart) / 1000).toFixed(1)} s`; }, 100);
  status(action === 'generate' ? 'Generating a unique palindrome puzzle…' : 'Checking solutions and recording the solving steps…');
  worker.onerror = () => { cancel(); status('The solver worker could not finish. Please try again.'); };
  worker.onmessage = (event: MessageEvent<{ progress?: string; error?: string; generated?: Generated; result?: SolveResult; analysis?: Analysis; analysisError?: string }>) => {
    const data = event.data;
    if (data.progress) { status(data.progress); return; }
    cancel();
    if (data.error) { status(data.error); return; }
    if (data.generated) {
      history.push(structuredClone(puzzle)); puzzle = data.generated.puzzle; solutions = [data.generated.solution]; analysis = data.generated.analysis;
      slide = null; revealed = false; $('#alternatives').hidden = true; save(); status(`Unique puzzle generated in ${(data.generated.elapsed / 1000).toFixed(1)} s. ${analysis.level} · ${analysis.score.toLocaleString()} points.`);
    } else if (data.result) {
      invalidate(); const result = data.result;
      if (result.solutions.length > 1) { solutions = result.solutions; showAlternatives(); status('Multiple solutions. Add more givens or palindrome constraints.'); }
      else if (!result.exhausted) status('Time limit reached: uniqueness is inconclusive. Add givens and try again.');
      else if (!result.solutions.length) status('No solution. Check the givens and mirrored positions on your lines.');
      else { solutions = result.solutions; analysis = data.analysis ?? null; status(`Exactly one solution.${data.analysisError ? ' Walkthrough unavailable: ' + data.analysisError : ' Reveal it or follow the walkthrough.'}`); }
    }
    if (analysis) renderTechniqueTallies($('#tallies'), analysis);
    render();
  };
  worker.postMessage({ action, puzzle, options: { lengths: $<HTMLInputElement>('#line-lengths').value.split(',').map(value => Number(value.trim())), symmetricLines: $<HTMLInputElement>('#symmetric-lines').checked, symmetric: $<HTMLInputElement>('#symmetric').checked, emptyLines: $<HTMLInputElement>('#empty-lines').checked, logicalOnly: $<HTMLInputElement>('#logical-only').checked } }); render();
}
function showAlternatives() {
  $('#alternatives').hidden = false;
  $('#alternative-grids').innerHTML = solutions.map((values, index) => `<div><h3>Solution ${index + 1}</h3><div class="board"><svg class="line-overlay" viewBox="0 0 900 900">${lineMarkup(puzzle.lines)}</svg><div class="cells">${values.map((v, c) => `<div class="cell ${[2, 5].includes(c % 9) ? 'box-right' : ''} ${[2, 5].includes(Math.floor(c / 9)) ? 'box-bottom' : ''} ${solutions[0][c] !== solutions[1][c] ? 'different-cell' : ''}"><span class="digit">${v}</span></div>`).join('')}</div></div></div>`).join('');
}
document.querySelectorAll<HTMLButtonElement>('[data-digit]').forEach(b => b.onclick = () => digit(Number(b.dataset.digit)));
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b => b.onclick = () => {
  tool = b.dataset.tool!; draft = [];
  document.querySelectorAll('[data-tool]').forEach(t => t.classList.toggle('active', t === b));
  $('#tool-help').textContent = tool === 'line' ? 'Click adjacent cells in order, then Finish line. Matching positions must hold equal digits.' : tool === 'erase' ? 'Click any cell on a line to remove the most recently added line through it.' : 'Select a cell, then type a digit or use the keypad. Digits are puzzle givens.'; render();
});
$('#finish-line').onclick = finishLine;
$('#undo').onclick = () => { if (!worker && history.length) { puzzle = history.pop()!; draft = []; invalidate(); save(); render(); status('Previous puzzle restored.'); } };
$('#new').onclick = () => change(() => { puzzle = blank(); draft = []; });
$('#example').onclick = () => change(() => { puzzle = example(); draft = []; });
$('#generate').onclick = () => start('generate'); $('#check').onclick = () => start('check');
$('#cancel').onclick = () => { cancel(); status('Cancelled. Your puzzle has been kept.'); };
$('#candidates').onchange = () => { showCandidates = $<HTMLInputElement>('#candidates').checked; render(); };
$('#reveal').onclick = () => { revealed = !revealed; slide = null; render(); };
$('#walk').onclick = () => { slide = 0; revealed = false; render(); };
$('#close-walk').onclick = () => { slide = null; render(); };
$('#prev').onclick = () => { if (slide !== null && slide > 0) slide--; render(); };
$('#next').onclick = () => { if (slide !== null && analysis && slide < analysis.frames.length - 1) slide++; render(); };
$('#slide-range').oninput = () => { slide = Number($<HTMLInputElement>('#slide-range').value); render(); };
$('#about').onclick = () => $<HTMLDialogElement>('#about-dialog').showModal();
$('#load').onclick = () => { try { const imported = decodePuzzle($<HTMLTextAreaElement>('#import-text').value); imported.values = [...imported.givens]; change(() => { puzzle = imported; draft = []; }); start('check'); } catch (error) { status((error as Error).message); } };
$('#copy').onclick = async () => {
  const text = encodePuzzle(puzzle);
  try { await navigator.clipboard.writeText(text); status('Puzzle string copied.'); } catch { $<HTMLTextAreaElement>('#copy-text').value = text; $<HTMLDialogElement>('#copy-dialog').showModal(); $<HTMLTextAreaElement>('#copy-text').select(); }
};
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('#export').onclick = () => download(new Blob([JSON.stringify(puzzle, null, 2)], { type: 'application/json' }), 'palindrome-sudoku.json');
$('#image').onclick = () => {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 904; const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 904, 904); ctx.translate(2, 2);
  ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ccccd0';
  for (const line of puzzle.lines) { ctx.beginPath(); line.forEach((c, i) => { const x = c % 9 * 100 + 50, y = Math.floor(c / 9) * 100 + 50; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
  ctx.lineCap = 'butt'; for (let i = 0; i <= 9; i++) { ctx.strokeStyle = i % 3 ? '#ddd' : '#45454b'; ctx.lineWidth = i % 3 ? 1 : 4; ctx.beginPath(); ctx.moveTo(i * 100, 0); ctx.lineTo(i * 100, 900); ctx.moveTo(0, i * 100); ctx.lineTo(900, i * 100); ctx.stroke(); }
  const values = slide !== null && analysis ? analysis.frames[slide].values : revealed ? solutions[0] : puzzle.values;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '48px Arial'; ctx.fillStyle = '#292c33'; values.forEach((v, c) => { if (v) ctx.fillText(String(v), c % 9 * 100 + 50, Math.floor(c / 9) * 100 + 52); });
  canvas.toBlob(blob => { if (blob) download(blob, 'palindrome-sudoku.png'); });
};
window.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).matches('input,textarea,select') || document.querySelector('dialog[open]')) return;
  if (/^[1-9]$/.test(event.key)) { event.preventDefault(); digit(Number(event.key)); }
  if (['Delete', 'Backspace', '0'].includes(event.key)) { event.preventDefault(); digit(0); }
  const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  if (event.key in move) { event.preventDefault(); selected = (selected + move[event.key] + 81) % 81; render(); cells[selected].focus(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); $('#undo').click(); }
});
function navigate() {
  const page = new URL(location.href).searchParams.get('page') ?? 'maker';
  $('#studio').hidden = page === 'techniques'; $('#techniques').hidden = page !== 'techniques'; $('#import-panel').hidden = page !== 'import-grid'; $('#generation').hidden = page === 'import-grid';
  $('#page-menu summary').textContent = page === 'techniques' ? 'Techniques' : page === 'import-grid' ? 'Import grid' : 'Maker';
}
document.querySelectorAll<HTMLAnchorElement>('.page-nav a').forEach(link => link.onclick = event => { event.preventDefault(); window.history.pushState({}, '', link.href); $<HTMLDetailsElement>('#page-menu').open = false; navigate(); });
window.onpopstate = navigate; navigate(); render();
