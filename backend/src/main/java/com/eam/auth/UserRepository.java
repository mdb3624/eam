package com.eam.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    /** Tenant filter in code as well as RLS (defense in depth, see postgres-native.md). */
    Optional<User> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);
}
