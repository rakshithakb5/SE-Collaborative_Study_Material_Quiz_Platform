# Collaborative Study Material & Quiz Platform

A web-based platform for students and instructors to share study materials,
create and take quizzes, discuss topics, and track learning progress.

PES University, Software Engineering mini-project, Group 11.

## Team

| Name | Scrum role | Focus |
|---|---|---|
| Rakshitha K B | Scrum Master | Authentication, audit log, admin moderation, plagiarism check |
| Mokshith Reddy Nallaballe | Product Owner | Quiz creation, backlog and documentation |
| Manasi Sabnis | Developer | Integration testing, RBAC, performance tests |
| Mahesh | Developer | Frontend, CI/CD |

## Documents

- SRS v1.0 (`frontend/SRS_Collaborative_Study_Material_Quiz_Platform.pdf`)
- SAD v1.0 (`SAD_final.pdf`) and STP v1.0 (`STP_final.pdf`)
- Availability plan, CSQ-NF-002 (`docs/availability.md`)
- Performance results (`backend/performance/results/`)
- Backlog and sprint board: the GitHub Project "CSQ Platform – Mini Project"

## Tech stack

- Backend: Node.js, Express 5, in-memory stores (the SAD's PostgreSQL, Redis and object storage are not part of this prototype)
- Frontend: React 19, Vite
- Security: bcrypt password hashing, JWT sessions, role-based access control
- Tests: `node:test` and supertest (backend), Playwright (frontend performance), Artillery (load)
- CI: GitHub Actions (`.github/workflows/ci.yml`) builds the frontend and runs the backend tests on every push and pull request to `main`

## Getting started

Requires Node.js 20 or later.

```bash
# Backend (http://localhost:5000)
cd backend
npm install
npm start

# Frontend (http://localhost:5173, proxies /api to the backend)
cd frontend
npm install
npm run dev
```

### Environment variables (backend, optional)

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | API port | `5000` |
| `JWT_SECRET` | Secret used to sign login tokens. **Set this outside local development.** | insecure development fallback, with a warning |
| `PLAGIARISM_THRESHOLD` | Similarity (0 to 1) at which an upload is flagged | `0.3` |

### Running the tests

```bash
cd backend
npm test
```

On Windows Command Prompt, `npm test` does not understand `NODE_ENV=test`. Use:

```
set NODE_ENV=test&& node --test
```

Frontend checks: `npm run lint` and `npm run build` in `frontend/`.

## What is implemented

| Area | Requirement | What it does |
|---|---|---|
| Authentication | CSQ-F-001, F-002 | Register (student or instructor) and log in with a 1-hour JWT. A verification email is sent through a stub Notification Service. |
| Authentication | CSQ-F-003 | Account locks for 15 minutes after 5 failed logins (HTTP 423). |
| Security | CSQ-SR-002 | Passwords stored only as bcrypt hashes. |
| Security | CSQ-SR-004 | Role checks (student, instructor, admin) on every protected route. |
| Security | CSQ-SR-005 | Tamper-evident audit log: each entry records actor, time, target and reason, and is hash-chained. Admins can read and verify it. |
| Audit | CSQ-NF-004 | Entries older than 730 days are moved to an archive (never deleted) by a daily job. Uploads and quiz attempts are logged as user activity. |
| Materials | CSQ-F-011 | Every upload is scanned by a mock Plagiarism Detection Service. Material at or above the threshold is held for admin review. If the service is down, the scan is retried once and the item is held. |
| Admin | CSQ-F-060, F-062 | List, suspend and reactivate users (a suspended account cannot log in and its token stops working), warn users, and remove content. All need a reason and are audit-logged. |
| Quizzes | CSQ-F-020, F-021, F-030 | Create quizzes from the question bank with time limit, attempt limit and shuffle settings, and take timed quiz attempts. |
| Performance | CSQ-NF-001, NF-003 | Measured page-load and concurrent-attempt results are in `backend/performance/results/`. |
| Reliability | CSQ-NF-002 | Availability plan in `docs/availability.md` (a design target; it is not measured on this prototype). |

Items on the sprint board that are not listed above are in progress or are recorded as deviations (see below).

## API overview

All routes are under `/api`. Send `Authorization: Bearer <token>` after logging in.

| Method and path | Who | Purpose |
|---|---|---|
| `GET /health` | anyone | Health check |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | anyone / signed in | Accounts and sessions |
| `POST /materials` | instructor, admin | Upload material (scanned before publishing) |
| `GET /materials/:id/versions`, `POST /materials/:id/versions` | signed in / instructor, admin | Read versions, add a version |
| `GET/POST /question-bank` | instructor, admin | Question bank |
| `GET/POST /quizzes`, `POST /quizzes/:id/attempts`, `.../attempts/:attemptId/submit` | role based | Create and take quizzes |
| `GET /admin/users`, `POST /admin/users/:id/suspend`, `.../reactivate`, `.../warn` | admin | User management |
| `POST /admin/materials/:id/remove`, `.../approve`, `GET /admin/materials/review-queue` | admin | Content moderation |
| `GET /admin/audit-log` (`?includeArchived=true`), `GET /admin/audit-log/verify`, `POST /admin/audit-log/archive` | admin | Audit log |

## Known limitations

- Data is stored in memory, so it is lost when the server restarts.
- The Plagiarism Detection and Notification services are local stubs, not the real external services.
- The frontend does not have admin screens yet; admin features are used through the API.
- TLS, deployment, autoscaling and monitoring from the SAD are design targets and are not part of this prototype.

## Workflow

Work is tracked as GitHub Issues on the project board. Each change is made on a branch,
opened as a pull request that closes its issue, checked by CI, and reviewed before it is merged into `main`.

## Project status

SRS Version: 1.0
Sprint 1: 19 to 23 Oct 2026. Sprint 2: 26 to 30 Oct 2026 (development freeze on 30 Oct 2026).
