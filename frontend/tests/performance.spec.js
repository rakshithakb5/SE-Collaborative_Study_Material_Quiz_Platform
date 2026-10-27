
import { test, expect } from '@playwright/test';

const PAGE_NAMES = ['Dashboard', 'Study Library', 'Quiz Center'];
const RUNS = 20;
const THRESHOLD_MS = 3000;

test('CSQ-NF-001: measure p95 for each StudySpace page', async ({ browser }) => {
  const results = {};

  for (const name of PAGE_NAMES) {
    results[name] = [];

    for (let i = 0; i < RUNS; i++) {
      const page = await browser.newPage();

      try {
        await page.goto('http://localhost:5173', { waitUntil: 'load' });
        await expect(page.locator('.main-area h1')).toHaveText('Dashboard');

        // Start from a different view for every measurement.
        if (name === 'Dashboard') {
          await page.getByRole('button', { name: 'Study Library', exact: true }).click();
          await expect(page.locator('.main-area h1')).toHaveText('Study Library');
        }

        await page.evaluate(() => {
          window.__pageTestStart = null;
        });

        const button = page.getByRole('button', { name, exact: true });

        // Record the start time at the actual click event.
        await button.evaluate((element) => {
          element.addEventListener(
            'click',
            () => {
              window.__pageTestStart = performance.now();
            },
            { once: true, capture: true }
          );
        });

        // Trigger navigation.
        await button.click();

        // Wait for the target view to render.
        await expect(page.locator('.main-area h1')).toHaveText(name);

        if (name === 'Quiz Center') {
          await expect(page.getByText('Interactive Quiz Player')).toBeVisible();
        }

        const duration = await page.evaluate(() => {
          if (window.__pageTestStart == null) {
            throw new Error('Navigation start time was not recorded');
          }

          return performance.now() - window.__pageTestStart;
        });

        results[name].push(Math.round(duration));
      } finally {
        await page.close();
      }
    }
  }

  const summary = Object.entries(results).map(([page, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];

    return {
      page,
      runs: values.length,
      p95_ms: p95,
      threshold_ms: THRESHOLD_MS,
      result: p95 <= THRESHOLD_MS ? 'PASS' : 'FAIL',
    };
  });

  console.table(summary);
  console.log('Raw measurements:', JSON.stringify(results));

  expect(summary.every((row) => row.p95_ms <= THRESHOLD_MS)).toBe(true);
});
