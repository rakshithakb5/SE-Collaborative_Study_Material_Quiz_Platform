# RBAC Integration Test Cases

**Requirement ID:** CSQ-SR-004  
**Test Case Reference:** TC-Sec-04  
**Dependency:** CSQ-F-002 — Login/JWT Authentication  
**Priority:** High

## 1. Objective

Verify that student, instructor and admin roles can access permitted endpoints and are prevented from performing unauthorized actions.

## 2. Test Cases

| Test ID | Scenario | Expected Result |
|---|---|---|
| RBAC-01 | Student accesses an authorized endpoint | Request succeeds |
| RBAC-02 | Student attempts an instructor-only action | Access denied |
| RBAC-03 | Student attempts an admin-only action | Access denied |
| RBAC-04 | Instructor accesses an authorized endpoint | Request succeeds |
| RBAC-05 | Instructor attempts an admin-only action | Access denied |
| RBAC-06 | Admin accesses an authorized endpoint | Request succeeds |
| RBAC-07 | Unauthenticated user accesses a protected endpoint | Authentication rejected |
| RBAC-08 | User sends an invalid or expired JWT | Authentication rejected |

## 3. Execution Status

All test cases are pending until the backend endpoints and authentication mechanism are available.

## 4. Execution Record

For each test, record:
- Endpoint and HTTP method
- User role and test account
- Request and authentication token
- Expected response
- Actual response
- Pass/fail status
- Evidence or linked defect

## 5. Dependencies

- Login/JWT authentication (CSQ-F-002)
- Backend endpoints with role-based authorization
- Student, instructor and admin test accounts
- Agreed role-permission matrix

## 6. Completion Criteria

TC-Sec-04 is complete when all applicable role-permission tests have been executed, failures have been investigated, and the results have been recorded.

**Note:** The scenarios above are proposed test cases. Confirm endpoint names and permissions with the backend developer before execution.