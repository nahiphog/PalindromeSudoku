import type { Puzzle } from './puzzle';

/** Draw only the grid, with palindrome strokes beneath box boundaries and digits. */
export function gridImageCanvas(puzzle: Puzzle, values = puzzle.givens): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 904;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 904, 904); ctx.translate(2, 2);
  ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ccccd0';
  for (const line of puzzle.lines) {
    ctx.beginPath();
    line.forEach((c, i) => {
      const x = c % 9 * 100 + 50, y = Math.floor(c / 9) * 100 + 50;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  for (let i = 0; i <= 9; i++) {
    ctx.strokeStyle = i % 3 ? '#ddd' : '#45454b'; ctx.lineWidth = i % 3 ? 1 : 4;
    ctx.beginPath(); ctx.moveTo(i * 100, 0); ctx.lineTo(i * 100, 900);
    ctx.moveTo(0, i * 100); ctx.lineTo(900, i * 100); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '48px Arial'; ctx.fillStyle = '#292c33';
  values.forEach((v, c) => { if (v) ctx.fillText(String(v), c % 9 * 100 + 50, Math.floor(c / 9) * 100 + 52); });
  return canvas;
}

export function gridImageBlob(puzzle: Puzzle): Promise<Blob> {
  return new Promise((resolve, reject) => {
    gridImageCanvas(puzzle).toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create grid image.')), 'image/png');
  });
}
