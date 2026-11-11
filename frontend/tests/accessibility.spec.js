
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['Dashboard', 'Study Library', 'Quiz Center'];

test('CSQ-NF-ACCESSIBILITY: WCAG 2.1 AA accessibility scan', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await expect(page.locator('.main-area h1')).toHaveText('Dashboard');

  const results = [];

  for (const name of PAGES) {
    if (name !== 'Dashboard') {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.main-area h1')).toHaveText(name);
    }
    if (name === 'Study Library') {
      console.log('RESULT COUNT:', await page.locator('.result-count').first().evaluate(el => ({
        color: getComputedStyle(el).color,
        background: getComputedStyle(el).backgroundColor
      })));
    
      console.log('MATERIAL META:', await page.locator('.material-meta span').first().evaluate(el => ({
        color: getComputedStyle(el).color,
        background: getComputedStyle(el).backgroundColor
      })));
    
      console.log('MATERIAL DESCRIPTION:', await page.locator('.material-card p').first().evaluate(el => ({
        color: getComputedStyle(el).color,
        background: getComputedStyle(el).backgroundColor
      })));
      for (const name of PAGES) {
        if (name !== 'Dashboard') {
          await page.getByRole('button', { name, exact: true }).click();
          await expect(page.locator('.main-area h1')).toHaveText(name);
        }
      
        // ADD THE DEBUGGING CODE HERE
        if (name === 'Quiz Center') {
          for (const selector of [
            '.quiz-card h3',
            '.quiz-card p',
            '.quiz-info span',
            '.quiz-card .pill',
            '.wide-btn'
          ]) {
            const element = page.locator(selector).first();
      
            if (await element.count()) {
              console.log(selector, await element.evaluate(el => ({
                color: getComputedStyle(el).color,
                background: getComputedStyle(el).backgroundColor
              })));
            }
          }
        }
      
        // EXISTING ACCESSIBILITY SCAN
        const accessibilityScan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
      
        // Keep the rest of your existing code unchanged
      }
    }

    const accessibilityScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    results.push({
      page: name,
      violations: accessibilityScan.violations.length,
    });

    if (accessibilityScan.violations.length > 0) {
      console.log(`Accessibility violations on ${name}:`);

      for (const violation of accessibilityScan.violations) {
        console.log({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          elements: violation.nodes.map(node => node.target),
        });
      }
    }

    expect(
      accessibilityScan.violations,
      `WCAG violations found on ${name}`
    ).toEqual([]);
  }

  console.table(results);
});
