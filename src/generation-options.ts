import type { GenerationOptions } from './generator';

export function generationOptionsMarkup(prefix = '') {
  return `<div class="generation-options">
    <label>Palindrome line lengths (comma-separated) <input id="${prefix}line-lengths" type="text" value="5, 5, 5, 5"></label>
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
