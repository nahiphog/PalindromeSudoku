import type { GenerationOptions } from './generator';

export function generationOptionsMarkup(prefix = '', defaultLengths = '6,6,6,6') {
  return `<div class="generation-options">
    <label>Palindrome line lengths (comma-separated) <input id="${prefix}line-lengths" type="text" value="${defaultLengths}" placeholder="6,6,6,6" aria-describedby="${prefix}line-lengths-hint"><span id="${prefix}line-lengths-hint" class="muted">Lengths 2–15 supported; for example, 6,6,6,6.</span></label>
    <label><input id="${prefix}symmetric-lines" type="checkbox" checked> Rotationally symmetric lines</label>
    <label><input id="${prefix}symmetric" type="checkbox" checked> Rotationally symmetric givens</label>
    <label><input id="${prefix}empty-lines" type="checkbox" checked> Leave palindrome cells empty</label>
    <label><input id="${prefix}logical-only" type="checkbox" checked> Logical techniques only</label>
  </div>`;
}

export function readGenerationOptions(root: ParentNode, prefix = ''): GenerationOptions {
  const input = (name: string) => root.querySelector<HTMLInputElement>(`#${prefix}${name}`)!;
  return {
    lengths: input('line-lengths').value.split(',').map(value => Number(value.trim())),
    symmetricLines: input('symmetric-lines').checked,
    symmetric: input('symmetric').checked,
    emptyLines: input('empty-lines').checked,
    logicalOnly: input('logical-only').checked,
  };
}
