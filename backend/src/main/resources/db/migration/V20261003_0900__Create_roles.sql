-- Roles are cluster-level; guard so re-running against a persistent dev DB is safe.
-- Passwords come from Flyway placeholders (never hard-coded).
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'eam_runtime') THEN
        CREATE ROLE eam_runtime LOGIN PASSWORD '${runtime_password}' NOSUPERUSER NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'eam_login_lookup') THEN
        CREATE ROLE eam_login_lookup LOGIN PASSWORD '${login_lookup_password}' NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA eam TO eam_runtime, eam_login_lookup;
ALTER ROLE eam_runtime SET search_path TO eam, public;
ALTER ROLE eam_login_lookup SET search_path TO eam, public;
