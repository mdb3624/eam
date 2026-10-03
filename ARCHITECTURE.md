# eam Architecture

eam is a multi-tenant utility asset and field operations platform. This document covers the development-environment baseline only; domain design is owned by ARCHITECT per story.

## Stack
Java 21, Spring Boot 3.5, Maven wrapper, PostgreSQL 16 (PostGIS image, extension not yet enabled), Flyway, React 18 + TypeScript + Vite.

## Multi-tenancy
- Tenant identity lives in `TenantContextHolder` (ThreadLocal) and must be cleared in a `finally` block.
- `TenantAwareDataSource` wraps the Hikari pool and issues `SET LOCAL app.current_tenant = '<uuid>'` as its own statement on every connection when a tenant is bound, and again after every `commit()`/`rollback()`.
- Postgres RLS policies on every tenant-owned table filter on that setting; unset means zero rows (fail closed).
- `spring.jpa.open-in-view=false`: with OSIV on, one connection serves several transactions per request and SET LOCAL is lost after the first.
- All writes made while a tenant is bound must run inside a `@Transactional` boundary. `TenantAwareDataSource` turns autocommit off when a tenant is bound, so a bare `JdbcTemplate` write outside a transaction is rolled back when the connection is returned to the pool.

## Database roles
| Role | Purpose | Privileges |
|---|---|---|
| bootstrap admin | Flyway only | superuser (bypasses RLS) |
| `eam_runtime` | all app traffic | SELECT/INSERT/UPDATE on tenant tables, subject to RLS; no DELETE |
| `eam_login_lookup` | pre-auth user lookup | column-level SELECT on `users(id, tenant_id, email, deleted_at)` |

## Ports
| Service | Dev | Test |
|---|---|---|
| Postgres | 5433 | 5434 |
| Backend | 8180 | 9191 |
| Vite | 5273 | n/a |

## Running
- Backend tests: `cd backend && ./mvnw verify` (Docker must be running; Testcontainers).
- Frontend: `cd frontend && npm run lint && npm run test && npm run build`.
- Full stack: copy `.env.example` to `.env`, then `docker compose -f docker-compose.dev.yml up --build`.
- Test stack: `docker compose -f docker-compose.test.yml up --build -d`, health at `http://localhost:9191/actuator/health`.
- Per the maintainer's global rules, run Docker operations through the Docker MCP tool, not raw docker CLI.

## Not yet wired
`eam_login_lookup` has a role and grants but no `DataSource` bean yet; US-001 (login/RBAC) adds it with the JWT filter. `httpBasic` in `SecurityConfig` is a placeholder until then.

The `EntityManagerHolder` branch of `TenantContextHolder` (re-applying the tenant to an already-open JPA transaction) is covered by `RlsCanaryIT.settingTenantInsideAnOpenTransactionTakesEffect`; re-verify once the first JPA entity exists.
