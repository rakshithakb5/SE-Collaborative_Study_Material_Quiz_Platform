# Sprint 2 Implementation & Test Traceability (CSQ-Sprint-2)

**Author / Assignee:** Mokshith Reddy (`mokshithr530`)  
**Repository:** `SE-Collaborative_Study_Material_Quiz_Platform`  
**Branch:** `feature/sprint-2-features`

---

## 1. Executive Summary

This release delivers the complete set of Sprint 2 features, security requirements, and defect fixes assigned to Mokshith Reddy. All 148 automated backend test cases pass with 100% success rate, frontend lint checks pass with 0 warnings, and the production build compiles cleanly.

### Requirements & Defect Coverage

| Identifier | Type | Title | Status | Primary Test Case |
|---|---|---|---|---|
| **CSQ-F-022** (#14) | Feature | Publish quiz to groups with availability window | Complete | `TC-QuizC-03` |
| **CSQ-F-023** (#15) | Feature | Reuse and edit questions from question bank | Complete | `TC-QuizC-04` |
| **CSQ-F-052** (#22) | Feature | Multi-event notifications (materials, deadlines, grades) | Complete | `TC-Notif-01` |
| **CSQ-F-061** (#24) | Feature | Unified admin moderation queue | Complete | `TC-Admin-02` |
| **CSQ-SR-003** (#32) | Security Req | Encrypt quiz questions and answers at rest (AES-256-GCM) | Complete | `TC-Sec-03` |
| **CSQ-F-032** (#62) | Defect Fix | Correct answers & explanations revealed upon submission | Complete | `TC-Quiz-03` |

---

## 2. Architecture & Design Implementation

### 2.1 Question Bank Reuse & Version Tracking (`CSQ-F-023`)
- **Immutability Guarantee:** When questions are reused from the question bank (`POST /api/question-bank/:id/reuse`), questions are deep-cloned into an isolated instance for the new quiz draft. Edits to the quiz questions do not mutate the master question bank.
- **Version Tracking:** Question bank entries maintain an auto-incrementing `version` and an immutable `revisionHistory` log of updates.
- **Role Control:** Question reuse and creation are restricted strictly to instructors and administrators.

### 2.2 Target Groups & Availability Window Scheduling (`CSQ-F-022`)
- **Publishing API:** Instructors can publish quizzes targeting designated student groups (`targetGroups: ["Section A", "Group 1"]` or `["all"]`) and configure start and end availability times (`availabilityWindow: { start, end }`).
- **Authorization Enforcement:** Student quiz attempt initiation verifies:
  1. Student group membership matches quiz `targetGroups` (or `targetGroups` includes `"all"`).
  2. The current time is after `availabilityWindow.start` (403: "Quiz is not yet available").
  3. The current time is before `availabilityWindow.end` (403: "Quiz availability window has ended").

### 2.3 At-Rest AES-256-GCM Encryption (`CSQ-SR-003`)
- **Crypto Utility (`backend/src/utils/crypto.js`):** Standard authenticated AES-256-GCM cipher with unique 96-bit initialization vectors (IV) generated per write and 128-bit authentication tags.
- **Storage Isolation (`backend/src/models/quizStore.js`):** Raw encrypted storage holds the ciphertext and auth tag. Plaintext questions and answers are never stored at rest.
- **Transparent Server Decryption:** Only authenticated and authorized quiz attempts or grading routines invoke server-side decryption on-the-fly.

### 2.4 Multi-Event Notification Delivery (`CSQ-F-052`)
- **Event Sources:**
  1. *New Study Material Upload:* Delivered to enrolled students within 1 minute.
  2. *Quiz Deadline Reminders:* Automated 24-hour deadline notification sweep (`POST /api/notifications/deadline-check`).
  3. *Grade Published:* Instantly dispatched upon quiz submission with score summary.
- **Delivery SLA:** Latency metrics verify in-app notification center delivery within 60 seconds (AC-CSQ-F-052).

### 2.5 Unified Admin Moderation Queue (`CSQ-F-061`)
- **Flagging Endpoints:** Both study materials (`POST /api/materials/:id/flag`) and quizzes (`POST /api/quizzes/:id/flag`) allow students and faculty to submit flagged content with a required reason.
- **Queue Aggregation:** `GET /api/admin/moderation-queue` unifies user-reported items and plagiarism-flagged items with source badges (`user-report` vs `plagiarism-service`), reporter metadata, and timestamps.
- **Admin Actions:**
  - `POST /api/admin/moderation-queue/:type/:id/dismiss`: Dismiss flags with mandatory reason.
  - `POST /api/admin/:type/:id/remove`: Remove content with mandatory reason and cryptographic audit trail.

### 2.6 Server-Side Answer Reveal & Explanations (`Defect #62 / CSQ-F-032`)
- **Security Boundary:** Quizzes and attempt previews strictly strip correct answers for student role.
- **Submission Response:** Upon successful submission, the server evaluates answers against encrypted answer keys and returns scored results including the correct answers and pedagogical explanations.

---

## 3. Test Traceability Matrix

| Test Suite File | Test Case | Target Requirement | Description | Result |
|---|---|---|---|---|
| `quizAttempts.test.js` | `TC-Quiz-03` | Defect #62 / CSQ-F-032 | Verified server-side evaluation returns correct answers & explanations on submit | **PASS** |
| `quizPublishGroups.test.js` | `TC-QuizC-03` | CSQ-F-022 | Verified group filtering, window scheduling, and student access blocking | **PASS** |
| `questionReuse.test.js` | `TC-QuizC-04` | CSQ-F-023 | Verified deep-copy question reuse, immutability, and version history | **PASS** |
| `crypto.test.js` | `Unit-Crypto` | CSQ-SR-003 | Verified AES-256-GCM cipher, random IV, decryption, and tamper detection | **PASS** |
| `quizEncryption.test.js` | `TC-Sec-03` | CSQ-SR-003 | Verified storage inspection (no plaintext answers) & on-the-fly decryption | **PASS** |
| `notifications.test.js` | `TC-Notif-01` | CSQ-F-052 | Verified delivery latency <= 1 minute for materials, deadlines, and grades | **PASS** |
| `moderationQueue.test.js` | `TC-Admin-02` | CSQ-F-061 | Verified multi-source moderation queue, SLA <= 1 min, dismiss & remove actions | **PASS** |
| `sprint2Integration.test.js` | `E2E-Sprint-2` | All Sprint 2 Features | Full end-to-end integration workflow verification | **PASS** |

---

## 4. Verification Instructions

### Backend Test Suite
```bash
cd backend
npm test
# Total: 148 tests passing, 0 failing
```

### Frontend Lint and Build
```bash
cd frontend
npm run lint
# Found 0 warnings and 0 errors

npm run build
# Built client environment cleanly in dist/
```
