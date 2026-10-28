
# CSQ-NF-001 — Performance Testing

## Requirement
Optimise Dashboard, Study Library, and Quiz Center performance.

- Test case: TC-Perf-01
- Acceptance threshold: p95 latency <= 3,000 ms
- Test tool: Playwright
- Runs per page: 20

## Measured Results

| Page | Runs | p95 Navigation Latency | Threshold | Result |
|---|---:|---:|---:|---|
| Dashboard | 20 | 9 ms | 3,000 ms | PASS |
| Study Library | 20 | 71 ms | 3,000 ms | PASS |
| Quiz Center | 20 | 10 ms | 3,000 ms | PASS |

## Measurement Method
Playwright measures elapsed time from the navigation button's click event until the target view is rendered. The p95 is calculated from 20 measurements per page.

## Limitation
These results measure client-side navigation and rendering latency in the local development environment. They do not establish full cold page-load time or production performance.

## Status
All three pages meet the 3,000 ms threshold for the measured navigation-latency metric. Full page-load and production performance have not been independently verified.
