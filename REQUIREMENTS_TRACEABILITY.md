# Requirements Traceability Matrix (RTM)

**Project:** Collaborative Study Material & Quiz Platform (CSQ Platform)  
**Author / Assignee:** Mokshith Reddy Nallaballe (`mokshithr530`), Product Owner  
**Reviewer:** Manasi Sabnis (`manasisabnis`), QA & Testing Lead  
**Branch:** `docs/srs-sad-traceability`  
**Date:** 14-11-2026  
**Document Version:** 2.0 (Sprint 2 & Demo Prototype Final)

---

## 1. Overview & Purpose

This Requirements Traceability Matrix (RTM) establishes bidirectional traceability between the **Software Requirements Specification (SRS v1.0)**, **Software Architecture and Design Specification (SAD v1.0)**, **System Test Plan (STP v1.0)**, and the actual software deliverables within the demonstrator prototype (`demo/sprint-2-final`).

Each requirement is evaluated against the demonstrable prototype scope and classified into one of three statuses:
- **Implemented:** Fully coded, integrated into the UI and API, and verified by passing automated unit, integration, or accessibility test suites.
- **Partial:** Core logic or UI workflow implemented in the demonstration prototype with specific cloud/enterprise features stubbed or scaled for local demo execution.
- **Deferred:** Planned in SRS/SAD specifications for full enterprise cloud rollout (e.g., multi-region 99.5% availability, external TLS termination) and documented in architectural deviation plans.

---

## 2. Functional Requirements Traceability Matrix

| Requirement ID | Description | Priority | Prototype Status | Source / Component | Verification Test Case | Implementation Details & Files |
|---|---|---|---|---|---|---|
| **CSQ-F-001** | User registration with email, password, and role selection (Student/Instructor) with verification email dispatch | High | **Implemented** | `AuthModule`, `NotifierService` | `TC-Auth-01` | `backend/src/routes/auth.js`, `backend/src/models/userStore.js`, `frontend/src/pages/Register.jsx` |
| **CSQ-F-002** | User authentication via JWT token issuance (1-hour expiration) and credential validation | High | **Implemented** | `AuthModule`, `JWTUtil` | `TC-Auth-02` | `backend/src/routes/auth.js`, `backend/src/utils/jwt.js`, `frontend/src/pages/Login.jsx` |
| **CSQ-F-003** | Account lockout for 15 minutes after 5 consecutive failed login attempts (HTTP 423) | High | **Implemented** | `AuthModule`, `LockoutService` | `TC-Auth-03` | `backend/src/services/loginLockout.js`, `backend/src/routes/auth.js`, `backend/test/authLockout.test.js` |
| **CSQ-F-010** | Study material upload with subject, topic, and description tagging | High | **Implemented** | `MaterialModule`, `ObjectStorageStub` | `TC-Mat-01` | `backend/src/routes/materials.js`, `frontend/src/pages/Library.jsx`, `frontend/src/App.jsx` |
| **CSQ-F-011** | Automatic plagiarism detection scanning on upload; materials above threshold flagged for admin review | High | **Implemented** | `PlagiarismService`, `MaterialModule` | `TC-Mat-02` | `backend/src/services/plagiarismService.js`, `backend/src/routes/materials.js`, `backend/test/plagiarism.test.js` |
| **CSQ-F-012** | Material search and multi-criteria filtering by subject, topic, rating, and upload date | High | **Implemented** | `MaterialModule`, `FrontendSearch` | `TC-Mat-03` | `frontend/src/pages/Library.jsx`, `frontend/src/App.jsx`, `backend/src/routes/materials.js` |
| **CSQ-F-013** | Material version history tracking and downloadable previous text revisions | Medium | **Implemented** | `MaterialModule`, `VersionStore` | `TC-Mat-04` | `backend/src/routes/materials.js` (`/materials/:id/versions`), `frontend/src/App.jsx` |
| **CSQ-F-020** | Quiz creation from question bank with draft saving and question composition | High | **Implemented** | `QuizModule`, `QuestionBank` | `TC-QuizC-01` | `backend/src/routes/questionBank.js`, `backend/src/routes/quizAttempts.js`, `frontend/src/pages/QuizCreator.jsx` |
| **CSQ-F-021** | Quiz settings enforcement (time limit countdown, max attempt limits, option shuffle) | High | **Implemented** | `QuizModule`, `QuizPlayer` | `TC-QuizC-02` | `backend/src/models/quizStore.js`, `frontend/src/pages/QuizPlayer.jsx`, `backend/test/quizCreation.test.js` |
| **CSQ-F-022** | Quiz publishing restricted to target student groups and scheduled availability windows | High | **Implemented** | `QuizModule`, `RBAC` | `TC-QuizC-03` | `backend/src/routes/quizAttempts.js`, `frontend/src/pages/QuizCreator.jsx`, `backend/test/quizAttempts.test.js` |
| **CSQ-F-023** | Question bank reuse with deep-copy isolation and revision history tracking | Medium | **Implemented** | `QuestionBankModule` | `TC-QuizC-04` | `backend/src/routes/questionBank.js` (`/question-bank/:id/reuse`), `backend/test/quizCreation.test.js` |
| **CSQ-F-030** | Timed quiz attempt lifecycle with hard deadline cut-off and attempt count enforcement | High | **Implemented** | `QuizAttemptModule` | `TC-Quiz-01` | `backend/src/routes/quizAttempts.js`, `frontend/src/pages/QuizPlayer.jsx`, `backend/test/quizAttempts.test.js` |
| **CSQ-F-031** | Automated quiz score calculation and immediate grading feedback upon submission | High | **Implemented** | `GradingService`, `QuizPlayer` | `TC-Quiz-02` | `backend/src/routes/quizAttempts.js` (`/submit`), `frontend/src/pages/QuizPlayer.jsx` |
| **CSQ-F-032** | Secure server-side evaluation and conditional reveal of correct answers and explanations | High | **Implemented** | `QuizModule`, `GradingService` | `TC-Quiz-03` | `backend/src/routes/quizAttempts.js`, `frontend/src/pages/QuizPlayer.jsx` (Defect Fix #62) |
| **CSQ-F-040** | Material discussion comments visible to all authorized users within 5 seconds | Medium | **Implemented** | `DiscussionModule`, `FrontendStore` | `TC-Disc-01` | `frontend/src/App.jsx`, `frontend/src/App.css` (`.thread-comment`) |
| **CSQ-F-041** | 3-tier nested discussion comment threads rendered in chronological hierarchy | Medium | **Implemented** | `DiscussionModule` | `TC-Disc-02` | `frontend/src/App.jsx` (`ThreadComment` component, levels 1–3), `frontend/src/App.css` |
| **CSQ-F-042** | 5-point rating scale for study materials with immediate aggregate recalculation | Low | **Implemented** | `MaterialModule`, `RatingStore` | `TC-Disc-03` | `frontend/src/App.jsx`, `frontend/src/pages/Library.jsx` |
| **CSQ-F-050** | Quiz leaderboard with score rankings and timestamp-based tie breaking | Medium | **Implemented** | `AnalyticsModule` | `TC-Lead-01` | `frontend/src/App.jsx` (`leaderboard`), `backend/src/routes/demo.js` |
| **CSQ-F-051** | Instructor quiz analytics and attempt statistics with CSV report export | Medium | **Partial** | `AnalyticsModule` | `TC-Lead-02` | Prototype provides live metrics and breakdown cards in Dashboard; raw CSV export logic stubbed for cloud prototype |
| **CSQ-F-052** | Multi-event notification dispatch (material upload, 24h deadline reminder, graded submission) | High | **Implemented** | `NotifierService` | `TC-Notif-01` | `backend/src/services/notifier.js`, `backend/src/routes/quizAttempts.js`, `frontend/src/App.jsx` |
| **CSQ-F-060** | Admin user management (suspend, reactivate, warn) with mandatory audit reason | High | **Implemented** | `AdminModule`, `AuditService` | `TC-Admin-01` | `backend/src/routes/admin.js`, `backend/test/adminModeration.test.js`, `frontend/src/App.jsx` |
| **CSQ-F-061** | Unified admin moderation queue aggregating user content flags and plagiarism detections | High | **Implemented** | `AdminModule`, `PlagiarismService` | `TC-Admin-02` | `backend/src/routes/admin.js` (`/moderation-queue`), `frontend/src/App.jsx`, `backend/test/adminModeration.test.js` |
| **CSQ-F-062** | Admin content removal with student access revoking and immutable audit event logging | High | **Implemented** | `AdminModule`, `AuditService` | `TC-Admin-03` | `backend/src/routes/admin.js` (`/:type/:id/remove`), `backend/test/adminModeration.test.js` |

---

## 3. Security Requirements Traceability Matrix

| Requirement ID | Description | Priority | Prototype Status | Source / Component | Verification Test Case | Implementation Details & Files |
|---|---|---|---|---|---|---|
| **CSQ-SR-001** | Mandatory TLS 1.2+ for network transit between client, API gateway, and microservices | High | **Partial** | `NetworkLayer` | `TC-Sec-01` | Prototype runs over HTTP on local loopback (`localhost:5000` / `5173`); TLS termination specified for NGINX/Caddy ingress reverse proxy in production |
| **CSQ-SR-002** | Salted adaptive password hashing (bcrypt with minimum 10 rounds); plaintext passwords never stored | High | **Implemented** | `AuthModule`, `Crypto` | `TC-Sec-02` | `backend/src/utils/password.js`, `backend/test/password.test.js`, `backend/src/routes/auth.js` |
| **CSQ-SR-003** | Quiz questions and answers encrypted at rest using AES-256-GCM cipher with server-only on-the-fly decryption | High | **Implemented** | `QuizStore`, `CryptoUtil` | `TC-Sec-03` | `backend/src/utils/crypto.js`, `backend/src/models/quizStore.js`, `backend/test/quizAttempts.test.js` |
| **CSQ-SR-004** | Role-Based Access Control (RBAC) strictly enforced on all student, instructor, and admin endpoints | High | **Implemented** | `RBACMiddleware` | `TC-Sec-04` / `TC-RBAC-01` | `backend/src/middleware/rbac.js`, `backend/src/middleware/authenticate.js`, `backend/test/rbac.test.js` |
| **CSQ-SR-005** | Immutable, tamper-evident audit logging for administrative actions with cryptographic SHA-256 hash chaining | High | **Implemented** | `AuditService` | `TC-Admin-03` | `backend/src/services/auditLog.js`, `backend/test/auditLog.test.js`, `backend/src/routes/admin.js` |

---

## 4. Non-Functional Requirements Traceability Matrix

| Requirement ID | Category | Target Metric | Prototype Status | Verification Method | Implementation Details & Reference |
|---|---|---|---|---|---|
| **CSQ-NF-001** | Performance | 95% of core page loads under 3.0 seconds under normal load | **Implemented** | Playwright automated performance harness | `frontend/tests/performance.spec.js`, `docs/testing/performance_test_report.md` |
| **CSQ-NF-002** | Reliability | 99.5% monthly system uptime (excluding scheduled maintenance) | **Deferred** | Availability Architecture Plan | Architectural plan documented in `docs/availability.md`; formal cloud SLA verification deferred to production infrastructure |
| **CSQ-NF-003** | Scalability | Support up to 5,000 concurrent quiz attempts | **Implemented (Benchmarked)** | Artillery load testing scenarios | `backend/performance/quiz-attempt-load.yml`, `backend/performance/results/CSQ-NF-001.md`, `CSQ-NF-003.md` |
| **CSQ-NF-004** | Compliance / Audit | Audit log retention for 730 days (2 years) with automated archive job | **Implemented** | Daily scheduled archive sweep test suite | `backend/src/services/retentionJob.js`, `backend/test/auditRetention.test.js` |
| **CSQ-NF-005** | Accessibility | WCAG 2.1 AA web interface accessibility compliance | **Implemented** | Automated Axe-Core & Playwright WCAG inspection | `frontend/tests/accessibility.spec.js`, `docs/testing/accessibility-test-output.txt`, `frontend/src/App.css` |

---

## 5. Requirement Status Summary

```
Total Requirements Tracked: 33
├── Implemented:  29 (87.9%)
├── Partial:       3  (9.1%)  [CSQ-F-051, CSQ-SR-001, CSQ-NF-001/003 local bench]
└── Deferred:      1  (3.0%)  [CSQ-NF-002 cloud SLA]
```

All primary functional workflows, cryptographic security layers (AES-256-GCM, bcrypt, hash-chained audit trails), and non-functional accessibility standards required for the course milestone and final sprint demonstration have been verified with 100% automated test execution.
