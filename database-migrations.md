# Database Migrations (Flyway)

Flyway owns all DDL. Hibernate only validates (`ddl-auto=validate`).

## Rules
1. Never modify a committed migration. Flyway checksums applied files; editing one breaks every environment that already ran it. Fix forward with a new migration.
2. Filename: `VYYYYMMDD_HHmm__Description_With_Underscores.sql` (double underscore before the description). Location: `backend/src/main/resources/db/migration/`.
3. Every new tenant-owned table: `tenant_id UUID NOT NULL`, `deleted_at TIMESTAMPTZ`, `ENABLE ROW LEVEL SECURITY`, a tenant-isolation policy on `app.current_tenant`, an explicit `GRANT SELECT, INSERT, UPDATE` to `eam_runtime`, and an index on `(tenant_id, deleted_at)`. See `.claude/rules/postgres-native.md`.
4. Every new `@Entity` ships with its migration in the same PR. An entity without a migration fails `ddl-auto=validate` at startup.
5. Role passwords come from Flyway placeholders (`${runtime_password}`, `${login_lookup_password}`), never literals.
6. Flyway runs as the admin user (`FLYWAY_DB_USERNAME`); the app runs as `eam_runtime`. They must never be the same user.

## Local workflow
1. Add the migration file.
2. Run `./mvnw verify` in `backend/` (Testcontainers applies all migrations to a fresh database).
3. Start the app; Flyway applies it on startup.

## Test database
Integration tests extend `AbstractPostgresIT` (Testcontainers, PostGIS image, bootstrap superuser as Flyway admin, `eam_runtime` for app traffic). `docker-compose.test.yml` provides the same three-role layout for running the full stack on ports 5434 (db) and 9191 (backend).

## Merge conflicts
Two branches adding migrations with close timestamps are fine as long as the filenames differ; keep the `HHmm` unique per branch.
