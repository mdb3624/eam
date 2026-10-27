-- US-001: login credentials, role and disabled flag on users.
-- users is already tenant-owned (RLS, (tenant_id, deleted_at) index, runtime grants), so columns only.
-- eam_login_lookup grants are intentionally NOT widened: it resolves email -> (id, tenant_id) and
-- everything else (password_hash, role, enabled) is read as eam_runtime after the tenant is bound.

ALTER TABLE eam.users
    ADD COLUMN password_hash VARCHAR(100),
    ADD COLUMN role          VARCHAR(30),
    ADD COLUMN enabled       BOOLEAN NOT NULL DEFAULT TRUE;

-- NULL role = authenticated but no role assigned.
ALTER TABLE eam.users
    ADD CONSTRAINT users_role_check CHECK (role IN (
        'OPERATOR', 'DISPATCHER', 'FIELD_TECHNICIAN', 'MAINTENANCE_SUPERVISOR', 'SYSTEM_ADMIN'));

-- Email is globally unique among active users so login can find the tenant from the email alone.
CREATE UNIQUE INDEX uq_users_email_active ON eam.users (lower(email)) WHERE deleted_at IS NULL;
