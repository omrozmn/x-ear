# Development Guide

## Backend (API)
The backend code is located in `apps/api/` (formerly `apps/backend`).
A symlink `apps/backend` exists for backward compatibility.

## Database
By default, the project uses **SQLite** for development (`apps/api/instance/xear_crm.db`).

### Using Postgres (Recommended)
For a production-like environment, run Postgres via Docker:
```bash
docker-compose -f infra/docker/docker-compose.dev.yml up -d
```
Set your environment variable:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/xear_crm
```
