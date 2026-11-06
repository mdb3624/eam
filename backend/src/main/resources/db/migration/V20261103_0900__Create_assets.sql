-- US-002: canonical asset record. One self-referencing table covers substation, feeder and
-- transformer; the tenant is the utility, so there is no utility row.
-- PostGIS lives in schema public. The connection search_path is eam only, so every PostGIS type
-- and function below is schema-qualified (public.geography, public.ST_X, ...).
-- eam_login_lookup gets no grant on this table.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

CREATE TABLE eam.assets (
    id            UUID PRIMARY KEY,
    tenant_id     UUID                     NOT NULL REFERENCES eam.tenants (id),
    asset_code    VARCHAR(50)              NOT NULL,
    name          VARCHAR(255)             NOT NULL,
    asset_type    VARCHAR(20)              NOT NULL,
    parent_id     UUID,
    status        VARCHAR(20)              NOT NULL DEFAULT 'IN_SERVICE',
    criticality   VARCHAR(20)              NOT NULL DEFAULT 'MEDIUM',
    location      public.geography(Point, 4326),
    manufacturer  VARCHAR(120),
    model         VARCHAR(120),
    serial_number VARCHAR(120),
    created_at    TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ,
    CONSTRAINT assets_asset_type_check CHECK (asset_type IN ('SUBSTATION', 'FEEDER', 'TRANSFORMER')),
    CONSTRAINT assets_status_check CHECK (status IN ('IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED')),
    CONSTRAINT assets_criticality_check CHECK (criticality IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    -- Substations are roots; feeders and transformers must have a parent.
    CONSTRAINT assets_root_is_substation CHECK ((asset_type = 'SUBSTATION') = (parent_id IS NULL)),
    -- A parent can never belong to another tenant. The FK references a unique key.
    CONSTRAINT uq_assets_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT fk_assets_parent FOREIGN KEY (tenant_id, parent_id) REFERENCES eam.assets (tenant_id, id)
);

CREATE UNIQUE INDEX uq_assets_code_active ON eam.assets (tenant_id, lower(asset_code)) WHERE deleted_at IS NULL;
CREATE INDEX idx_assets_tenant_deleted ON eam.assets (tenant_id, deleted_at);
CREATE INDEX idx_assets_parent ON eam.assets (tenant_id, parent_id);
CREATE INDEX idx_assets_location ON eam.assets USING GIST (location);

-- Parent type rule: a FEEDER sits under a SUBSTATION, a TRANSFORMER under a FEEDER. Not SECURITY
-- DEFINER, so the parent is read under the caller's RLS. Every write path gets the rule.
CREATE FUNCTION eam.assets_check_parent_type() RETURNS trigger
    LANGUAGE plpgsql AS
$$
DECLARE
    parent_type VARCHAR(20);
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT asset_type INTO parent_type FROM eam.assets WHERE tenant_id = NEW.tenant_id AND id = NEW.parent_id;
    IF NEW.asset_type = 'FEEDER' AND parent_type IS DISTINCT FROM 'SUBSTATION' THEN
        RAISE EXCEPTION 'Parent of a FEEDER must be a SUBSTATION' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.asset_type = 'TRANSFORMER' AND parent_type IS DISTINCT FROM 'FEEDER' THEN
        RAISE EXCEPTION 'Parent of a TRANSFORMER must be a FEEDER' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assets_parent_type
    BEFORE INSERT OR UPDATE OF asset_type, parent_id ON eam.assets
    FOR EACH ROW EXECUTE FUNCTION eam.assets_check_parent_type();

ALTER TABLE eam.assets ENABLE ROW LEVEL SECURITY;

-- Fail closed: if app.current_tenant is unset or empty, NULLIF yields NULL and no row matches.
CREATE POLICY assets_tenant_isolation ON eam.assets
    FOR ALL TO eam_runtime
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Soft delete only: the runtime role is never granted DELETE.
GRANT SELECT, INSERT, UPDATE ON eam.assets TO eam_runtime;
