# Backend Code Coverage and Branch Coverage Report

## 1. Objective
To measure the extent to which automated backend tests execute application source code and decision branches.

## 2. Testing Environment
- Project: StudySpace
- Testing framework: Node.js built-in test runner
- Coverage tool: c8
- Source directory: backend/src
- Total automated tests: 121

## 3. Execution Results

| Metric | Result |
|---|---:|
| Total tests | 121 |
| Passed | 121 |
| Failed | 0 |
| Statement coverage | 89.55% |
| Branch coverage | 81.92% |
| Function coverage | 93.54% |
| Line coverage | 89.55% |

## 4. Coverage Observations

The backend achieved 89.55% statement coverage and 81.92% branch coverage.

Areas with comparatively lower coverage include:
- questionBank.js
- app.js
- quizAttempts.js
- retentionJob.js

These areas represent opportunities for additional test cases.

## 5. Evidence
The detailed HTML and LCOV reports are available in:
backend-coverage/

## 6. Conclusion
All 121 backend automated tests passed during this coverage run.
The measured coverage results provide evidence of backend test execution.
Coverage percentages do not independently establish defect-free software.
