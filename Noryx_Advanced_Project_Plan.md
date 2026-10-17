# Noryx — Advanced Project Management Platform

> **Product requirements, system design, engineering roadmap, and delivery checklist**

| Field               | Detail                                                                       |
| ------------------- | ---------------------------------------------------------------------------- |
| Product             | **Noryx**                                                                    |
| Tagline             | **Where teams build together.**                                              |
| Former working name | Project Camp Backend                                                         |
| PRD version         | 2.0 — proposed technical specification                                       |
| Status              | Planning; implementation details and performance claims are not yet verified |
| Updated             | 17 October 2026                                                              |
| Initial users       | Engineering teams, startups, agencies, student teams (2–50 users)            |
| Product             | Developer-first, collaborative project management SaaS                       |
| Primary deliverable | REST backend API and background workers; frontend is a separate workstream   |
| API version         | `/api/v2` (proposed)                                                         |
| Domain              | Not confirmed; do not assume `noryx.com` is available                        |

## Product Identity

**Noryx** is a developer-first project and workflow management platform for teams that plan, assign, discuss, and deliver work together. Its core differentiator is understandable project-scoped access control and reliable collaboration workflows. The initial product aims to be simpler than Jira or ClickUp; it is **not** meant to reproduce their entire feature sets.

**Brand direction:** concise, modern, professional, neutral. The name is a working product identity until domain and trademark checks are complete. Suggested repository names: `noryx-api` and `noryx-web` (or a monorepo `noryx`).

**Main engineering goal:** demonstrate depth through correctness under concurrent edits, resilient asynchronous delivery, secure multi-tenant authorization, object storage, metrics, and reproducible tests, rather than arbitrary infrastructure complexity.

## Implementation Boundaries and Assumptions

- Build a **modular monolith** first: one API application, one worker, PostgreSQL, Redis, and private S3-compatible object storage.
- Core backend in **TypeScript + Node.js + Express**, with PostgreSQL and a query layer/ORM selected once schema migrations and transactions are understood. Alternative frameworks require a documented ADR.
- Multi-tenancy is workspace-based; projects belong to exactly one workspace. IDs alone never confer access.
- Permissions are separated into **workspace owner/admin/member** and **project admin/member**. These are not interchangeable global user flags.
- An initial workspace creator becomes its **owner**; there must always be an active owner or an explicit secure ownership-transfer process.
- The first portfolio release can use an API test client and lightweight admin UI; a commercially viable SaaS requires a usable production frontend.
- Email and in-app notifications are **at-least-once event driven**. Delivery may be retried or duplicated; promise neither exactly-once remote email delivery nor perfect email recalls.
- Introduce caches only after query measurements justify them; never cache an unconditional authorization decision across revoked memberships.
- Estimates, commercial positioning, and acceptance targets in this document are planning assumptions, not achieved results.

---

## 0. Executive Summary

Noryx will evolve from a project/task CRUD API into a secure,
observable, multi-tenant collaboration platform designed for software
and small cross-functional teams. Its purpose is twofold:

1. Deliver genuinely usable project-management workflows.
2. Demonstrate advanced backend engineering through authorization,
   database consistency, reliable asynchronous processing, secure
   storage, controlled performance optimization and deployment.

Keep it a MODULAR MONOLITH. One API service, one background worker,
and managed infrastructure are enough to showcase sophisticated
engineering without premature microservices complexity.

The v1.0 features supplied in the original PRD remain in scope:
registration/login, verification/reset/refresh, roles, projects,
members, tasks, subtasks, project notes, attachments and health checks.

Add product features only where they create useful engineering cases:
comments, mentions, due dates, priorities, activity history, advanced
filters, invitations, notifications and a basic team dashboard.
Optional later: recurring tasks, time tracking, GitHub integration,
sprints, automation rules, and AI assistance.

Core architectural differentiators for the portfolio:

- Two-layer authorization: workspace roles and project membership.
- PostgreSQL transactions and explicit concurrency handling.
- Transactional outbox for durable domain-event delivery.
- BullMQ + Redis worker with retry, deduplication and failure tracking.
- Private S3-compatible attachment storage with signed uploads.
- Secure access/refresh-token lifecycle and audit trails.
- Structured logging, metrics, integration/load testing and CI/CD.

## 1. Product Positioning And Target Users

Initial audience: 2-50 person software teams, student project teams,
freelance agencies and early-stage startups.

Core job to be done:
"Give the team a secure workspace to plan work, assign tasks, track
progress and reliably notify the right people when something changes."

Roles:

- Workspace Owner: creates workspace; highest membership authority.
- Workspace Admin: manages workspace projects and workspace members.
- Workspace Member: can participate in projects they belong to.
- Project Admin: manages tasks, subtasks and contributors in an
  assigned project, within the permitted project-administration scope.
- Project Member: reads project resources and updates their own
  assigned work.

IMPORTANT: Preserve the spirit of the original three roles but avoid
using an ambiguous global "admin" flag. Use WORKSPACE roles and
PROJECT roles separately. Project roles are context dependent.

Product positioning vs large commercial alternatives:

- Focus on straightforward engineering team workflows, not parity with
  Jira/ClickUp/Asana.
- Offer understandable permissions and a fast REST API.
- Treat dependable notification delivery and auditability as features.
- Demonstrate clean software architecture rather than feature count.

Non-goals for first production release:

- Microservices and Kubernetes.
- Custom workflow designer with arbitrary state machines.
- Full billing, invoicing and enterprise procurement.
- Video calls and a collaborative document editor.
- Generic AI agent orchestration.
- Claims of enterprise-grade compliance without independent audits.

## 2. Product Features And Priority

P0: ORIGINAL PRD, HARDENED

### A. Identity and authentication

- Register; verify email; login; logout; retrieve current user.
- Change password; forgot/reset password; resend verification.
- Access token renewal via rotating refresh tokens.
- Session/device listing and revoke-session endpoint (added).
- Consistent 401, 403 and verification-required behavior.

### B. Workspaces and project management

- Create a workspace; invite workspace users.
- Workspace admins create/update/archive/delete projects.
- List only projects accessible to the requester.
- Include member count and basic task-completion statistics.
- Project archive rather than hard delete by default.

### C. Membership

- Invite by email with expiring one-time invitation token.
- Accept/reject invitation; invitation expiration/revocation.
- List members; assign per-project admin/member role.
- Handle removal, reassignment, and membership revocation.

### D. Tasks and subtasks

- Title, description, assignee(s) as defined by product rules, status.
- Status: todo, in_progress, done.
- Due date, priority, labels and creator metadata.
- Project admin creates/edits/deletes tasks and subtasks.
- Members can complete ONLY subtasks assigned to them (or explicitly
  owned by them); they cannot edit arbitrary task fields.
- Prevent cross-project references and unauthorized reassignment.

### E. Notes and files

- Admin-authored project notes; project members may read.
- Multiple task attachments, with metadata and private access.
- Replace unsafe public/images file exposure with signed object access.

P1: ESSENTIAL REAL-WORLD COLLABORATION

- Task comments and threaded replies (one-level threads sufficient).
- @mentions restricted to users authorized for the project.
- Task activity feed (status, assignee, fields, attachments).
- Notifications: in-app and email, with per-user preferences.
- Search/filter: assignee, status, priority, due date, label, text.
- Cursor pagination on frequently used list endpoints.
- Dashboard: counts by status, overdue tasks, upcoming deadlines.
- Kanban-ready backend: sortable status columns and order positions.
- Saved project filters (optional after filters are stable).

P2: ENGINEERING / TEAM PRODUCTIVITY

- Sprint/cycle records; sprint assignment and velocity aggregates.
- GitHub webhook integration for pull request references and commits.
- Webhook delivery outbound with signatures and retries.
- Recurring tasks and scheduled reminders.
- Lightweight rules: when task is assigned, notify assignee; when
  deadline approaches, schedule reminder.
- Time-tracking entries and workload summaries.

P3: OPTIONAL MARKET EXPERIMENTS

- AI-assisted task description drafting and summarization with clear
  opt-in and per-workspace usage limits.
- Public API keys with restricted scopes.
- Usage quotas, metering and paid workspace subscriptions.
- SSO and enterprise audit export only with real demand.

## 3. Permission And Security Model

Workspace roles (in workspace_members):

- owner: all workspace permissions; cannot delete last owner.
- admin: manage projects and memberships, subject to owner controls.
- member: view only joined projects, no project creation by default.

Project roles (in project_members):

- project_admin: create/update/delete tasks and subtasks; manage
  project assignments; view project notes.
- member: read project content; update only assigned subtask status.

Permissions inherited from workspace:

- Owner/admin can manage all projects under their workspace.
- A workspace member must also have an active project membership.
- Project admin has content rights in one project only.
- Notes remain workspace-admin/owner write-only, per original PRD.
- Project membership changes are initiated by workspace admins by
  default, matching the original admin-only member management rule.

Mandatory policy checks:

1. Authenticate user.
2. Resolve workspace and project from trusted database lookup.
3. Check workspace membership status.
4. Check project membership and requested action.
5. Confirm nested resource belongs to supplied project.
6. For member subtask status changes, confirm assignment ownership.
7. Execute mutation with relevant transactional consistency checks.
8. Log sensitive membership/role changes in an audit event.

Threat cases to test:

- Guessing another projectId or taskId (IDOR).
- Updating another workspace's subtask by changing URL IDs.
- Self-promotion from project member to project admin.
- Invitations accepted with a different email account.
- Access using revoked membership or stale cached permissions.
- Updating files through guessed object paths.
- Role-change/delete races and last-owner removal.

## 4. Recommended Technology Stack

Language/runtime: TypeScript on Node.js.
API framework: Express (preserves original PRD) with thin route layer.
Database: PostgreSQL.
ORM/query layer: Prisma or Drizzle; choose one, not both.
Validation: Zod (or equivalent strongly typed request validation).
Auth: short-lived JWT access tokens plus opaque rotating refresh tokens.
Password hashing: Argon2id or carefully configured bcrypt.
Cache/queues: Redis + BullMQ.
Object storage: AWS S3 or S3-compatible service.
Email provider: transactional service (e.g. SES or Resend).
API specification: OpenAPI 3 and Swagger UI.
Logging: Pino or equivalent structured JSON logger.
Tracing/metrics: OpenTelemetry instrumentation + suitable dashboard.
Tests: Vitest/Jest, Supertest, disposable PostgreSQL/Redis containers.
Load tests: k6 or Artillery.
Deployment: Docker, Docker Compose for local; managed app/container
service for deployment; managed Postgres/Redis/storage where feasible.
CI/CD: GitHub Actions.

Keep environment config validated on startup; keep secrets out of git.
Avoid adding Kafka, Elasticsearch, Kubernetes or microservices until a
measured requirement justifies the complexity.

## 5. High-Level Architecture

Client (web app, Postman or mobile)
|
v
HTTPS reverse proxy / application ingress
|
v
Express API (auth -> validation -> authorization -> controller)
|
+--> Service modules -> PostgreSQL (transaction + outbox)
|
+--> Read cache / rate limiting -> Redis
|
+--> Signed upload/download URLs -> private S3 bucket
|
+--> Health and readiness endpoints

Outbox dispatcher (separate worker process/module)
|
v
BullMQ queues backed by Redis
|
v
Worker(s): notifications, reminders, email, webhook deliveries,
cleanup tasks, analytics aggregation
|
+--> Email provider
+--> Notification records in PostgreSQL
+--> External integration webhooks

Logs, metrics and traces collected from API, worker and DB adapters.

Use bounded retry with exponential backoff. Failed jobs are retained
or moved to a failure queue for inspection; provide an operator retry
procedure. Delivery is at-least-once, not magically exactly-once.

## 6. Database Model And Integrity Rules

Canonical tables (representative, not an exhaustive migration script):

**users**

- id, email (unique case-normalized), password_hash, email_verified_at,
  display_name, created_at, updated_at, disabled_at

**user_sessions**

- id, user_id, refresh_token_hash, token_family_id, expires_at,
  revoked_at, last_used_at, device_metadata

**workspaces**

- id, name, slug (unique), created_by, created_at, updated_at

**workspace_members**

- id, workspace_id, user_id, role(owner/admin/member),
  status(active/invited/suspended), joined_at
- UNIQUE(workspace_id, user_id)

**projects**

- id, workspace_id, name, description, created_by, archived_at,
  created_at, updated_at, version

**project_members**

- id, project_id, user_id, role(project_admin/member), joined_at
- UNIQUE(project_id, user_id)

**project_invitations**

- id, project_id, invited_email, token_hash, role, invited_by,
  expires_at, accepted_at, revoked_at

**tasks**

- id, project_id, title, description, status, priority, due_at,
  created_by, assignee_id (nullable), order_key, version,
  deleted_at, created_at, updated_at

**subtasks**

- id, task_id, title, completed, assignee_id (nullable), version,
  completed_at, created_at, updated_at

**project_notes**

- id, project_id, title, body, created_by, updated_by, version,
  created_at, updated_at

**task_comments**

- id, task_id, author_id, parent_comment_id(nullable), body,
  deleted_at, created_at, updated_at

**attachments**

- id, task_id, uploaded_by, object_key, original_name, mime_type,
  byte_size, checksum, scan_status, created_at, deleted_at

**notifications**

- id, user_id, type, payload_json, read_at, created_at,
  delivery_status

**audit_events**

- id, workspace_id, project_id(nullable), actor_id, action,
  target_type, target_id, old_value_json, new_value_json, created_at,
  request_id

**outbox_events**

- id(UUID), aggregate_type, aggregate_id, event_type,
  payload_json, created_at, dispatched_at, attempts, last_error

**processed_events**

- consumer_name, event_id, processed_at
- UNIQUE(consumer_name, event_id)

additional tables later: sprints, sprint_tasks, labels, task_labels,
notification_preferences, webhook_subscriptions, webhook_deliveries,
time_entries, automation_rules, usage_counters.

Important DB constraints:

- Foreign keys on every relationship.
- Unique project membership, unique invitations according to business
  rules, unique event-processing identifiers.
- CHECK constraints for permissible state/priority values.
- Indexes for (project_id, status, created_at/id), assignee + due_at,
  and membership lookups.
- Always include project/workspace predicates in secured queries.
- Ensure assignee belongs to relevant project (application transaction
  and/or relational design enforcing the invariant).
- Use an explicit delete strategy: soft-delete/archive for user-facing
  records; secure purge/retention policies for sensitive information.

Measure actual EXPLAIN ANALYZE plans before adding speculative indexes.

## 7. Authentication Lifecycle

Registration:

- Normalize email; validate input; rate limit registration.
- Hash password; create unverified account; issue a high-entropy,
  single-use verification token; store only a hash of that token.
- Send verification email asynchronously using outbox + queue.
- Disallow privileged actions before email verification.

Login:

- Compare password hash in constant-time-safe library flow.
- Provide short-lived access token (illustrative: 15 minutes).
- Issue random opaque refresh token, store hashed token/session data.
- For browser clients, favor HttpOnly Secure SameSite cookies for the
  refresh token; apply CSRF defenses appropriate to cookie flows.
- Do not log raw tokens or passwords.

Refresh:

- Rotate refresh token atomically and revoke predecessor.
- Detect token reuse and revoke the affected token family/session.
- Scope and validate JWT issuer, audience, expiration, signature.

Logout:

- Revoke current refresh session; access JWT remains valid until
  expiry unless an explicit access-token revocation mechanism exists.
- Password change or reset revokes appropriate active sessions.

Reset/verification:

- Single-use, hashed, time-limited opaque tokens.
- Generic responses for forgotten-password flows to prevent user
  enumeration; rate limit and audit requests.

## 8. Advanced Data Consistency And Concurrency

Use transactions for:

- Creating project plus initial membership.
- Accepting invitations and establishing membership.
- Assigning task while validating assignee's project membership.
- Updating role and recording audit event.
- Creating task and corresponding outbox event atomically.
- Updating task status and activity feed records.

Implement optimistic concurrency:

- Add version integer on task/subtask/project rows.
- For updates, UPDATE ... WHERE id=? AND version=?; increment version.
- If affected rows = 0, return 409 CONFLICT with current state/version.
- Document retry or refresh strategy for clients.

Idempotency:

- Support Idempotency-Key for selected POST operations (creating tasks,
  accepting invites if side effects occur, payment operations later).
- Scope stored key to requester + route, include request fingerprint,
  TTL and recorded response; reject mismatched reuse.

Example race tests:

- Two admins concurrently reassign the same task.
- Two requests accept the same one-time invitation.
- Member removed while an assignment or update is in progress.
- Queue delivers notification event twice.

## 9. Reliable Background Job Processing

Events:

- project.member_invited
- task.created
- task.assigned
- task.status_changed
- subtask.completed
- task.deadline_approaching
- comment.mentioned_user

Write events to outbox_events IN THE SAME DATABASE TRANSACTION as the
business state change. A dispatcher reliably publishes undispatched
events into the queue. Mark dispatch only after confirmed publication;
retries can produce duplicate delivery, so consumers must deduplicate.

Worker safeguards:

- Stable event/job IDs and processed_events unique constraints.
- Configurable retries with exponential backoff and jitter.
- Failure inspection / dead-letter approach.
- Timeout, idempotent side effects, and provider request retries.
- Rate limits on outbound email/webhooks.
- Graceful shutdown and in-flight job completion where possible.

Test partial failures: database down, queue down, mail provider 429/500,
worker crash before ack, crash after email attempt, duplicate message.
Record what remains at-least-once and cannot be fully deduplicated
without provider-side idempotency.

## 10. Secure File Management

Do NOT expose user task files directly in a public/images folder.

Upload flow:

1. Authenticated user requests upload intent for a project task.
2. API checks membership and attachment quota, validates claimed file
   type, allowed extension, max size and expected checksum.
3. API creates pending metadata and returns short-lived signed S3 PUT
   URL restricted to an unpredictable object key.
4. Client uploads directly to private bucket.
5. Client confirms upload; backend verifies object properties and size.
6. Async scanning/validation; mark attachment usable only when safe.
7. Authorized downloads get short-lived signed GET URLs.

Policies:

- Block dangerous file types where not required.
- MIME sniffing and allowlist, not trusting Content-Type alone.
- Enforce size, count and per-workspace storage quotas.
- Prefer private bucket + block public access + encryption at rest.
- Handle incomplete uploads and orphaned objects with cleanup jobs.
- Never expose bucket credentials to clients.

11. API DESIGN (V2)

```text
Base: /api/v2
API error shape:
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You cannot modify this resource",
    "requestId": "...",
    "details": []
  }
}

Identity:
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
POST   /auth/change-password
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/verify-email
POST   /auth/resend-verification
GET    /auth/sessions
DELETE /auth/sessions/:sessionId

Workspaces and membership:
POST   /workspaces
GET    /workspaces
GET    /workspaces/:workspaceId
PATCH  /workspaces/:workspaceId
GET    /workspaces/:workspaceId/members
POST   /workspaces/:workspaceId/invitations
POST   /invitations/:token/accept
PATCH  /workspaces/:workspaceId/members/:userId
DELETE /workspaces/:workspaceId/members/:userId

Projects:
GET    /workspaces/:workspaceId/projects
POST   /workspaces/:workspaceId/projects
GET    /projects/:projectId
PATCH  /projects/:projectId
POST   /projects/:projectId/archive
GET    /projects/:projectId/members
POST   /projects/:projectId/invitations
PATCH  /projects/:projectId/members/:userId
DELETE /projects/:projectId/members/:userId

Tasks:
GET    /projects/:projectId/tasks?status=&assignee=&cursor=&limit=
POST   /projects/:projectId/tasks
GET    /projects/:projectId/tasks/:taskId
PATCH  /projects/:projectId/tasks/:taskId
DELETE /projects/:projectId/tasks/:taskId
GET    /projects/:projectId/tasks/:taskId/activity

Subtasks:
POST   /projects/:projectId/tasks/:taskId/subtasks
PATCH  /projects/:projectId/tasks/:taskId/subtasks/:subtaskId
DELETE /projects/:projectId/tasks/:taskId/subtasks/:subtaskId

Comments:
GET    /projects/:projectId/tasks/:taskId/comments
POST   /projects/:projectId/tasks/:taskId/comments
PATCH  /projects/:projectId/tasks/:taskId/comments/:commentId
DELETE /projects/:projectId/tasks/:taskId/comments/:commentId

Notes:
GET    /projects/:projectId/notes
POST   /projects/:projectId/notes
GET    /projects/:projectId/notes/:noteId
PATCH  /projects/:projectId/notes/:noteId
DELETE /projects/:projectId/notes/:noteId

Attachments:
POST   /projects/:projectId/tasks/:taskId/attachments/upload-intent
POST   /projects/:projectId/tasks/:taskId/attachments/:attachmentId/complete
GET    /projects/:projectId/tasks/:taskId/attachments/:attachmentId/download
DELETE /projects/:projectId/tasks/:taskId/attachments/:attachmentId

Notifications and reporting:
GET    /me/notifications
PATCH  /me/notifications/:notificationId/read
GET    /projects/:projectId/dashboard
GET    /projects/:projectId/audit-events (workspace admin only)

Operations:
GET    /health/live
GET    /health/ready
GET    /docs
```

Conventions:

- 201 Created + Location for resource creation.
- 204 No Content for successful empty deletes.
- 400 for malformed requests, 401 missing authentication, 403 for
  denied action, 404 when intentionally obscuring inaccessible record,
  409 for conflicts, 422 for semantically invalid fields.
- Cursor pagination, server-enforced max page limit, deterministic sort.
- OpenAPI schemas for bodies, responses and authorization errors.
- Preserve /api/v1 routes only if external backward compatibility
  actually matters; otherwise migrate cleanly before launch.

## 12. Caching And Performance Plan

Do not cache everything automatically.

Cache candidates:

- Public/reference static metadata.
- Project summary counts with short TTL and invalidation.
- Non-sensitive derived dashboard aggregates.

Avoid using stale cache as sole authority for permissions.
Permission revocation must become effective predictably; perform DB
checks on sensitive mutations or use robust revision invalidation.

For cache keys, include workspace_id/project_id and authorization
scope; never return one tenant's cached output to another tenant.

Optimization sequence:

1. Measure baseline latency/throughput.
2. Inspect query plans and N+1 queries.
3. Add pagination, compound indexes and query improvements.
4. Introduce cache only for demonstrated read hotspots.
5. Validate invalidation under writes and permission changes.
6. Rerun load tests; compare before/after.

Provisional performance targets, to validate and revise:

- GET paginated tasks: p95 < 300 ms at controlled 50-virtual-user load.
- POST create task: p95 < 500 ms at same measured environment.
- No leaked cross-tenant data in automated authorization tests.
- Queue delivery/recovery metrics visible to operator.

These are design goals, NOT achieved performance claims.

## 13. Observability And Operations

Structured logs:

- request_id, user_id (not email), workspace_id, route, status,
  latency_ms, error_code, job_id and event_id.
- Redact Authorization, cookies, password fields and tokens.

Metrics:

- Request rate, p50/p95/p99 latency, 4xx and 5xx rate.
- DB pool saturation, slow query count and transaction errors.
- Queue depth, retry count, oldest queued job age and failed jobs.
- Notification success/failure counts by provider.
- Storage usage and abandoned upload count.

Tracing:

- Trace request -> service -> DB query -> outbox -> worker (where
  trace propagation is supported).

Health:

- /health/live checks process liveness only.
- /health/ready checks essential dependencies and exposes safe status.
- Do not expose secrets or internal DB topology through health route.

Runbooks:

- Queue outage.
- Email provider failure.
- Abnormal auth failure spikes.
- Database migration rollback.
- S3 unauthorized access incident.

## 14. Test Plan

Unit tests:

- Role policies and authorization matrix.
- Validation, password/token helpers, status transitions.
- Notification-event handlers and idempotency logic.

Integration tests (real disposable dependencies):

- Postgres transactions and unique constraints.
- Refresh rotation/replay detection.
- Cross-workspace and cross-project access denial.
- Invitation expiry, duplicate accept and membership changes.
- Concurrent task updates returning 409 appropriately.
- Task creation with outbox record in one transaction.
- Worker dedupe, retries and failure handling.
- Signed attachment flows with mocked/emulated object storage.

End-to-end API contract tests:

- Register -> verify -> login -> create workspace -> project -> invite
  -> accept -> assign task -> complete subtask -> notify.
- Admin removes user -> removed user cannot read task or download file.

Property/security tests:

- Fuzz inputs and IDs.
- Authorization test matrix across roles/resources.
- Large payloads, bad file types, expired tokens, repeated requests.
- Dependency and secret scans.

Load tests:

- Seed realistic users/projects/tasks.
- Measure baseline GET/list, POST, and mixed read/write workloads.
- Report test environment, VUs, duration, dataset size, p95, error rate.
- No unsupported "handles 10,000 requests" claim.

## 15. Ci/Cd And Deployment

Repository proposal:
project-camp/
apps/
api/
worker/
packages/
config/
database/
contracts/
auth/
observability/
infrastructure/
docker/
deployment/
docs/
architecture/
adr/
api/
runbooks/
tests/
integration/
e2e/
load/
.github/workflows/

Pipeline on pull request:

- lint, TypeScript typecheck, tests, package audit, build.
- Integration tests with PostgreSQL/Redis containers.
- API schema validation and schema migration checks.

Deployment pipeline:

- Build/push versioned Docker images.
- Run migration safely with rollback/restore plan.
- Deploy API + worker, verify readiness and smoke tests.
- Separate dev/staging/production config.
- Use secret manager for keys and credentials.
- Backup database, test restoration periodically.
- Set environment-specific storage bucket, mail domain, CORS origins.

Operational concerns:

- Graceful SIGTERM handling.
- Connection pooling and worker concurrency limits.
- Horizontal API scaling only after load profiling.
- Worker scaling independently of API.
- Log retention and data deletion policy.

## 16. Implementation Milestones And Acceptance Gates

M0 - Architecture decisions and scaffold
DELIVER: module boundaries, ERD, ADRs, OpenAPI draft, Docker Compose,
seed data, lint/typecheck/test harness.
PASS WHEN: new developer can start API + DB + Redis locally and run tests.

M1 - Identity and workspace tenancy
DELIVER: auth lifecycle, sessions, workspace roles, project roles,
owner bootstrap, project membership.
PASS WHEN: unauthorized access tests pass, including cross-tenant IDs,
revoked memberships and refresh-token replay.

M2 - Original PRD feature completeness
DELIVER: projects, members, tasks, subtasks, notes, validation,
filter/pagination and initial secure attachments.
PASS WHEN: all original PRD behaviors have documented test cases;
original admin/project_admin/member rules are unambiguous.

M3 - Collaboration product features
DELIVER: comments, mentions, due dates, priorities, activity timeline,
dashboard counts and notification preferences.
PASS WHEN: complete user journey works for two distinct project teams.

M4 - Reliable asynchronous workflows
DELIVER: outbox, BullMQ dispatcher/consumers, email, retries,
idempotency keys, operator failure view.
PASS WHEN: injected crashes/outages do not silently lose a committed
notification event and duplicate events are handled safely.

M5 - Concurrency and file security
DELIVER: version-based conflict protection, transactions, signed S3
uploads, file validation, cleanup worker.
PASS WHEN: concurrent update and unauthorized file-download tests pass.

M6 - Performance and observability
DELIVER: useful indexes, baseline and optimized benchmark, dashboards,
alarms, logs/traces, runbooks.
PASS WHEN: measured bottlenecks and tradeoffs documented with reproducible
data and no cross-tenant cache leaks.

M7 - Production release and portfolio proof
DELIVER: deployment, CI/CD, backups and restore drill, threat-model
summary, architecture diagrams, API docs and demonstration.
PASS WHEN: deployed demo survives smoke tests and README explains
engineering decisions, failures, tradeoffs and measured results.

OPTIONAL M8 - Developer-specific market features
DELIVER: sprint/cycle API, GitHub webhooks, automatic PR-task linking,
saved filters and webhook delivery history.
PASS WHEN: webhooks are authenticated, replay-safe and idempotent.

## 17. Portfolio / Resume Deliverables

GitHub repository must include:

- Clear README with problem, boundaries and local boot instructions.
- System architecture diagram and relationship/entity diagram.
- API reference and sample authenticated workflows.
- Permission matrix with examples of allowed/denied requests.
- Transactional outbox and queue failure-mode explanation.
- Concurrency design and 409 conflict demo.
- Storage security diagram with presigned upload flow.
- Test command and CI results.
- Reproducible load-test report: baseline vs improvement.
- Screenshots of logs/metrics dashboards and deployed health endpoint.
- Deployment and rollback notes; meaningful architectural decisions.

Example resume bullets (USE ONLY AFTER IMPLEMENTATION):

- Engineered a multi-tenant project management REST API with scoped
  authorization, rotating refresh sessions and audited role changes.
- Implemented transactional outbox and idempotent background workers
  for resilient task notifications across service failures.
- Built secure private-object attachment workflows using presigned S3
  URLs, upload validation and lifecycle cleanup.
- Optimized [specific query] from [measured baseline] to [measured
  result] under [reproducible workload] via [actual indexing/cache change].

Never claim throughput, uptime or scale that was not observed.

## 18. Optional Commercial Product Roadmap

This is a COMPETITIVE market. Commercial viability requires a narrow
customer segment and a differentiator, not just copying Jira/ClickUp.

Potential market positioning:
"An uncomplicated project hub for small engineering teams that need
secure permissions, GitHub-connected work tracking and reliable updates
without an oversized enterprise tool."

First user-facing differentiators worth considering:

- Fast issue creation, keyboard-first filters and useful templates.
- Transparent activity history and permission visibility.
- Workflows that connect GitHub PRs with tasks.
- Developer-friendly API and outbound webhooks.
- Simple, understandable pricing and resource quotas.

Potential monetization experiment (HYPOTHETICAL, NOT MARKET QUOTES):

- Free: capped projects/storage and small team.
- Team: seat-based paid access to advanced notifications, reporting,
  guest collaborators and integrations.
- Business: audit export, retention options, more automation quota.

Do NOT build subscription billing before validating team usage and
support costs. Separate product monetization from resume scope.

Market references (official published pages, reviewed Oct 2026):

- ClickUp: https://clickup.com/pricing
- Jira: https://www.atlassian.com/software/jira/jira/pricing
- Asana: https://asana.com/pricing
- Linear: https://linear.app/pricing
- Trello: https://trello.com/en/pricing
- monday.com: https://monday.com/pricing

All vendors have paid tiers with more functionality than the supplied
PRD, including some combination of dashboards, workflow automations,
advanced views, integrations, AI or enterprise governance.

## 19. Key Risks / Tradeoffs

- Scope explosion: keep P2/P3 optional; finish M0-M7 first.
- Misconfigured RBAC: centralize policy logic and test every resource.
- Stale cache after revocation: never rely solely on stale cached grants.
- Duplicate emails: at-least-once queues require side-effect safeguards.
- Token theft: session rotation, secure cookies, expiration and logs.
- File abuse: quotas, validation, scanning and private access.
- Complex migrations: version schema, back up and rehearse rollback.
- Weak portfolio proof: document reproducible benchmarks and failures.
- Overengineering: maintain a modular monolith until actual constraints
  require separate services.

## 20. Definition Of Done - Advanced Backend

The project can credibly be described as advanced when:
[ ] All v1.0 original PRD features work and are tested.
[ ] Workspace and project authorization are correct and isolated.
[ ] Auth sessions handle refresh rotation/reuse and revocation.
[ ] File access remains private and identity/permission-bound.
[ ] Critical writes have transactions, constraints and race protection.
[ ] Queue/outbox failures are recoverable without silent event loss.
[ ] Background consumers are idempotent for duplicated events.
[ ] API has OpenAPI docs, consistent errors and paginated queries.
[ ] CI tests against real database/queue dependencies.
[ ] Production logs, metrics, readiness and runbooks exist.
[ ] Load-test data shows measured latency and concrete improvements.
[ ] Deployment can be reproduced and failures can be debugged.
[ ] README explains tradeoffs and includes an architecture diagram.

**Final principle:**
Advance the project through observable engineering quality, not by
adding trendy infrastructure. A carefully built, measured modular
monolith is a better SDE-1 portfolio project than an untested pile of
microservices.

## 21. Edge Cases and State-transition Policies

### 21.1 Concurrent edits to the same task

**Scenario:** A and B load task version `5`. A updates the title. B edits an old copy and submits it later.

**Policy:** Require an `If-Match`/expected version on changes to mutable task content, backed by an **atomic conditional update**. A commits version `6`; B receives `409 Conflict` with the latest version/metadata or a safe reload link. Clients may retry only after reconciling their edits. Version checking must happen inside the database mutation, not only in application memory.

```sql
UPDATE tasks
SET title = $1, version = version + 1, updated_at = NOW()
WHERE id = $2 AND project_id = $3
  AND version = $4 AND deleted_at IS NULL
RETURNING id, version;
```

A zero-row result requires follow-up classification (missing/deleted, inaccessible, or stale). This example assumes the authorization rule has already been enforced consistently with the write transaction.

### 21.2 Reassignment during edits

**Scenario:** User A is editing a subtask while an admin reassigns its parent task to B.

**Policy:** Parent task reassignment **does not automatically reassign subtasks**. Capture old/new assignee in append-only audit history. Queue notifications for both affected users when relevant, and recheck current recipient membership and assignment before worker delivery. Authorization for A's pending update is revalidated at commit, not merely when the request begins. Comments/history remain intact.

### 21.3 Deletion while notifications are pending

**Scenario:** A task is assigned and then deleted before its assignment email is sent.

**Policy:** Mark `deleted_at`; retain data during a configured recovery window. Worker resolves current task status before sending mutable-state notices. Skip obsolete assignment/reminder notifications. Already-sent external emails cannot be recalled. Existing in-app entries may be marked superseded and task links must resolve safely. An audit event records deletion. Attachment access expires/is revoked through application authorization; cleanup is scheduled and retried.

### 21.4 Membership revoked during an in-flight write

**Scenario:** A project admin starts a task mutation, and the workspace owner removes that administrator.

**Policy:** Serialize the relevant membership revocation and protected write using transaction locking or an equivalent database consistency strategy. Either the write commits before revocation, or it is denied after revocation. JWT validity alone is insufficient. Include a reproducible concurrency integration test.

### 21.5 Additional edge-case test matrix

| Scenario                                             | Required behavior                                                    | Test focus              |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ----------------------- |
| Two admins remove the same member                    | Second operation becomes safe no-op or defined conflict              | Idempotence             |
| Last workspace owner attempts to leave               | Reject or require ownership transfer                                 | Governance invariant    |
| Assign task to user outside project                  | Reject                                                               | Tenant integrity        |
| Client retries task creation after timeout           | Deduplicate with scoped idempotency key                              | Safe retries            |
| Two workers process same event                       | Avoid duplicate DB side effects; guard external sends where possible | Consumer deduplication  |
| Email provider unavailable                           | Retry with backoff; eventually dead-letter/inspect                   | Failure recovery        |
| Outbox dispatcher crashes after enqueue              | Reprocessing safe                                                    | At-least-once delivery  |
| Upload completes after task deletion                 | Reject attachment finalization and purge orphan                      | Storage reconciliation  |
| Concurrent subtask completion                        | One effective state change; no duplicate activity entry              | Atomic transitions      |
| Parent task deleted during subtask update            | Fail closed; no orphan operations                                    | Referenced state        |
| Project archived during writes                       | Block prohibited mutations                                           | Lifecycle transitions   |
| Permission revoked while cached                      | Database-backed authorization remains authoritative                  | Cache safety            |
| Cross-project URL uses valid foreign task ID         | Return safe 404/403; never leak details                              | IDOR prevention         |
| Signed attachment URL remains valid after revocation | Bound its short expiry; consider proxy delivery for immediate cutoff | URL revocation tradeoff |
| Pagination while tasks are inserted/deleted          | Stable sort with cursor                                              | Pagination consistency  |
| Two users reorder Kanban cards                       | Transactionally resolve order key collision                          | Ordering consistency    |
| Duplicate GitHub webhook delivery                    | Signature + replay protection + event-id dedup                       | Webhook idempotency     |
| Reset password while sessions active                 | Invalidate appropriate existing sessions                             | Session security        |

### 21.6 Required state models

- **Task:** `todo → in_progress → done`, with reopening allowed only under documented role policy; deletion and archiving are separate lifecycle flags, not task statuses.
- **Project:** `active → archived → deleting → purged` (restoration from archived; deletion recovery policy explicitly set).
- **Attachment:** `pending → uploaded → scanning → ready`, with `rejected`, `failed`, `deleted` terminal/exception outcomes and cleanup retries.
- **Invitation:** `pending → accepted`, `expired`, or `revoked`; acceptance consumes its one-time token.
- **Notification:** `pending → processing → delivered`, `superseded`, or `failed`; channel attempts tracked separately.

## 22. User Journeys and Acceptance Scenarios

1. **First use:** verified user signs up, creates a workspace, becomes owner, creates a project, and adds a project admin and member.
2. **Team workflow:** project admin creates a task with an assignee, due date, priority, notes, subtasks, and a private attachment; invited member completes only their own subtask.
3. **Collaboration:** members add comments, mention teammates with project access, receive deduplicated in-app/email notifications, and see the activity history.
4. **Concurrency:** two simultaneous conflicting writes produce one commit and one `409`, without lost updates.
5. **Security:** team A cannot read team B's projects/tasks/files using known IDs or guessed signed-upload flows.
6. **Fault tolerance:** crash a worker during notification processing; committed task/event remains recoverable with no silent loss.
7. **Revocation:** remove a member during an update; post-revocation writes are rejected according to the transaction ordering rule.
8. **Deletion:** delete a task after queuing assignment; obsolete notification is suppressed, links cannot expose data, and unreferenced files are eventually cleaned up.
9. **Operations:** CI exercises database and Redis dependencies; deployment provides liveness/readiness, logs, metrics, and a reproducible backup/restore drill.
10. **Portfolio:** README includes architecture, ER diagram, trade-off ADRs, threat model, actual load-test measurements and results rather than invented scale claims.

## 23. Commercial Features vs Portfolio Scope

**Relevant competitors:** Jira, Linear, ClickUp, Asana, Trello, and monday.com. Public pricing changes over time; verify current official pages before choosing commercial pricing. Links are included under the optional commercial roadmap.

| Capability                                                 | Release priority | Reason                                  |
| ---------------------------------------------------------- | ---------------- | --------------------------------------- |
| Boards, status filtering, assignment, comments, audit feed | P1               | Usable collaboration core               |
| Notifications, reliable reminders, file storage            | P1               | Strong backend and real-user value      |
| Sprints/cycles, GitHub pull-request linking                | P2               | Developer-focused differentiation       |
| Custom status workflows and automation rules               | P2               | Commercial utility; state complexity    |
| Reporting, workloads, time tracking                        | P2               | Team visibility; more data modeling     |
| AI summaries and task drafting                             | P3               | Optional, needs privacy/usage controls  |
| Subscriptions/billing/SSO                                  | P3               | Build only after usage validates demand |

**Commercial strategy:** initially target small software teams who value clarity and developer integrations. Do not claim Noryx is production-ready, domain-cleared, or price-competitive until validated. Portfolio scope and customer-facing product scope are distinct.

## 24. Execution Order — Practical Checklist

- [ ] Finalize ERD, access-control matrix, state transitions, invariants, and ADRs.
- [ ] Scaffold local Docker Compose with API, PostgreSQL, Redis and worker.
- [ ] Implement identity, sessions, workspace owner bootstrap and resource-scoped RBAC.
- [ ] Finish all inherited PRD CRUD workflows with integration tests.
- [ ] Add comments, mentions, activity logs, filtering and cursor pagination.
- [ ] Implement transactionally consistent writes, task version checks and idempotency keys.
- [ ] Implement outbox, dispatcher, BullMQ worker, retries and failure inspection.
- [ ] Implement private uploads/downloads, scanning or validation, and orphan cleanup.
- [ ] Add dashboards, metrics, traces, rate limits and security checks.
- [ ] Run race-condition, authorization and worker-failure tests.
- [ ] Deploy via CI/CD, run restore drill, and measure reproducible performance.
- [ ] Publish verified architecture, API docs, tests, walkthrough and measured results.
