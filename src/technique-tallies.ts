import { TECHS } from './techniques';
import type { Analysis } from './walkthrough';

const scores = new Map(Object.values(TECHS).map(info => [info.name.toLowerCase(), info.score]));
scores.set('palindrome matching', 5);
export const techniqueScore = (name: string) => scores.get(name.toLowerCase()) ?? Infinity;

/** Step references and counts cover only the successful solution path. */
export function renderTechniqueTallies(container: HTMLElement, analysis: Analysis, navigateToStep: (index: number) => void) {
  const stepsByTechnique = new Map<string, number[]>();
  analysis.frames.forEach((frame, index) => {
    if (frame.kind !== 'logic' && frame.kind !== 'palindrome' && frame.kind !== 'guess') return;
    const steps = stepsByTechnique.get(frame.title) ?? [];
    steps.push(index);
    stepsByTechnique.set(frame.title, steps);
  });
  const table = document.createElement('table'); table.className = 'technique-tallies';
  table.innerHTML = '<caption>Technique tallies</caption><thead><tr><th scope="col">Technique</th><th scope="col">Steps</th></tr></thead><tbody></tbody>';
  const body = table.querySelector('tbody')!;
  for (const name of Object.keys(analysis.techniques).sort((a, b) => techniqueScore(a) - techniqueScore(b) || a.localeCompare(b))) {
    const row = body.insertRow(); const heading = document.createElement('th');
    heading.scope = 'row'; heading.textContent = name; row.append(heading);
    const uses = row.insertCell();
    const steps = document.createElement('div'); steps.className = 'tally-steps';
    (stepsByTechnique.get(name) ?? []).forEach((index, position) => {
      if (position) steps.append(', ');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tally-step'; button.textContent = String(index + 1);
      button.setAttribute('aria-label', `Go to step ${index + 1}: ${name}`);
      button.onclick = () => navigateToStep(index);
      steps.append(button);
    });
    uses.append(steps);
  }
  const note = document.createElement('p'); note.className = 'tally-note';
  note.textContent = Object.keys(analysis.techniques).length
    ? 'Steps on the successful solution path. Failed trials are omitted and do not add to the rating. Each Brute force step adds 10,000 points. Click a step number to view it.'
    : 'No solving techniques were needed: the imported grid was already complete.';
  container.replaceChildren(table, note);
}
