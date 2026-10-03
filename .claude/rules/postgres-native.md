# eam PostgreSQL Native Standards

## Keys & Types
- `UUID` for all primary and foreign keys.
- `TIMESTAMPTZ` (`OffsetDateTime` in Java) for all date/time fields.
- `VARCHAR` or `TEXT` for strings. Never `CHAR(n)`.

## Multi-Tenancy & Isolation
- Every tenant-owned table has a `tenant_id UUID NOT NULL` column (the root `tenants` table keys on its own `id`), RLS enabled, and a policy keyed on `NULLIF(current_setting('app.current_tenant', true), '')::uuid` (fail closed: unset means zero rows).
- The GUC is exactly `app.current_tenant`. It is set by `TenantAwareDataSource` from `TenantContextHolder`. Do not invent other names.
- The app connects as `eam_runtime` (non-superuser, NOBYPASSRLS). Never run app traffic or RLS tests as the Flyway admin: superusers bypass RLS.
- Every query includes the tenant filter in application code as well (defense in depth), derived from `TenantContextHolder`.
- No joins across different `tenant_id` values.
- Every new tenant-owned table's migration must `GRANT` to `eam_runtime` explicitly (no default privileges) and ship its own RLS policy.

## Soft Delete
- Never `DELETE` core entities. Set `deleted_at = CURRENT_TIMESTAMP`.
- All `SELECT`s include `AND deleted_at IS NULL`.
- `eam_runtime` is never granted `DELETE`.

## Concurrency & Performance
- `SELECT ... FOR UPDATE` (`@Lock` in JPA) for claim-style operations and refresh-token rotation.
- Composite index `(tenant_id, deleted_at)` on frequently scanned tables.

## RLS Exemption: Session-Token Tables
Auth-adjacent, non-tenant-scoped session/token tables (e.g. refresh tokens, password-reset tokens) are RLS-exempt by design: no `tenant_id` column, access-controlled by application-layer role checks. Any table with a `tenant_id`, or holding a tenant's business records, still requires RLS without exception.

## Pre-Auth Lookup Role
`eam_login_lookup` has column-level SELECT on `users(id, tenant_id, email, deleted_at)` and a SELECT-only policy. It exists so login can find a user before any tenant is known. Do not widen its grants without ARCHITECT sign-off.
