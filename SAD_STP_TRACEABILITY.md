# Architecture & System Test Plan Traceability Report (SAD-STP Traceability)

**Project:** Collaborative Study Material & Quiz Platform (CSQ Platform)  
**Author / Assignee:** Mokshith Reddy Nallaballe (`mokshithr530`), Product Owner  
**Reviewer:** Manasi Sabnis (`manasisabnis`), QA & Testing Lead  
**Branch:** `docs/srs-sad-traceability`  
**Date:** 14-11-2026  
**Document Version:** 2.0 (Sprint 2 & Demo Prototype Final)

---

## 1. Executive Summary

This document establishes formal architectural and test plan traceability between:
1. **Software Architecture and Design Specification (SAD v1.0)**
2. **System Test Plan (STP v1.0)**
3. **The Executable Demonstrator Implementation** (`demo/sprint-2-final`)

It reconciles the target multi-tier enterprise architecture described in the SAD with the prototype architecture implemented for the semester-end academic demonstration, highlighting design alignments, runtime decisions, and test coverage evidence.

---

## 2. SAD Component Architecture Mapping

The SAD defines seven core subsystems. The table below traces each subsystem from the architectural model to its executable prototype implementation.

| SAD Subsystem | SAD Reference | Prototype Implementation Component | Implementation Details & Source Files |
|---|---|---|---|
| **Client Presentation Layer** | SAD §3.3, §3.6 | React 19 + Vite Single Page Application | `frontend/src/App.jsx`, `frontend/src/pages/` (Dashboard, Library, QuizCreator, QuizPlayer, Login, Register). Dual-mode architecture supporting live `/api` proxy and offline demo mode. |
| **API Gateway & Routing** | SAD §3.3, §4.3 | Express 5 Application Router | `backend/src/app.js`. Unified routing middleware providing CORS headers, JSON payload parsing, and error-handling pipelines. |
| **Authentication & RBAC** | SAD §3.4.1, §3.9 | JWT + Bcrypt Authentication Middleware | `backend/src/middleware/authenticate.js`, `backend/src/middleware/rbac.js`, `backend/src/utils/jwt.js`, `backend/src/utils/password.js`. Enforces 1-hour session tokens and role guards. |
| **Study Material Subsystem** | SAD §3.4.2 | Material Controller & Plagiarism Engine | `backend/src/routes/materials.js`, `backend/src/services/plagiarismService.js`. Implements version history, metadata tagging, and plagiarism threshold evaluation. |
| **Quiz Management & Grading** | SAD §3.4.3 | Quiz Store, Question Bank & Grading Engine | `backend/src/routes/quizAttempts.js`, `backend/src/routes/questionBank.js`, `backend/src/models/quizStore.js`. Manages question bank reuse, availability windows, timers, and server-side grading. |
| **Notification Subsystem** | SAD §3.4.4 | Multi-Event In-Memory Dispatcher | `backend/src/services/notifier.js`, `frontend/src/App.jsx`. In-app notification center receiving alerts on material publications, deadline countdowns, and grading results. |
| **Administration & Audit** | SAD §3.4.5, §3.9 | Admin Moderation Queue & Audit Hash-Chain | `backend/src/routes/admin.js`, `backend/src/services/auditLog.js`, `backend/src/services/retentionJob.js`. SHA-256 cryptographic hash-chained audit logging and moderation queue. |

---

## 3. Data Architecture: Prototype vs Production Target

The SAD specifies an enterprise cloud deployment architecture. To guarantee reliable, deterministic, and instant execution during evaluative demonstrations and CI automated test runs, specific storage technologies were adapted into high-performance in-memory engines:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Architectural Data Tiers                              │
├───────────────────────┬───────────────────────────────┬─────────────────────────┤
│ Tier / Subsystem      │ SAD Target (Production Cloud) │ Prototype Implementation│
├───────────────────────┼───────────────────────────────┼─────────────────────────┤
│ User & Profile Store  │ PostgreSQL 16 (Relational DB) │ In-Memory Hash Store    │
│ Study Material Files  │ Amazon S3 / MinIO Object Store│ Local Filesystem / RAM  │
│ Quiz Storage (At-Rest)│ Encrypted PostgreSQL (AES-256)│ In-Memory AES-256-GCM   │
│ Session & Lockout     │ Redis 7.2 In-Memory Cache     │ In-Memory Map / Token   │
│ Plagiarism Detection  │ External Microservice (HTTP)  │ Mock Deterministic Svc  │
│ Audit Log Persistence │ Append-Only DB with SHA-256   │ SHA-256 Linked Chain    │
└───────────────────────┴───────────────────────────────┴─────────────────────────┘
```

### Rationale for Prototype Adaptations:
1. **Zero External Dependency:** Evaluators and CI pipelines can spin up the full platform in seconds with standard `npm install` and `npm start` without configuring Docker, Postgres instances, or cloud credentials.
2. **Cryptographic Equivalence:** The prototype does not compromise on security logic; it implements genuine `bcrypt` password hashing (10 rounds) and authenticated `AES-256-GCM` encryption with unique initialization vectors (IVs) and auth tags.

---

## 4. System Test Plan (STP) Traceability Matrix

The table below maps all test groups defined in **STP v1.0** to their automated test suites, execution commands, and verification outcomes.

| STP Test Group | Target Requirement | Automated Test Suite | Test Harness | Result |
|---|---|---|---|---|
| **TC-Auth-01** | CSQ-F-001 (Registration) | `backend/test/authRegister.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Auth-02** | CSQ-F-002 (JWT Login) | `backend/test/authLogin.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Auth-03** | CSQ-F-003 (Account Lockout) | `backend/test/authLockout.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Mat-01** | CSQ-F-010 (Material Upload) | `backend/test/materials.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Mat-02** | CSQ-F-011 (Plagiarism Scan) | `backend/test/plagiarism.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Mat-03** | CSQ-F-012 (Library Search) | `frontend/tests/performance.spec.js` | Playwright Browser Tests | Pass (100%) |
| **TC-Mat-04** | CSQ-F-013 (Version Control) | `backend/test/materials.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-QuizC-01** | CSQ-F-020 (Quiz Creation) | `backend/test/quizCreation.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-QuizC-02** | CSQ-F-021 (Quiz Settings) | `backend/test/quizCreation.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-QuizC-03** | CSQ-F-022 (Target Groups & Availability) | `backend/test/quizAttempts.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-QuizC-04** | CSQ-F-023 (Question Bank Reuse) | `backend/test/quizCreation.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Quiz-01** | CSQ-F-030 (Timed Quiz Attempt) | `backend/test/quizAttempts.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Quiz-02** | CSQ-F-031 (Automated Grading) | `backend/test/quizAttempts.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Quiz-03** | CSQ-F-032 (Answer Reveal) | `backend/test/quizAttempts.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Disc-01/02** | CSQ-F-040/041 (Nested Comments) | `frontend/tests/accessibility.spec.js` | Playwright DOM Inspector | Pass (100%) |
| **TC-Admin-01** | CSQ-F-060 (User Moderation) | `backend/test/adminModeration.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Admin-02** | CSQ-F-061 (Unified Moderation Queue) | `backend/test/adminModeration.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Admin-03** | CSQ-F-062 (Content Removal) | `backend/test/adminModeration.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Sec-02** | CSQ-SR-002 (Bcrypt Hashing) | `backend/test/password.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Sec-03** | CSQ-SR-003 (AES-256 Storage) | `backend/test/quizAttempts.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Sec-04** | CSQ-SR-004 (RBAC Enforcement) | `backend/test/rbac.test.js` | Node.js `node:test` + Supertest | Pass (100%) |
| **TC-Perf-01** | CSQ-NF-001 (Page Latency <3s) | `frontend/tests/performance.spec.js` | Playwright Automation | Pass (100%) |
| **TC-Perf-02** | CSQ-NF-003 (Concurrent Load) | `backend/performance/results/` | Artillery Load Engine | Pass (Benchmarked) |
| **TC-UX-01** | CSQ-NF-005 (WCAG 2.1 AA) | `frontend/tests/accessibility.spec.js` | Axe-Core Web Accessibility | Pass (100%) |

---

## 5. Traceability Verification Sign-Off

The system demonstrator achieves complete alignment across specified software requirements, architectural modularity, and system test execution.

* **Requirements Coverage:** 100% of prioritized Sprint 1 and Sprint 2 functional and security requirements have verifiable code paths and automated tests.
* **Test Execution Summary:** 121/121 backend integration test cases pass; frontend Playwright accessibility and performance tests pass with zero critical regressions.
