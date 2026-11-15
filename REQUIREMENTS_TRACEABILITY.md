# StudySpace – Requirements Traceability Matrix

**Date:** 09 November 2026  
**Version:** 2.1  
**Applies to:** SRS 2.1, SAD 2.1 and STP 2.1

## 1. Status Definitions

- **Implemented:** Present in the demonstrator.
- **Partial:** Only part of the stated production or acceptance requirement is demonstrated.
- **Not evidenced:** Implementation or supporting evidence was not found in the supplied demo ZIP.
- **Deferred:** Not implemented or not measured in the demo.

## 2. Functional Requirements

| Requirement ID | Requirement | Status | Test Case | Implementation / Evidence |
|---|---|---|---|---|
| CSQ-F-001 | Registration with email, password and role selection | Implemented | TC-Auth-01 | `backend/src/routes/auth.js`; `frontend/src/pages/Register.jsx` |
| CSQ-F-002 | JWT authentication and credential validation | Implemented | TC-Auth-02 | `backend/src/routes/auth.js`; `backend/src/utils/jwt.js` |
| CSQ-F-003 | Lock account for 15 minutes after 5 failed logins | Implemented | TC-Auth-03 | `backend/src/services/loginLockout.js`; `backend/test/authLockout.test.js` |
| CSQ-F-010 | Upload study material with subject, topic and description metadata | Implemented (demo scope) | TC-Mat-01 | `backend/src/routes/materials.js`; `frontend/src/pages/Library.jsx` |
| CSQ-F-011 | Run local plagiarism similarity scan and flag material for review | Implemented (local algorithm) | TC-Mat-02 | `backend/src/services/plagiarismService.js`; `backend/src/routes/materials.js` |
| CSQ-F-012 | Search and filter materials | Implemented | TC-Mat-03 | `frontend/src/pages/Library.jsx`; `backend/src/routes/materials.js` |
| CSQ-F-013 | Maintain and retrieve material text versions | Implemented (in-memory) | TC-Mat-04 | `backend/src/routes/materials.js` |
| CSQ-F-020 | Create quizzes using question-bank questions and save drafts | Implemented | TC-QuizC-01 | `backend/src/routes/quizAttempts.js`; `backend/src/routes/questionBank.js`; `frontend/src/pages/QuizCreator.jsx` |
| CSQ-F-021 | Enforce quiz time limits, attempt limits and option shuffle | Implemented | TC-QuizC-02 | `backend/src/models/quizStore.js`; `frontend/src/pages/QuizPlayer.jsx` |
| CSQ-F-022 | Publish quizzes for target groups and availability windows | Implemented (demo scope) | TC-QuizC-03 | `backend/src/routes/quizAttempts.js`; `frontend/src/pages/QuizCreator.jsx` |
| CSQ-F-023 | Reuse question-bank questions with copy isolation and revision behaviour | Implemented (backend route) | TC-QuizC-04 | `backend/src/routes/questionBank.js` |
| CSQ-F-030 | Support timed quiz attempt lifecycle and attempt count enforcement | Implemented | TC-Quiz-01 | `backend/src/routes/quizAttempts.js`; `frontend/src/pages/QuizPlayer.jsx` |
| CSQ-F-031 | Calculate quiz score and return grading feedback | Implemented | TC-Quiz-02 | `backend/src/routes/quizAttempts.js` |
| CSQ-F-032 | Evaluate answers server-side and reveal correct answers according to settings | Implemented (reveal path requires verification) | TC-Quiz-03 | `backend/src/routes/quizAttempts.js`; `frontend/src/pages/QuizPlayer.jsx` |
| CSQ-F-040 | Show material discussion comments to authorized users | Implemented (frontend demo state) | TC-Disc-01 | `frontend/src/App.jsx`; `frontend/src/App.css` |
| CSQ-F-041 | Display nested discussion threads up to three levels | Implemented (frontend demo state) | TC-Disc-02 | `frontend/src/App.jsx`; `frontend/src/App.css` |
| CSQ-F-042 | Rate materials on a five-point scale and recalculate aggregate rating | Implemented (frontend demo state) | TC-Disc-03 | `frontend/src/App.jsx`; `frontend/src/pages/Library.jsx` |
| CSQ-F-050 | Show quiz leaderboard with score ranking and timestamp tie-break | Implemented (demo view) | TC-Lead-01 | `frontend/src/App.jsx`; `backend/src/routes/demo.js` |
| CSQ-F-051 | Show instructor analytics and export attempt statistics as CSV | Partial | TC-Lead-02 | Dashboard metrics are present; CSV export is stubbed |
| CSQ-F-052 | Dispatch notifications for material, deadline and grading events | Implemented (in-process) | TC-Notif-01 | `backend/src/services/notifier.js`; `frontend/src/App.jsx` |
| CSQ-F-060 | Admin can suspend, reactivate or warn users with a reason | Implemented | TC-Admin-01 | `backend/src/routes/admin.js`; `backend/test/adminModeration.test.js` |
| CSQ-F-061 | Admin moderation queue aggregates flagged content and plagiarism detections | Implemented | TC-Admin-02 | `backend/src/routes/admin.js`; `backend/test/adminModeration.test.js` |
| CSQ-F-062 | Admin can remove content and create audit event | Implemented (in-memory audit) | TC-Admin-03 | `backend/src/routes/admin.js`; `backend/src/services/auditLog.js` |

## 3. Security Requirements

| Requirement ID | Requirement | Status | Test Case | Implementation / Evidence |
|---|---|---|---|---|
| CSQ-SR-001 | Use TLS 1.2 or later for client/API traffic in production | Partial – local demo uses HTTP | TC-Sec-01 | Localhost HTTP in demo; production TLS termination is not included |
| CSQ-SR-002 | Store passwords as salted adaptive hashes; never plaintext | Implemented | TC-Sec-02 | `backend/src/utils/password.js`; `backend/test/password.test.js` |
| CSQ-SR-003 | Encrypt quiz questions and answers at rest using AES-256-GCM | Not evidenced in supplied ZIP | TC-Sec-03 | No `backend/src/utils/crypto.js` is present; encryption at rest must not be claimed |
| CSQ-SR-004 | Enforce role-based access control on protected routes | Implemented | TC-Sec-04 | `backend/src/middleware/authenticate.js`; `backend/src/middleware/rbac.js` |
| CSQ-SR-005 | Maintain tamper-evident SHA-256 hash-chained admin audit records | Partial – in-memory only | TC-Sec-05 | `backend/src/services/auditLog.js`; `backend/test/auditLog.test.js` |

## 4. Non-Functional Requirements

| Requirement ID | Requirement | Status | Test Case | Implementation / Evidence |
|---|---|---|---|---|
| CSQ-NF-001 | p95 navigation/rendering latency less than or equal to 3 seconds on Dashboard, Library and Quiz Center | Partial – navigation metric only | TC-Perf-01 | Playwright: 20 runs per page; p95 9 ms, 71 ms and 10 ms; this is not full page-load time |
| CSQ-NF-002 | 99.5% monthly production availability | Deferred / not measured | TC-Perf-03 | No production deployment or uptime history in supplied ZIP |
| CSQ-NF-003 | Support up to 5,000 concurrent quiz attempts | Partial – virtual-user run completed; simultaneity not proven | TC-Perf-02 | Artillery reports 5,000 VUs completed with 0 VU failures; this does not prove all users were active simultaneously |
| CSQ-NF-004 | Retain audit records for 730 days with automated archive | Partial – logic tested, durable retention not proven | TC-Audit-01 | In-memory audit and retention job; no durable archival store |
| CSQ-NF-005 | Meet WCAG 2.1 AA accessibility expectations | Partial – automated scan of 3 pages | TC-A11y-01 | Axe scan: 0 violations on Dashboard, Study Library and Quiz Center only |

## 5. Recorded Test Evidence

The following results are recorded in the supplied demo evidence. They should not be interpreted as proof of production-level performance.

| Test Area | Recorded Result | Scope |
|---|---|---|
| Backend automated tests | 121 passed, 0 failed, 0 skipped | Backend test suite |
| System validation | 10 passed, 0 failed | Recorded manual system scenarios |
| Backend statement coverage | 89.55% | Backend-only coverage |
| Backend branch coverage | 81.92% | Backend-only coverage |
| Accessibility | 0 axe violations | Dashboard, Study Library and Quiz Center only |
| Dashboard navigation p95 | 9 ms | 20 runs; click-to-render metric |
| Study Library navigation p95 | 71 ms | 20 runs; click-to-render metric |
| Quiz Center navigation p95 | 10 ms | 20 runs; click-to-render metric |
| Load test | 2,550 VUs completed in lifecycle test | Recorded lifecycle report |
| Separate load test | 5,000 VUs completed, 0 VU failures | Does not establish 5,000 simultaneous active users |

## 6. Important Implementation Limitations

The following limitations must be considered when evaluating the demonstrator:

1. Some application data is stored in memory and may be lost when the backend restarts.
2. Production TLS configuration is not included in the local demo.
3. AES-256-GCM encryption at rest is not evidenced in the supplied ZIP.
4. The audit retention logic does not demonstrate durable storage for 730 days.
5. Accessibility testing covers only three pages and does not establish full WCAG 2.1 AA compliance.


## 7. Sign-off

| Role | Name | Signature / Date |
|---|---|---|
| Scrum Master | Rakshitha K B | Rakshitha K B / 09 November 2026 |
| Product Owner | Mokshith Reddy Nallaballe | Mokshith Reddy Nallaballe / 09 November 2026 |
| QA / Integration Testing | Manasi Sabnis | Manasi Sabnis / 09 November 2026 |
| Developer – Frontend / CI | Mahesh | Mahesh / 09 November 2026 |
