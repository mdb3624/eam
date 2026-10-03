# eam Development Environment — Design

Date: 2026-10-03
Status: Draft for review
Prototype: `projects/freightclub` (same stack, scaled down, multi-tenancy enabled)

## Goal

Give eam a runnable, verified dev environment modeled on FreightClub so the first story (US-001) can go through the CODER role with a green build to start from. Walking skeleton only: no domain code.

## Decisions (agreed)

- Stack: same as FreightClub. Java 21, Spring Boot 3.5, Maven wrapper, PostgreSQL + Flyway, React 18 + TypeScript + Vite.
- Approach: walking skeleton. Not a clone-and-strip of FreightClub, not docs-only.
- Multi-tenancy: enabled (`tenant_id` + Postgres RLS), per FreightClub's pattern.
- Port plan: eam gets its own ports so it runs beside FreightClub (see Section 1).

## Out of scope

- Any domain code (assets, alarms, incidents, work orders). US-001 is the first real story.
- Stripe, Twilio, mail, PDFBox, GCS, Bucket4j, pitest.
- Playwright e2e (deferred until the first UI story).
- Enabling the PostGIS extension (image only, extension enabled when US-007 needs it).
- Production deploy config (`docker-compose.prod.yml`, cloud deploy scripts).

## 1. Layout and ports

Inside `projects/eam/` (nested repo):

```
backend/                     Spring Boot app, Maven wrapper
frontend/                    React + TS + Vite
docker-compose.dev.yml
docker-compose.test.yml
.env.example                 (.env and .env.test are gitignored)
.github/workflows/ci.yml
.claude/rules/postgres-native.md
database-migrations.md
ARCHITECTURE.md
```

Ports (all configured through `.env` files, none hard-coded in code):

| Service | Dev | Test |
|---|---|---|
| Postgres | 5433 | 5434 |
| Backend | 8180 | 9191 |
| Vite | 5273 | n/a |

The global CLAUDE.md rules cite FreightClub's 9090/9091/5173. eam's CLAUDE.md must state its own ports so debugging sanity checks use the right ones.

## 2. Backend skeleton

- Java 21, Spring Boot 3.5.x, Maven wrapper (`./mvnw`).
- Dependencies: web, data-jpa, security, validation, actuator, flyway-core, flyway-database-postgresql, postgresql, jjwt (api/impl/jackson), mapstruct, Testcontainers, spring-boot-starter-test, spring-security-test.
- Build gates: JaCoCo (floor 65%, ratchet toward 80% branch, per eam CLAUDE.md), Checkstyle, PMD.
- Multi-tenancy plumbing: `TenantContextHolder` and a `TenantAwareDataSource` that sets `app.current_tenant_id` on each connection.
- Migrations: `V0` creates the schema and three DB roles: Flyway admin, non-superuser runtime role (so RLS applies), narrow login-lookup role. Baseline tables `tenants` and `users` with RLS and `deleted_at`.
- Naming: `VYYYYMMDD_HHmm__Desc.sql`.
- `ddl-auto=validate` everywhere. Flyway owns all DDL.
- `/actuator/health` exposed.

## 3. Multi-tenancy and DB rules

- Port FreightClub's `postgres-native.md` to `.claude/rules/postgres-native.md` with FreightClub naming removed: UUID keys, TIMESTAMPTZ, VARCHAR/TEXT (no CHAR(n)), mandatory tenant filter, soft delete, `(tenant_id, deleted_at)` composite index, and the RLS exemption for session-token tables.
- Database image: `postgis/postgis:16-3.4`. Extension not enabled yet.
- RLS canary test: two tenants, the runtime role sees only its own rows. Guards against tests passing because the app connected as a superuser.

## 4. Frontend, CI, role docs

- Frontend: React 18, TypeScript, Vite, Vitest. `/api` proxy to the eam backend dev port. `allowedHosts` includes the current Tailscale domain.
- CI (`ci.yml`): backend job on a Postgres service container using the three-role setup (mirrors `docker-compose.test.yml`); frontend build job. Skip on docs-only changes.
- Role-doc ports:
  - REVIEWER: Database Migrations, Entity-Migration Parity, Schema Type Consistency checks.
  - LIBRARIAN: Flyway filename convention check.
  - ARCHITECT: schema/migration tooling note (Flyway, naming, `database-migrations.md`).
- `database-migrations.md`: trimmed port of FreightClub's guide, Postgres-specific (FreightClub's copy mentions MySQL in places; do not carry that over).

## 5. Definition of done

1. `./mvnw verify` passes, JaCoCo at or above the floor.
2. Flyway applies cleanly to a fresh container.
3. RLS canary test passes.
4. `npm run build` passes.
5. `docker compose -f docker-compose.test.yml up` brings the stack up and `/actuator/health` returns 200 on the test port.

## Constraints from project rules

- Work happens on a `feature/...` branch, never `main` (eam CLAUDE.md).
- CODER Input Acceptance Gate applies to any implementation work derived from this spec.
- Docker operations go through the Docker MCP tool per global instructions.
- Before any Maven build, check for locked JARs and stale Java processes.
