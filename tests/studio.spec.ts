import { expect, test, type Page } from '@playwright/test';

async function checkTallyNavigation(page: Page) {
  const url = page.url();
  for (const row of await page.locator('.technique-tallies tbody tr').all()) {
    const technique = await row.locator('th').innerText();
    const links = row.getByRole('button');
    await expect(row.locator('td')).toHaveText(/^\d+(, \d+)*$/);
    for (const link of [links.first(), links.last()]) {
      const step = Number(await link.innerText());
      await link.click();
      await expect(page.locator('#slide-count')).toContainText(`Step ${step} of`);
      await expect(page.locator('#slide-title')).toHaveText(technique);
      await expect(page.locator('#slide-range')).toHaveValue(String(step - 1));
      expect(page.url()).toBe(url);
    }
  }
}
test('solves, replays, generates, and preserves the original givens on reveal', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Palindrome Sudoku Studio');
  expect(await page.locator('link[rel=icon]').getAttribute('href')).toContain('palindrome.svg');
  await page.getByRole('button', { name: 'Generate puzzle', exact: true }).click();
  await expect(page.locator('#status-text')).toContainText('Unique puzzle generated', { timeout: 60000 });
  await expect(page.getByRole('slider', { name: 'Solution step' })).toBeVisible();
  const givens = await page.locator('#cells .digit').count();
  await page.getByRole('button', { name: 'Reveal solution', exact: true }).click();
  await expect(page.locator('#cells .digit')).toHaveCount(81);
  await page.getByRole('button', { name: 'Hide solution' }).click();
  await expect(page.locator('#cells .digit')).toHaveCount(givens);
  await page.getByRole('button', { name: 'Solution walkthrough', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Solution step' });
  await expect(slider).toBeVisible();
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(page.locator('#slide-count')).toContainText('Step 2');
  await checkTallyNavigation(page);
  await page.getByRole('button', { name: 'Return to puzzle' }).click();
  await page.getByRole('button', { name: 'Generate puzzle', exact: true }).click();
  await expect(page.locator('#status-text')).toContainText('Unique puzzle generated', { timeout: 60000 });
  await expect(page.locator('#lines polyline')).toHaveCount(4);
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('keeps the grid read-only and checks imported puzzles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CREATE & EDIT')).toHaveCount(0);
  const board = await page.locator('#cells').textContent();
  await page.locator('#cells .cell').first().click();
  await page.keyboard.press('9');
  await expect(page.locator('#cells')).toHaveText(board);
  await page.locator('#page-menu summary').click(); await page.getByRole('link', { name: 'Import grid', exact: true }).click();
  await page.locator('#import-text').fill('11' + '0'.repeat(79)); await page.locator('#load').click();
  await expect(page.locator('#status-text')).toContainText('No solution');
  await page.locator('#import-text').fill('0'.repeat(81)); await page.locator('#load').click();
  await expect(page.locator('#status-text')).toContainText('Multiple solutions', { timeout: 30000 });
  await expect(page.locator('#alternative-grids .board')).toHaveCount(2);
});
test('mobile layout, technique catalogue, and cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Generate puzzle', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#status-text')).toContainText('Cancelled');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/studio-mobile.png', fullPage: true });
  await page.locator('#page-menu summary').click(); await page.getByRole('link', { name: 'Techniques', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Phistomefel Ring' })).toContainText('+200');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('highlights Swordfish evidence and eliminations in the reported puzzle', async ({ page }) => {
  await page.goto('/?page=import-grid');
  await page.getByLabel('Puzzle to import').fill('PS1|000000980073004000000020000520040009000809000900060047000050000000600490067000000|5343322131;5767788979;5262728171;5848382939');
  await page.getByRole('button', { name: 'Load and check puzzle' }).click();
  await expect(page.locator('#status-text')).toContainText('Exactly one solution.');
  await expect(page.locator('#report')).toBeHidden();
  await expect(page.locator('#import-summary')).toContainText('22 givens · 4 palindromes');
  await expect(page.locator('#import-summary')).toContainText('points');
  expect(await page.locator('#load').evaluate(button => button.nextElementSibling?.id)).toBe('import-summary');
  await page.getByRole('button', { name: 'Go to step 18: Swordfish', exact: true }).click();
  await expect(page.locator('#slide-title')).toHaveText('Swordfish');
  await expect(page.locator('#cells .step-band-primary')).toHaveCount(27);
  await expect(page.locator('#cells .step-band-secondary')).toHaveCount(27);
  expect(await page.locator('#cells .step-primary').count()).toBeGreaterThanOrEqual(6);
  expect(await page.locator('#cells .candidate-primary').count()).toBeGreaterThanOrEqual(6);
  expect(await page.locator('#cells .step-elimination .removed-candidate').count()).toBeGreaterThan(0);
  await page.locator('.board-panel').screenshot({ path: 'test-results/swordfish-highlights.png' });
  const digits = await page.locator('#cells .digit').allTextContents();
  const allCount = await page.locator('#cells .pencil > span').evaluateAll(marks => marks.filter(mark => mark.textContent).length);
  await page.getByLabel('Notation', { exact: true }).selectOption('snyder');
  const snyderCount = await page.locator('#cells .pencil > span').evaluateAll(marks => marks.filter(mark => mark.textContent).length);
  expect(snyderCount).toBeGreaterThan(0); expect(snyderCount).toBeLessThan(allCount);
  await page.getByLabel('Notation', { exact: true }).selectOption('hidden');
  await expect(page.locator('#cells .pencil')).toHaveCount(0);
  expect(await page.locator('#cells .digit').allTextContents()).toEqual(digits);
  await expect(page.locator('#slide-title')).toHaveText('Swordfish');
  await page.getByLabel('Notation', { exact: true }).selectOption('all');
  expect(await page.locator('#cells .pencil > span').evaluateAll(marks => marks.filter(mark => mark.textContent).length)).toBe(allCount);
  await page.getByRole('button', { name: 'Return to puzzle' }).click();
  await expect(page.locator('#cells [class*="step-"]')).toHaveCount(0);
  await page.getByLabel('Notation', { exact: true }).selectOption('snyder');
  await page.reload();
  await expect(page.getByLabel('Notation', { exact: true })).toHaveValue('snyder');
  expect(await page.locator('#cells .pencil > span').evaluateAll(marks => marks.filter(mark => mark.textContent).length)).toBeGreaterThan(0);
});

test('shows only successful guesses and charges each Brute force step once', async ({ page }) => {
  await page.goto('/?page=import-grid');
  await page.getByLabel('Puzzle to import').fill('PS1|000103700400000050000020000000070005000204000900060000000010000020000006004605000|3132334352;7978776758;7273636251;3837474859');
  await page.getByRole('button', { name: 'Load and check puzzle' }).click();
  await expect(page.locator('#status-text')).toContainText('Exactly one solution.');
  const count = Number((await page.locator('#slide-count').innerText()).split(' of ')[1]);
  expect(count).toBeLessThan(150);
  const guesses = page.locator('.technique-tallies tbody tr').filter({ has: page.getByRole('rowheader', { name: 'Brute force', exact: true }) }).getByRole('button');
  await expect(guesses).toHaveCount(4);
  console.log(`Reported puzzle: ${count} steps, ${await guesses.count()} Brute force guesses. ${await page.locator('#import-summary').innerText()}`);
  for (const guess of await guesses.all()) {
    await guess.click();
    await expect(page.locator('#slide-description')).toContainText('Brute force correctly guesses');
    await expect(page.locator('#slide-description')).toContainText('+10,000 difficulty points');
    await expect(page.locator('#cells .step-placement')).toHaveCount(1);
  }
  await expect(page.locator('.tally-note')).toContainText('Failed trials are omitted');
  await page.locator('#slide-range').fill(String(count - 1));
  await expect(page.locator('#slide-title')).toHaveText('Puzzle complete');
  await expect(page.locator('#cells .digit')).toHaveCount(81);
});

test('keeps page URLs free of fragments', async ({ page }) => {
  await page.goto('/?page=simulation#sim-results');
  await expect(page).toHaveURL(/\?page=simulation$/);
  await expect(page.locator('#simulation')).toBeVisible();
  await page.evaluate(() => { location.hash = 'sim-chart'; });
  await expect(page).toHaveURL(/\?page=simulation$/);
  await page.locator('#page-menu summary').click();
  await page.getByRole('link', { name: 'Generate', exact: true }).click();
  await expect(page).toHaveURL(/\?page=generate$/);
  await page.goBack();
  await expect(page).toHaveURL(/\?page=simulation$/);
});

test('remembers independent Generate and Simulation options after refresh', async ({ page }) => {
  await page.goto('/?page=generate');
  const generate = page.locator('#generation');
  await generate.getByLabel('Palindrome line lengths (comma-separated)').fill('7, 7');
  for (const checkbox of await generate.getByRole('checkbox').all()) await checkbox.uncheck();
  await page.reload();
  await expect(generate.getByLabel('Palindrome line lengths (comma-separated)')).toHaveValue('7, 7');
  for (const checkbox of await generate.getByRole('checkbox').all()) await expect(checkbox).not.toBeChecked();

  await page.goto('/?page=simulation');
  const simulation = page.locator('#simulation');
  await expect(simulation.getByLabel('Palindrome line lengths (comma-separated)')).toHaveValue('5, 5, 5, 5');
  await simulation.getByLabel('Palindrome line lengths (comma-separated)').fill('3, 3');
  for (const checkbox of await simulation.getByRole('checkbox').all()) await checkbox.uncheck();
  await simulation.getByLabel('Total trials').selectOption('100');
  await simulation.getByLabel('Minimum difficulty').selectOption('2000');
  await page.reload();
  await expect(simulation.getByLabel('Palindrome line lengths (comma-separated)')).toHaveValue('3, 3');
  for (const checkbox of await simulation.getByRole('checkbox').all()) await expect(checkbox).not.toBeChecked();
  await expect(simulation.getByLabel('Total trials')).toHaveValue('100');
  await expect(simulation.getByLabel('Minimum difficulty')).toHaveValue('2000');
  await expect(page.locator('#sim-status')).toHaveText('Ready.');
  await page.goto('/?page=generate');
  await expect(generate.getByLabel('Palindrome line lengths (comma-separated)')).toHaveValue('7, 7');
  for (const checkbox of await generate.getByRole('checkbox').all()) await expect(checkbox).not.toBeChecked();
});

test('blank lengths generate random puzzles and vary across simulation trials', async ({ page }) => {
  await page.goto('/?page=generate');
  await page.locator('#line-lengths').fill('   ');
  await page.getByRole('button', { name: 'Generate puzzle', exact: true }).click();
  await expect(page.locator('#status-text')).toContainText('Unique puzzle generated', { timeout: 60000 });
  expect(await page.locator('#lines polyline').count()).toBeGreaterThan(0);
  await page.goto('/?page=simulation');
  await page.locator('#sim-line-lengths').fill('');
  await page.reload();
  await expect(page.locator('#sim-line-lengths')).toHaveValue('');
  await page.getByLabel('Total trials').selectOption('10');
  await page.getByLabel('Minimum difficulty').selectOption('0');
  await page.getByRole('button', { name: 'Start simulation' }).click();
  await expect(page.locator('#sim-status')).toHaveText('Simulation complete.', { timeout: 60000 });
  await expect(page.locator('#sim-results > article')).toHaveCount(10);
  const lengths = await page.locator('#sim-results p').filter({ hasText: 'Palindrome lengths:' }).allTextContents();
  expect(new Set(lengths).size).toBeGreaterThan(1);
  await expect(page.locator('#sim-line-lengths')).toHaveValue('');
});

test('runs a simulation trial and opens its walkthrough', async ({ page }) => {
  await page.goto('/?page=simulation');
  const simulation = page.locator('#simulation');
  await expect(simulation.getByLabel('Minimum difficulty')).toHaveValue('1000');
  await simulation.getByLabel('Minimum difficulty').selectOption('0');
  await simulation.getByLabel('Palindrome line lengths (comma-separated)').fill('3, 3');
  await expect(simulation.getByLabel('Rotationally symmetric lines')).toBeChecked();
  await expect(simulation.getByLabel('Rotationally symmetric givens')).toBeChecked();
  await expect(simulation.getByLabel('Leave palindrome cells empty')).toBeChecked();
  await expect(simulation.getByLabel('Logical techniques only')).toBeChecked();
  await page.getByLabel('Total trials').selectOption('10');
  await page.getByRole('button', { name: 'Start simulation' }).click();
  await expect(simulation.getByLabel('Palindrome line lengths (comma-separated)')).toBeDisabled();
  await expect(page.locator('#sim-status')).toHaveText('Simulation complete.', { timeout: 60000 });
  await expect(page.locator('#sim-counts')).toContainText('10 completed');
  await expect(page.locator('#sim-results .board')).toHaveCount(10);
  await expect(page.locator('#sim-results .line-overlay polyline')).toHaveCount(20);
  const cards = page.locator('#sim-results > article');
  const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
  expect(first!.y).toBe(second!.y);
  expect(second!.x).toBeGreaterThan(first!.x);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileFirst = await cards.nth(0).boundingBox(), mobileSecond = await cards.nth(1).boundingBox();
  expect(mobileSecond!.y).toBeGreaterThan(mobileFirst!.y);
  await page.getByRole('button', { name: 'View walkthrough' }).first().click();
  await expect(page.locator('#page-menu summary')).toHaveText('Generate');
  await expect(page.getByRole('slider', { name: 'Solution step' })).toBeVisible();
  await checkTallyNavigation(page);
});
