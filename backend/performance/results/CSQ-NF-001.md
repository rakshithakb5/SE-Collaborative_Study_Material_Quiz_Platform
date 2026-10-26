# CSQ-NF-001 — Performance Testing

## Requirement
Optimise dashboard, library and quiz player load times and run a load test.

**Test case:** TC-Perf-01  
**Acceptance criterion:** p95 load time ≤ 3 seconds.

## Measured Results

| Metric | Result |
|---|---:|
| Backend quiz-attempt API p95 response time | 1 ms |
| Required threshold | 3,000 ms |
| Dashboard page-load time | Not measured |
| Library page-load time | Not measured |
| Quiz player page-load time | Not measured |

## Limitation

The existing Artillery test measures backend quiz-attempt API responses. The current frontend `src/App.jsx` contains the default Vite starter page rather than the required dashboard, library and quiz player. Therefore, the frontend page-load acceptance criterion cannot yet be verified.

## Status
Partially verified. Backend API latency meets the numerical threshold, but frontend page-load measurements and optimisation remain outstanding.
