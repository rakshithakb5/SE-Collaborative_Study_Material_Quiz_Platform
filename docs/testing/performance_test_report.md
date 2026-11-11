# Backend Performance Test Report

**Test ID:** CSQ-NF-PERF-001  
**Tool:** Artillery  
**Target:** Local StudySpace backend (`localhost:5001`)  
**Scenario:** Authenticated quiz attempt creation and submission  
**Result:** PASS

## Test Configuration

| Load phase | Arrival rate | Duration |
|---|---:|---:|
| Phase 1 | 10 users/sec | 30 seconds |
| Phase 2 | 25 users/sec | 30 seconds |
| Phase 3 | 50 users/sec | 30 seconds |

## Execution Results

| Metric | Result |
|---|---:|
| Virtual users created | 2,550 |
| Virtual users completed | 2,550 |
| Failed virtual users | 0 |
| Total HTTP requests | 5,100 |
| HTTP 201 responses | 2,550 |
| HTTP 200 responses | 2,550 |
| HTTP errors | 0 |
| Request rate | 60 requests/sec |
| Mean response time | 1 ms |
| Median response time | 0 ms |
| p95 response time | 2 ms |
| p99 response time | 8.9 ms |
| Maximum response time | 172 ms |

## Conclusion

The authenticated quiz-attempt creation and submission scenario completed successfully under the configured load. All 2,550 virtual users completed both requests, with no failed virtual users or HTTP errors.

**Limitation:** This test was conducted against a local backend. Results do not establish production-scale capacity or performance under distributed deployment conditions.