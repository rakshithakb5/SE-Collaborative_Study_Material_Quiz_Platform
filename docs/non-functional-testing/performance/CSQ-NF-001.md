# CSQ-NF-001: Page Navigation Performance Test

## Objective
Verify that Dashboard, Study Library and Quiz Center navigation
has a 95th-percentile rendering time below 3 seconds.

## Test Configuration
- Tool: Playwright
- Browser: Chromium
- Runs per page: 20
- Total measurements: 60
- Threshold: 3000 ms
- Measurement: Time from navigation click to target page heading becoming visible.

## Results

| Page | Runs | p95 (ms) | Threshold (ms) | Result |
|---|---:|---:|---:|---|
| Dashboard | 20 | 15 | 3000 | PASS |
| Study Library | 20 | 67 | 3000 | PASS |
| Quiz Center | 20 | 57 | 3000 | PASS |

## Conclusion
All three pages passed the navigation performance requirement.
The highest measured p95 was 67 ms for Study Library.

Note: This test measures client-side navigation and rendering,
not complete initial page-load performance.
