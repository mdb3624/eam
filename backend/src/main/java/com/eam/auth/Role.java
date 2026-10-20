package com.eam.auth;

/** MVP roles, taken from docs/product/Personas.md. A null role on a user means "no role assigned". */
public enum Role {
    OPERATOR,
    DISPATCHER,
    FIELD_TECHNICIAN,
    MAINTENANCE_SUPERVISOR,
    SYSTEM_ADMIN
}
