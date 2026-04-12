# Kubrick Application Documentation

Kubrick is an AI-assisted recruiting platform for organizations that need to publish jobs, collect applications, parse resumes, manage candidates, run candidate-to-job matching, and move applicants through a hiring pipeline.

This page is the current high-level documentation for the repository. It is intended as a single handoff page for product behavior, architecture, runtime setup, security posture, and the main code locations.

## Repository Map

- `backend/`: FastAPI API, SQLAlchemy models, Alembic migrations, resume/job parsers, matching services, tests, and backend scripts.
- `frontend/`: Vite + React + TypeScript app for the recruiter dashboard and public career pages.
- `deploy/`: Nginx, systemd, setup, and deployment scripts for production-style hosting.
- `docs/`: Application documentation, including this overview and CSRF/auth notes.
- `test-all.sh`: Combined backend and frontend test runner.

## Product Surface

Kubrick has two frontend modes:

- Dashboard app: authenticated recruiter/admin workspace at normal app hosts such as `localhost` or `app.kubrick.app`.
- Public career app: unauthenticated organization career pages selected by subdomain, such as `{orgSlug}.kubrick.app`, or by path fallback `/{orgSlug}`.

Core user-facing flows:

- Authentication and profile onboarding: registration, email verification, password login, OTP login, password reset, email change verification, logout, and profile completion.
- Organization management: profile/branding, logo upload, organization users, invites, career page settings, application form settings, and matching configuration.
- Job management: create, edit, list, view, close/draft/open jobs, maintain slug/category/work arrangement/employment metadata, write structured bullet sections, and parse requirements.
- Candidate management: create/edit/delete candidates, upload resumes, bulk upload resumes, view parsed work/education/skills data, and inspect candidate detail.
- Matching and ranking: parse job requirements, calculate candidate-job match scores, view ranked candidates, inspect match details, see skill gaps, and tune matching weights.
- Pipeline: view job-specific or global hiring pipeline lanes, add eligible candidates as applicants, and move applications through stages.
- Public career pages: display organization branding and public jobs, resolve effective application form settings, accept applications with resume uploads, and create candidate/application records.

## Backend Architecture

The backend is a FastAPI application in `backend/app/main.py`.

Runtime responsibilities:

- Loads `.env` before app construction.
- Configures JSON/plain logging from `LOG_LEVEL` and `LOG_FORMAT`.
- Adds rate limiting with `slowapi`.
- Adds proxy, CORS, security, and request-size middleware.
- Mounts uploaded files at `/uploads`.
- Wires API routers under `/api/*`, with health checks exposed at `/health*`.

Main backend packages:

- `backend/app/api/`: REST routers.
- `backend/app/core/`: auth, RBAC, validation, file security, email, logging, exceptions, password and OTP helpers.
- `backend/app/db/models/`: SQLAlchemy entities and relationships.
- `backend/app/schemas/`: Pydantic request/response schemas.
- `backend/app/services/`: candidate matching, job description parsing, LLM resume parsing, application form resolution, and match scoring.
- `backend/alembic/versions/`: schema migrations.

Important services:

- `LLMResumeParser`: extracts structured resume data using OpenAI-compatible chat completions with strategy selection for simple, detailed, multilingual, and technical resumes.
- `JobDescriptionParser`: extracts required skills, nice-to-have skills, experience, education, location, and primary skills from job descriptions.
- `MatchScoreCalculator`: calculates weighted match scores from skills, experience, education, and additional factors; supports synonym, fuzzy, TF-IDF, and primary-skill penalties.
- `CandidateMatchingService`: manages candidate-job match persistence, recalculation, ranked candidates, and organization-specific matching config.
- `application_form_resolution`: merges organization default form config with per-job overrides for public applications.

## Frontend Architecture

The frontend is a Vite + React + TypeScript app in `frontend/`.

Key entrypoints:

- `frontend/src/App.tsx`: detects a career subdomain and chooses the app shell.
- `frontend/src/MainApp.tsx`: dashboard, auth, settings, legal pages, and path-based career fallback.
- `frontend/src/CareerApp.tsx`: minimal public career page shell for subdomain career pages.
- `frontend/src/utils/api.ts`: authenticated API client and refresh handling.
- `frontend/src/utils/publicApi.ts`: public career API client.
- `frontend/src/components/ProtectedRoute.tsx`: session validation and protected routing.

Main dashboard routes:

- `/dashboard`: overview.
- `/jobs`: job list.
- `/jobs/new`: job creation.
- `/jobs/:jobId`: job detail, matching, applicants, and form settings.
- `/pipeline`: hiring pipeline.
- `/candidates`: candidate list.
- `/candidates/:candidateId`: candidate detail.
- `/settings/profile`: user profile.
- `/settings/organization`: organization profile, branding, and team settings.
- `/settings/career-page`: public career page and application form settings.
- `/settings/matching`: matching algorithm configuration.

Public and auth routes:

- `/register`, `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`.
- `/privacy`, `/terms`.
- `/{orgSlug}` and `/{orgSlug}/{jobSlug}` as non-subdomain public career fallback.

Frontend state/data patterns:

- React Query powers most server state hooks in `frontend/src/hooks/`.
- Redux slices exist for auth/jobs in `frontend/src/store/`.
- UI components are primarily local shadcn/Radix-style components under `frontend/src/components/ui/`.
- Dashboard layouts live in `frontend/src/layouts/`.

## Data Model

Primary tenant boundary:

- `Organization`: owns users, jobs, candidates, invites, matching config, application form config, and custom form fields.
- `User`: belongs to an organization and has role/status/profile/auth metadata.

Recruiting entities:

- `Job`: belongs to an organization and owner; stores job metadata, public slug, description, structured bullet sections, status, work arrangement, and matching-related fields.
- `Candidate`: belongs to an organization; stores contact info, parsed resume data, notes, resume files, work experiences, job applications, and match records.
- `JobApplication`: connects one candidate to one job with a unique candidate/job pair, pipeline status, match score summary fields, cover letter, custom field responses, and recruiter notes.
- `CandidateJobMatch`: persisted detailed score record for a candidate/job pair.
- `JobRequirement`: parsed structured requirements for a job.
- `ApplicationFormConfig`, `CustomFormField`, `JobApplicationFormSettings`: organization defaults and per-job overrides for public application forms.
- `MatchingAlgorithmConfig`: organization-specific scoring weights and algorithm settings.
- `CandidateFile`: uploaded resume/file metadata.
- `Invite`, `RefreshToken`, `OTPCode`, `TokenBlacklist`: collaboration and authentication support tables.

Pipeline stages currently use: `applied`, `screening`, `interview`, `offer`, `hired`.

## API Map

Base URL is configured in the frontend as `VITE_API_URL`, typically `http://localhost:8000/api`.

Health:

- `GET /health`
- `GET /health/detailed`
- `GET /health/ready`
- `GET /health/live`

Auth (`/api/auth`):

- `POST /register`
- `POST /complete-profile`
- `POST /login-password`
- `POST /request-code`
- `POST /resend-verification`
- `POST /verify-code`
- `POST /refresh`
- `POST /me/resend-verification`
- `POST /me/request-email-change`
- `POST /me/resend-email-change`
- `POST /me/confirm-email-change`
- `POST /me/change-password`
- `GET /me`
- `PUT /me`
- `POST /logout`
- `POST /forgot-password`
- `POST /reset-password`

Organizations (`/api/organizations`):

- `GET /me`
- `PUT /me`
- `POST /me/logo`
- `DELETE /me/logo`
- `GET /me/users`
- `PATCH /me/users/{user_id}`
- `POST /me/invite`

Application form defaults (`/api/organizations/me/application-form`):

- `GET /`
- `PUT /config`
- `POST /fields`
- `PUT /fields/{field_id}`
- `DELETE /fields/{field_id}`
- `PUT /fields/reorder`

Matching config (`/api/organizations/me/matching-config`):

- `GET /`
- `PUT /`

Jobs (`/api/jobs`):

- `GET /`
- `POST /`
- `GET /{job_id}`
- `PUT /{job_id}`
- `DELETE /{job_id}`
- `GET /{job_id}/application-form`
- `PUT /{job_id}/application-form`
- `POST /{job_id}/parse-requirements`
- `GET /{job_id}/requirements`
- `PUT /{job_id}/requirements`
- `POST /{job_id}/calculate-matches`
- `GET /{job_id}/ranked-candidates`
- `POST /{job_id}/bulk-score`

Candidates (`/api/candidates`):

- `GET /`
- `POST /`
- `GET /{candidate_id}`
- `PUT /{candidate_id}`
- `DELETE /{candidate_id}`
- `GET /{candidate_id}/job-matches`
- `POST /{candidate_id}/recalculate-matches`

Pipeline and job applications:

- `GET /api/jobs/{job_id}/pipeline`
- `GET /api/jobs/{job_id}/pipeline/eligible-candidates`
- `POST /api/jobs/{job_id}/pipeline/applicants`
- `GET /api/pipeline`
- `PATCH /api/job-applications/{application_id}/stage`

Matches (`/api/matches`):

- `GET /{candidate_id}/{job_id}`
- `GET /{candidate_id}/{job_id}/skills-gap`
- `POST /{candidate_id}/{job_id}/recalculate`
- `GET /statistics/{organization_id}`

Files (`/api/files`):

- `GET /download/{file_id}`
- `POST /upload-resume-create-candidate`
- `POST /upload-resume/{candidate_id}`
- `POST /bulk-upload-resumes`

Dashboard:

- `GET /api/dashboard/stats`

Public careers (`/api/careers`):

- `GET /{org_slug}`
- `GET /{org_slug}/{job_slug}`
- `POST /{org_slug}/{job_slug}/apply`

## Authentication, Authorization, and Security

Authentication uses short-lived JWT access tokens plus refresh-token rotation through httpOnly cookies. The frontend checks the current session with `GET /api/auth/me`; the API client refreshes via `POST /api/auth/refresh` on expired access.

Security controls present in code:

- Password hashing and password-change flow in `backend/app/core/password_security.py` and `backend/app/api/auth.py`.
- OTP flows and rate limiting for verification, login, password reset, and email changes.
- Refresh-token persistence and token blacklist support.
- `SecurityMiddleware` and `RequestSizeMiddleware`, with a 50 MB request-size default in `backend/app/main.py`.
- File upload validation in `backend/app/core/file_security.py`.
- CORS allowlist plus subdomain regex support for career pages.
- Organization/tenant scoping via `require_org_member` for B2B routes where tenant isolation matters.
- RBAC helpers for admin/recruiter-style checks.

CSRF note: because auth uses cookies, SameSite and CORS settings matter. See `docs/CSRF-and-auth.md` for the current posture and hardening options.

## Configuration

Backend config is copied from `backend/.env.example` to `backend/.env`.

Key backend variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT settings.
- `RESEND_API_KEY`, `FROM_EMAIL`: email delivery.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, `OPENAI_TIMEOUT`: LLM parsing.
- `RESUME_PARSER_STRATEGY`: parser strategy, commonly `llm_with_fallback`.
- `ENVIRONMENT`, `DEBUG`, `ALLOWED_ORIGINS`.
- `AUTH_COOKIE_DOMAIN`, `AUTH_COOKIE_SAMESITE`: cookie scope and SameSite behavior.
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_DEFAULT`.
- `LOG_LEVEL`, `LOG_FORMAT`.

Frontend config is copied from `frontend/.env.example` to `frontend/.env`.

Key frontend variable:

- `VITE_API_URL`: API base URL with `/api` suffix, for example `http://localhost:8000/api`.

## Local Development

Backend:

```bash
cd backend
./run.sh
```

`backend/run.sh` expects a virtual environment at `backend/.venv` and starts Uvicorn on `http://localhost:8000`.

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Vite usually starts on `http://localhost:5173`.

Database:

- Configure PostgreSQL via `DATABASE_URL`.
- Apply schema migrations with Alembic from `backend/` when needed.
- The repository also contains helper scripts such as `backend/scripts/seed_realistic_data.py` and `backend/scripts/delete_user_by_email.py`.

## Testing

Run everything:

```bash
./test-all.sh
```

Backend only:

```bash
cd backend
./test.sh
```

The backend test script installs `backend/test_requirements.txt`, runs `pytest tests/`, generates coverage in `backend/htmlcov/`, and enforces 80 percent coverage.

Frontend only:

```bash
cd frontend
npm test -- --run
```

Other frontend scripts:

- `npm run build`
- `npm run lint`
- `npm run preview`
- `npm run test:coverage`

## Deployment

Deployment artifacts live in `deploy/`:

- `deploy/setup.sh`: server/bootstrap setup.
- `deploy/deploy.sh`: deployment workflow.
- `deploy/nginx/kubrick.conf`: Nginx site config.
- `deploy/kubrick-api.service`: systemd service for the API.

Production deployment needs coordinated frontend/API origins, HTTPS, cookie settings, `ALLOWED_ORIGINS`, database credentials, email credentials, and OpenAI credentials.

## Current Implementation Notes

- This checkout has no `landing/` directory, so the active documented apps are the FastAPI backend and Vite/React frontend.
- Public career pages are supported through both subdomain detection and path fallback.
- Job application forms can be organization-wide defaults or per-job custom settings.
- Matching requires parsed job requirements before useful candidate/job scoring can be persisted.
- Uploaded assets and resumes are served from `/uploads` on the API process.

## Where to Start in Code

- Backend app setup: `backend/app/main.py`
- Backend routers: `backend/app/api/`
- Backend models: `backend/app/db/models/`
- Matching logic: `backend/app/services/candidate_matching_service.py` and `backend/app/services/match_score_calculator.py`
- Resume parsing: `backend/app/services/llm_resume_parser.py`
- Job parsing: `backend/app/services/job_description_parser.py`
- Application form resolution: `backend/app/services/application_form_resolution.py`
- Frontend routing: `frontend/src/App.tsx`, `frontend/src/MainApp.tsx`, `frontend/src/CareerApp.tsx`
- Auth/session client behavior: `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/utils/api.ts`
- Public career API client: `frontend/src/utils/publicApi.ts`
- Pipeline UI: `frontend/src/pages/Pipeline.tsx`, `frontend/src/components/PipelineBoard.tsx`
- Job UI: `frontend/src/pages/Jobs.tsx`, `frontend/src/pages/JobDetail.tsx`, `frontend/src/pages/CreateJob.tsx`
- Candidate UI: `frontend/src/pages/Candidates.tsx`, `frontend/src/pages/CandidateDetail.tsx`
- Settings UI: `frontend/src/pages/settings/`
