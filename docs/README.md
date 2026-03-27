# Kubrick Documentation

Kubrick is an AI-powered resume scanner & candidate ranking platform.

This repository contains three main parts:
- `backend/` - FastAPI API (auth, jobs, candidates, matching, files, public career pages)
- `frontend/` - React SPA dashboard (protected recruiter UI)
- `landing/` - Next.js marketing site

---

## System Overview

### Backend (FastAPI)
- Provides REST endpoints under `/api/*`
- Uses:
  - JWT + httpOnly cookies for auth
  - Refresh token rotation for session continuity
  - Rate limiting via `slowapi`
  - SQLAlchemy + Alembic + PostgreSQL
  - Resume parsing with an LLM strategy and a regex fallback

### Frontend (React)
- Uses React Router with two “modes”:
  - Dashboard app (protected): `frontend/src/MainApp.tsx`
  - Public career pages (subdomain-driven): `frontend/src/CareerApp.tsx`
- Session validation:
  - `frontend/src/components/ProtectedRoute.tsx` calls `GET /api/auth/me`
  - `frontend/src/utils/api.ts` auto-refreshes on `401` via `POST /api/auth/refresh`

### Public Career Pages (subdomain-based)
- `frontend/src/utils/subdomain.ts` extracts `{orgSlug}` from the hostname:
  - Production: `{orgSlug}.kubrick.app`
  - Dev: `{orgSlug}.localhost`
- When detected, the React app renders the public career experience (no auth UI).

---

## Prerequisites

### Local development
- Node.js (for `frontend/` and optional `landing/`)
- Python (for `backend/`)
- A running PostgreSQL database (or configure your own)
- Required env vars (see below)

---

## Configuration (Environment Variables)

### Backend
- Example: `backend/.env.example`
- Key variables:
  - `DATABASE_URL`
  - `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
  - `RESEND_API_KEY`, `FROM_EMAIL`
  - `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, `OPENAI_TIMEOUT`
  - `RESUME_PARSER_STRATEGY` (e.g. `llm_with_fallback`)
  - `ALLOWED_ORIGINS`, `RATE_LIMIT_*`, `LOG_LEVEL`, `LOG_FORMAT`

### Frontend
- Example: `frontend/.env.example`
- Key variable:
  - `VITE_API_URL` (default expected: `http://localhost:8000/api`)

---

## How to Run Locally

### 1) Backend (FastAPI)
From repo root:
1. Create `backend/.env` from `backend/.env.example`
2. Run:
   - `cd backend`
   - `./run.sh`

This starts Uvicorn on `http://localhost:8000`.

### 2) Frontend (React)
1. Create `frontend/.env` from `frontend/.env.example`
2. Run:
   - `cd frontend`
   - `npm ci`
   - `npm run dev`

This starts Vite (typically on `http://localhost:5173`).

### 3) Optional Landing (Next.js)
1. `cd landing`
2. `npm ci`
3. `npm run dev`

---

## Main User Flows

### Auth flow (dashboard app)
1. Register: `POST /api/auth/register`
2. Verify email (OTP):
   - `POST /api/auth/request-code`
   - `POST /api/auth/verify-code`
   - `POST /api/auth/resend-verification`
3. Login:
   - Password login: `POST /api/auth/login-password`
   - OTP login: request + verify code
4. Session refresh:
   - Frontend calls `POST /api/auth/refresh` when access token expires
5. Protected navigation:
   - `GET /api/auth/me` validates the session on route mount
6. Profile completion redirect:
   - `ProtectedRoute` ensures users complete required profile fields

### Recruiter dashboard
1. Dashboard overview
   - `GET /api/dashboard/stats`
2. Jobs
   - List/create/update/delete:
     - `GET /api/jobs/`, `POST /api/jobs/`, `GET|PUT|DELETE /api/jobs/{job_id}`
   - Parse job requirements via AI:
     - `POST /api/jobs/{job_id}/parse-requirements`
3. Candidate management
   - List/create/update/delete:
     - `GET /api/candidates/`, `POST /api/candidates/`, `GET|PUT|DELETE /api/candidates/{candidate_id}`
   - Resume upload and parsing:
     - `POST /api/files/upload-resume-create-candidate`
     - `POST /api/files/upload-resume/{candidate_id}`
4. Matching / ranking
   - Calculate matches for a job:
     - `POST /api/jobs/{job_id}/calculate-matches`
   - Ranked shortlist:
     - `GET /api/jobs/{job_id}/ranked-candidates`
   - Per-candidate job matches and recalculation:
     - `GET /api/candidates/{candidate_id}/job-matches`
     - `POST /api/candidates/{candidate_id}/recalculate-matches`
   - Match details:
     - `GET /api/matches/{candidate_id}/{job_id}`
     - `GET /api/matches/{candidate_id}/{job_id}/skills-gap`

### Public career pages + applications
1. Public job list and details:
   - `GET /api/careers/{org_slug}`
   - `GET /api/careers/{org_slug}/{job_slug}`
2. Submit an application:
   - `POST /api/careers/{org_slug}/{job_slug}/apply`
3. The backend may:
   - create a candidate from the application
   - parse the uploaded resume (LLM + fallback)
   - notify recruiters/candidate via email (Resend)

---

## Backend API Endpoint Map (Quick Reference)

Base prefixes:
- API: `/api/*`
- Health: `/health*` (no `/api` prefix)
- Uploaded files served from: `/uploads/*`

### Health
- `GET /health`
- `GET /health/detailed`
- `GET /health/ready`
- `GET /health/live`

### Auth (`/api/auth`)
- `POST /api/auth/register`
- `POST /api/auth/complete-profile`
- `POST /api/auth/login-password`
- `POST /api/auth/request-code`
- `POST /api/auth/resend-verification`
- `POST /api/auth/verify-code`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats`

### Organizations (`/api/organizations`)
- `GET /api/organizations/me`
- `PUT /api/organizations/me`
- `POST /api/organizations/me/logo`
- `DELETE /api/organizations/me/logo`
- `GET /api/organizations/me/users`
- `POST /api/organizations/me/invite`

### Jobs (`/api/jobs`)
- `GET /api/jobs/`
- `POST /api/jobs/`
- `GET /api/jobs/{job_id}`
- `PUT /api/jobs/{job_id}`
- `DELETE /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/parse-requirements`
- `GET /api/jobs/{job_id}/requirements`
- `PUT /api/jobs/{job_id}/requirements`
- `POST /api/jobs/{job_id}/calculate-matches`
- `GET /api/jobs/{job_id}/ranked-candidates`
- `POST /api/jobs/{job_id}/bulk-score`

### Candidates (`/api/candidates`)
- `GET /api/candidates/`
- `POST /api/candidates/`
- `GET /api/candidates/{candidate_id}`
- `PUT /api/candidates/{candidate_id}`
- `DELETE /api/candidates/{candidate_id}`
- `GET /api/candidates/{candidate_id}/job-matches`
- `POST /api/candidates/{candidate_id}/recalculate-matches`

### Matches (`/api/matches`)
- `GET /api/matches/{candidate_id}/{job_id}`
- `GET /api/matches/{candidate_id}/{job_id}/skills-gap`
- `POST /api/matches/{candidate_id}/{job_id}/recalculate`
- `GET /api/matches/statistics/{organization_id}`

### Files (`/api/files`)
- `GET /api/files/download/{file_id}`
- `POST /api/files/upload-resume-create-candidate`
- `POST /api/files/upload-resume/{candidate_id}`
- `POST /api/files/bulk-upload-resumes`

### Application Form Config (`/api/organizations/me/application-form`)
- `GET /api/organizations/me/application-form`
- `PUT /api/organizations/me/application-form/config`
- `POST /api/organizations/me/application-form/fields`
- `PUT /api/organizations/me/application-form/fields/{field_id}`
- `DELETE /api/organizations/me/application-form/fields/{field_id}`
- `PUT /api/organizations/me/application-form/fields/reorder`

### Public Career Pages (`/api/careers`)
- `GET /api/careers/{org_slug}`
- `GET /api/careers/{org_slug}/{job_slug}`
- `POST /api/careers/{org_slug}/{job_slug}/apply`

---

## Resume Parsing (LLM + Fallback)

The resume parsing system is documented here:
- `backend/docs/llm_parser_guide.md`

Important configuration:
- `RESUME_PARSER_STRATEGY`

---

## Where to Look in Code

Backend
- API wiring + middleware: `backend/app/main.py`
- Routers: `backend/app/api/*`
- Resume parser docs: `backend/docs/llm_parser_guide.md`

Frontend
- Routing:
  - `frontend/src/App.tsx` (subdomain detection)
  - `frontend/src/MainApp.tsx` (dashboard app)
  - `frontend/src/CareerApp.tsx` (public career app)
- Session/auth logic:
  - `frontend/src/components/ProtectedRoute.tsx`
  - `frontend/src/utils/api.ts`

---

## Next Improvements (Optional Docs)

If you want, I can also generate:
- `docs/API-Schemas.md` (request/response examples per endpoint)
- `docs/Data-Model.md` (SQLAlchemy models + relationships)
- `docs/Deployment-Runbook.md` (production steps using `deploy/`)

