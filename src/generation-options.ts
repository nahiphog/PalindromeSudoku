import type { GenerationOptions } from './generator';

export function generationOptionsMarkup(prefix = '', defaultLengths = '6,6,6,6') {
  return `<div class="generation-options">
    <label>Palindrome line lengths (comma-separated) <input id="${prefix}line-lengths" type="text" value="${defaultLengths}" placeholder="Random when blank" aria-describedby="${prefix}line-lengths-hint"><span id="${prefix}line-lengths-hint" class="muted">Lengths 2–15 supported; for example, 6,6,6,6. Leave blank for random lengths, chosen anew for each simulation trial.</span></label>
    <label><input id="${prefix}symmetric-lines" type="checkbox" checked> Rotationally symmetric lines</label>
    <label><input id="${prefix}symmetric" type="checkbox" checked> Rotationally symmetric givens</label>
    <label><input id="${prefix}empty-lines" type="checkbox" checked> Leave palindrome cells empty</label>
    <label><input id="${prefix}logical-only" type="checkbox" checked> Logical techniques only</label>
  </div>`;
}

export function readGenerationOptions(root: ParentNode, prefix = ''): GenerationOptions {
  const input = (name: string) => root.querySelector<HTMLInputElement>(`#${prefix}${name}`)!;
  const lengths = input('line-lengths').value.trim();
  return {
    lengths: lengths ? lengths.split(',').map(value => Number(value.trim())) : [],
    symmetricLines: input('symmetric-lines').checked,
    symmetric: input('symmetric').checked,
    emptyLines: input('empty-lines').checked,
    logicalOnly: input('logical-only').checked,
  };
}
