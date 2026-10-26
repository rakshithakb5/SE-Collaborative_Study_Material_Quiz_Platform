# Availability Plan (CSQ-NF-002)

**Requirement:** The platform shall provide 99.5% availability monthly, excluding scheduled maintenance windows.
**Acceptance criterion:** Uptime reports show ≥ 99.5% per month (test: Ops reports).
**Owner:** Rakshitha (Scrum Master). Related documents: SRS v1.0, SAD v1.0 (sections 3.1, 3.5, 3.7, 4.4), STP v1.0.

## 1. What 99.5% means

| Month length | Minutes in month | Allowed downtime (0.5%) |
|---|---|---|
| 30 days | 43,200 | 216 min (3 h 36 min) |
| 31 days | 44,640 | 223 min (about 3 h 43 min) |

Availability for a month = (minutes the service was up ÷ minutes in the month, minus approved maintenance minutes) × 100.

## 2. Definitions

- **Up:** `GET /api/health` returns HTTP 200 and the login and quiz-attempt endpoints respond without a 5xx error.
- **Down:** the health check fails, or the API returns 5xx for more than 1 minute. Each failure counts from the first failed check to the first successful check.
- **Scheduled maintenance:** announced to users at least 48 hours ahead, held outside exam weeks and quiz deadlines, and limited to 2 hours per window. Maintenance minutes are excluded from the calculation. Unannounced downtime always counts.
- **Out of scope:** outages of the cloud provider's own infrastructure and of the external Plagiarism Detection and Notification gateways (see STP section 4). A failure of those services must not take the platform down; see section 3.

## 3. How the design meets the target

| Risk | Measure | Source |
|---|---|---|
| Traffic spike in exam week | Stateless services behind an API Gateway with autoscaling; question banks cached in Redis; instances pre-warmed before quiz deadlines | SAD 3.5, 3.7 |
| One service failing | Independently deployable services, so a failure in Material or Discussion does not stop Quiz or Auth | SAD 3.5 |
| Plagiarism service outage | Scan is retried once; the upload is held as `pending_review` for manual review instead of failing (implemented in `plagiarismService.js` and `materials.js`) | SAD 3.7, issue #11 |
| Notification gateway outage | Retry with backoff; fall back to the in-app notification centre | SAD 3.7 |
| Bad deployment | Rolling deployments with automatic rollback if `/api/health` fails after release; CI must pass before merge to `main` | CI workflow, SAD 3.6 |
| Data loss | Daily database backups; audit log archived, never deleted (issue #29) | SAD 3.6 |

## 4. Monitoring and reporting

- A monitor calls `GET /api/health` every 60 seconds from outside the platform and alerts the team after 2 consecutive failures.
- Tracked metrics (SAD 4.4): API error rate, quiz-submission latency, plagiarism-scan turnaround, uptime.
- A **monthly uptime report** lists total minutes, maintenance minutes, downtime incidents (start, end, cause) and the resulting percentage. It is reviewed by the Product Owner, and any month below 99.5% needs a written cause and corrective action.

## 5. Incident handling

1. Alert reaches the on-call developer; acknowledge within 15 minutes during the working week.
2. Mitigate first (roll back, restart, scale up), investigate afterwards.
3. Record the incident in the uptime report and open a GitHub Issue labelled `incident`.

## 6. Status in this academic prototype (deviation note)

The submitted Sprint 2 build is a single-instance Node.js backend with in-memory stores, run locally and in CI. It exposes `/api/health` and the failure-handling behaviour in section 3 for the Plagiarism service, but it has **no production deployment, autoscaling, Redis, backups or external monitor**. The 99.5% figure is therefore a documented design target and operating plan, and it has **not been measured**. Real uptime reports start once the platform is deployed per the SAD (Docker/Kubernetes with a managed PostgreSQL database). This is recorded as a deviation from the SRS for the final demo.
