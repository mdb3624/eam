-- Baseline multi-tenant tables. Columns beyond these belong to US-001 and later stories,
-- added by their own migrations (ARCHITECT owns the design).

CREATE TABLE eam.tenants (
    id         UUID PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE eam.users (
    id         UUID PRIMARY KEY,
    tenant_id  UUID         NOT NULL REFERENCES eam.tenants (id),
    email      VARCHAR(320) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_deleted_at ON eam.tenants (deleted_at);
CREATE INDEX idx_users_tenant_deleted ON eam.users (tenant_id, deleted_at);

ALTER TABLE eam.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE eam.users ENABLE ROW LEVEL SECURITY;

-- Fail closed: if app.current_tenant is unset or empty, NULLIF yields NULL and no row matches.
CREATE POLICY tenants_tenant_isolation ON eam.tenants
    FOR ALL TO eam_runtime
    USING (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

CREATE POLICY users_tenant_isolation ON eam.users
    FOR ALL TO eam_runtime
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Soft delete only: the runtime role is never granted DELETE.
GRANT SELECT, INSERT, UPDATE ON eam.tenants, eam.users TO eam_runtime;

-- Pre-auth login lookup: cross-tenant read of three identifying columns plus deleted_at.
GRANT SELECT (id, tenant_id, email, deleted_at) ON eam.users TO eam_login_lookup;
CREATE POLICY users_login_lookup ON eam.users
    FOR SELECT TO eam_login_lookup
    USING (true);
