# CSQ-NF-003 — Quiz Attempt Load Testing

## Requirement

Load-test the quiz attempt flow at scale and document the results.

**Test case:** TC-Perf-02  
**Priority:** High  
**Dependency:** CSQ-F-030

## Test Configuration

- **Tool:** Artillery
- **Flow:** Start a quiz attempt and submit answers.
- **Target:** Local backend at `http://localhost:5001`
- **Concurrent test:** 5,000 virtual users targeted by the concurrent-attempts test.

## Results

| Metric | Observed result |
|---|---:|
| Lifecycle test requests | 5,100 |
| Successful attempt starts | 2,550 |
| Successful submissions | 2,550 |
| Failed virtual users | 0 |
| Lifecycle test p95 response time | 1 ms |
| Lifecycle test p99 response time | 3 ms |
| Concurrent test virtual users completed | 5,000 |
| Concurrent test VU failures | 0 |

## Conclusion and Limitation

The load tests completed without failed virtual users, and the quiz attempt start-and-submit flow returned successful responses.

The results demonstrate successful completion by 5,000 virtual users in the concurrent test. They do not independently establish that all 5,000 users were actively executing requests at precisely the same instant. Therefore, strict simultaneous concurrency should be treated as not yet independently verified.

**Status:** Load-test execution passed; strict 5,000-simultaneous-user acceptance remains subject to verification.
