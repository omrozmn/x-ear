1. Product discovery & scope
	•	User stories, success criteria (OKRs/KPIs), draft data model
	•	Simple architecture diagram (frontend, API, DB, cache, 3rd-party)

	Status: Partial / In progress — Evidence: `docs/specs.md`, `docs/modular-architecture-plan.md`, `docs/automation-specs.md` contain KPIs and architecture notes. Next: Finalize OKRs, consolidate data model into a single `docs/data-model.md` and attach example ERD.

	# Ticket: tickets/0001-finalize-okrs-and-data-model.md — finalize OKRs and consolidate data model (Critical)

2. Design
	•	Figma: flows, screens, component library + design tokens
	•	Accessibility (A11y) and responsive rules

	Status: Partial — Evidence: `design-examples/` HTML mockups, Tailwind setup (`tailwind.config.js`), UI pages under `public/` and `src/`. Figma files not present. Next: Create a Figma component library and extract design tokens into `design/` or `src/styles/tokens`.

	# Ticket: tickets/0002-create-figma-component-library.md — create Figma component library and extract design tokens (High)

3. Technical foundation
	•	Monorepo structure + package management
	•	Code standards: ESLint/Prettier, Black/Flake8, commit convention
	•	Environment variables schema (.env.example), secret management (env vars/secrets)

	Status: Mostly done — Evidence: monorepo layout (`backend/`, `src/`), `package.json`, `.eslintrc.json`, `prettier` in `package.json`, `backend/.env.example` and `backend/.env`. Next: Enforce lint/type checks in CI and add a `CONTRIBUTING.md` with commit conventions.

	# Ticket: tickets/0003-enforce-lint-typecheck-ci.md — enforce lint/type-check in CI (High)
	# Ticket: tickets/0004-add-contributing-md.md — add CONTRIBUTING.md with commit conventions (Medium)

4. Backend skeleton
	•	Flask/FastAPI + SQLAlchemy (or Prisma equivalent)
	•	DB schema & migration (Alembic)
	•	OpenAPI/Swagger schema (contract → frontend)
	•	Validation (pydantic/marshmallow) + consistent response envelope
	•	Auth (JWT/role), rate-limit (Redis), logging

	Status: Done (core) — Evidence: `backend/app.py`, blueprints under `backend/routes/`, models in `backend/models.py`, Alembic config and `backend/alembic/`. JWT usage and Redis-friendly OTP store present (`backend/services/otp_store.py`). OpenAPI/Swagger generation not yet present (no `openapi.json` or FastAPI automatic schema). Next: Add an OpenAPI generator or a maintained API contract (e.g. manually add `openapi.yaml` or enable `apispec`).

	# Ticket: tickets/0005-add-openapi-generator.md — add OpenAPI generator or maintained API contract (Critical)
    Implementation note: `openapi.yaml` (expanded) now exists at repo root and is served by the backend at `/api/openapi.yaml`. CI validates the contract with `npx swagger-cli validate openapi.yaml` on PRs. Consider follow-up ticket to automate generation or keep manual maintenance.

5. Frontend skeleton
	•	React/TS (or Next) + single apiClient + zod validation
	•	State management, routes, UI kit (Tailwind/shadcn)
	•	API_BASE_URL from .env (runtime config)

	Status: Done (core) — Evidence: `src/` TypeScript domain modules, `src/managers/api-client.ts`, `tailwind.config.js`, `package.json` scripts. Runtime `API_BASE_URL` patterns and `public/assets/js/api-config.js` exist. Next: Extract a shared UI component library and document runtime config in `README`.

	# Ticket: tickets/0006-extract-shared-ui-library.md — extract shared UI component library and document runtime config (Medium)

6. Testing strategy
	•	Unit (FE+BE), contract tests (schema), integration (pytest), E2E (Playwright/Cypress)
	•	Test data/seed, coverage thresholds

	Status: Substantial coverage (in progress) — Evidence: many `backend/*test_*.py` pytest files, `tests/`, `.github/workflows/contract-tests.yml`, smoke tests (`smoke/run-smoke.js`, `smoke/run-smoke-local.py`). Full E2E (Playwright/Cypress) suites are not present; Puppeteer-based smoke tests are used. Next: Add a small Playwright E2E suite for critical flows and enforce coverage thresholds in CI.

	# Ticket: tickets/0007-add-playwright-e2e-suite.md — add Playwright E2E suite for critical flows and enforce coverage thresholds (High)

7. CI/CD (set up while coding)
	•	Mandatory lint + test + build
	•	Security scanning (Bandit, npm audit)
	•	Versioning & changelog

	Status: In place for tests/smoke (in progress) — Evidence: `.github/workflows/contract-tests.yml`, `.github/workflows/smoke-tests.yml`, `package.json` scripts for lint/test/build. Security scanning and enforced lint/build steps are not yet mandatory in every workflow. Next: Add a `ci.yml` workflow that runs `npm run lint`, `npm run type-check`, `python -m pytest` and security scans on PRs.

	# Ticket: tickets/0008-add-ci-workflow.md — add ci.yml workflow for lint, type-check, tests, and security scans (Critical)

8. Local development
	•	Docker Compose: web + api + db + redis + ocr-service
	•	Makefile/NPM scripts (dev, test, seed, migrate)

	Status: Done — Evidence: `docker-compose.yml` with db, redis, backup and app services; `Makefile` and `package.json` scripts including `dev`, `smoke:local`, and migration scripts under `backend/scripts`. Next: Document local environment setup in `README.md` with sample `.env` and quick-start commands.

	# Ticket: tickets/0009-document-local-setup.md — document local environment setup in README.md (Medium)

9. Staging (more than “just dockerize”)
	•	Separate DB/Redis, separate secrets
	•	Canary/preview deploy, feature flags
	•	Smoke tests and E2E run automatically

	Status: Partially done (docs + dockerized staging) — Evidence: `stage-on-docker.md`, `docker-readiness-analysis.md`, CI smoke workflows. Infrastructure-as-code and automated preview deploys are not present. Next: Implement preview environments (e.g., via PR preview or ephemeral stacks) and wire feature flags for risky changes.

	# Ticket: tickets/0010-implement-preview-environments.md — implement preview environments and feature flags (High)

10. Observability
	•	App logs (JSON), error tracking (Sentry)
	•	Metrics (req/s, p95), health check endpoint
	•	Alerts thresholds

	Status: Partial — Evidence: Health endpoints (`/api/health`) and health logic in `backend/routes/ocr.py`, frontend health integration (`public/assets/js/api-config.js`), system health code (`src/domain/domain-manager.ts`). External error tracking (Sentry) and metrics/alerting not configured yet. Next: Add structured JSON logging and integrate Sentry/Prometheus+Alertmanager for errors and p95 latency.

	# Ticket: tickets/0011-integrate-sentry-prometheus.md — integrate Sentry and Prometheus+Alertmanager for error tracking and metrics (Critical)

11. Production deploy
	•	Infra as Code (Terraform/Ansible optional)
	•	Blue-green/rolling deploy
	•	Domain/SSL, strict CORS
	•	Backups (DB snapshot), rollback plan

	Status: Partially done (operational docs + backups) — Evidence: `stage-on-docker.md`, `docker-compose.yml` backup service, backup routes and tests (`backend/routes/automation.py`, `tests/backend/test_automation.py`). No IaC or automated blue-green deploys found. Next: Create IaC (Terraform) for infra and scripted deploys (CI) supporting blue-green or rolling strategies.

	# Ticket: tickets/0012-create-iac-and-scripted-deploys.md — create IaC for infrastructure and scripted deploys supporting blue-green or rolling strategies (Critical)

12. Operations
	•	Runbook (what to do in incidents)
	•	Maintenance windows, log rotation
	•	GDPR/Privacy notes, data retention policy
	•	Analytics (event schema), consent banner

	Status: In progress — Evidence: `docs/` contains GDPR/consent notes (`docs/automation-specs.md`), backup/rollback guidance (`docker-readiness-analysis.md`, `stage-on-docker.md`), and some operational scripts. A consolidated runbook is missing. Next: Create `ops/RUNBOOK.md` with incident playbooks, SLOs, and maintenance procedures.

	# Ticket: tickets/0013-create-ops-runbook.md — create ops/RUNBOOK.md with incident playbooks and maintenance procedures (High)

13. Cleanup & debt management
	•	Sunset date for legacy code
	•	No “to-dos later” — move to sprint backlog

	Status: In progress — Evidence: `CLEANUP.md`, `docs/CONSISTENCY-AUDIT.md`, and `src/domain/legacy-bridge.ts` indicate active cleanup work. Next: Add a deprecation schedule in `CLEANUP.md` and convert outstanding TODOs to tracked issues/milestones.

	# Ticket: tickets/0014-add-deprecation-schedule.md — add deprecation schedule in CLEANUP.md and convert TODOs to tracked issues (Medium)

⸻

Your condensed, actionable sequence
	1.	Scope + architecture diagram + data model
		Status: In progress — Evidence: `docs/specs.md`, `docs/modular-architecture-plan.md`. Next: finalize and publish ERD.
	2.	Figma (including component library)
		Status: Not started (design files missing) — Evidence: no Figma export or `design/figma` files. Next: Create Figma and export tokens.
	3.	Repo/CI/CD/standards + env schema
		Status: In progress — Evidence: `.eslintrc.json`, `package.json`, `backend/.env.example`, CI workflows. Next: Enforce lint/type checks in CI.
	4.	Backend skeleton + OpenAPI + migrations
		Status: Done (backend) / OpenAPI: Not started — Evidence: `backend/app.py`, `backend/alembic/`; OpenAPI generator not present. Next: Add OpenAPI contract and publish to `API_ENDPOINTS_DOCUMENTATION.md` or `openapi.yaml`.
	5.	Frontend skeleton + single apiClient + runtime API_BASE_URL
		Status: Done — Evidence: `src/managers/api-client.ts`, `package.json` and `public/` scripts. Next: Bundle and publish a lightweight component library.
	6.	Tests (unit + contract + E2E smoke)
		Status: In progress — Evidence: pytest suite, contract-tests workflow, smoke scripts. Next: Add Playwright E2E for critical flows and enforce passing smoke on PRs.
	7.	Run locally via Docker Compose
		Status: Done — Evidence: `docker-compose.yml`, `stage-on-docker.md`. Next: Add `make run-local` convenience target and dev-seed script.
	8.	Auto-deploy to staging (CI pipeline)
		Status: Not started / Partial — Evidence: CI exists for tests but no deployment steps. Next: Add a `deploy-staging` workflow and secrets manager integration.
	9.	Add monitoring/alerts
		Status: Not started / Partial — Evidence: health endpoints exist; monitoring stack not integrated. Next: Integrate Prometheus + Alertmanager or a SaaS APM (Sentry + Datadog) and add alert rules for errors and latency.
	10.	Deploy to prod with blue-green + rollback plan
		Status: Not started / Partial — Evidence: backup automation and rollback notes in docs, no IaC or automated blue-green deploys. Next: Implement IaC and CI/CD deploy pipelines with safe rollout strategies.

⸻

Notes and quick wins
	•	OpenAPI contract is the highest-impact missing item for frontend/backend collaboration — add a minimal `openapi.yaml` and a GitHub Action to validate it on PRs.
	•	Enforce lint/type-check in CI to prevent regressions (`npm run lint`, `npm run type-check`, `python -m pytest`).
	•	Add a short `ops/RUNBOOK.md` capturing common incidents and recovery steps (DB restore, service restart, clearing caches).
	•	Create a small Playwright smoke test that runs a single critical user journey (login → patient search → open patient) and wire it into the smoke CI job.

⸻

Ticket status & automation

- Created ticket markdown files under `tickets/` for prioritized work (examples):
  - `tickets/0001-finalize-okrs-and-data-model.md`
  - `tickets/0002-create-figma-component-library.md`
  - `tickets/0003-enforce-lint-typecheck-ci.md`
  - `tickets/0004-playwright-smoke-test.md`
  - `tickets/0005-add-openapi-generator.md`
  - `tickets/0015-generate-typescript-client.md`

- Backlog items are under `backlog/` and can be imported as GitHub Issues using the `Create Issues from Backlog` workflow (`.github/workflows/create-issues.yml`) or run locally with `scripts/create_issues_from_backlog.py`.

Final review guidance

- To finalize sprint readiness:
  1. Run the issue-import workflow (or script) and review created Issues in GitHub.
  2. Update each ticket with assignee, milestone, labels (`priority/high`, `backend`, etc.).
  3. Link the resulting GitHub Issue URLs back into this masterplan under the relevant section for traceability.
  4. If the OpenAPI generator produces diffs, review and either update `openapi.yaml` or improve generator coverage.

