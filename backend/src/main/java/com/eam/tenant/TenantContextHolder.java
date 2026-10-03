package com.eam.tenant;

import org.hibernate.Session;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.sql.SQLException;
import java.sql.Statement;

/**
 * Per-thread tenant and user context. TenantAwareDataSource applies the tenant to each
 * connection at acquisition; setTenantId/clear additionally re-apply to a transaction that is
 * already open (tenant often only becomes known mid-transaction, e.g. registration, or in tests
 * that bind it inside a transactional test method).
 *
 * clear() MUST be called in a finally block, or the next request on this thread inherits the
 * previous tenant.
 */
public final class TenantContextHolder {

    private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void setTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            throw new IllegalArgumentException("tenant_id cannot be null or blank");
        }
        TENANT_ID.set(tenantId);
        runOnActiveTransactionConnection(
                "SET LOCAL app.current_tenant = '" + tenantId.replace("'", "''") + "'");
    }

    public static String getTenantId() {
        String tenantId = TENANT_ID.get();
        if (tenantId == null) {
            throw new IllegalStateException("No tenant context bound to this request");
        }
        return tenantId;
    }

    public static void setUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("user_id cannot be null or blank");
        }
        USER_ID.set(userId);
    }

    public static String getCurrentUserId() {
        String userId = USER_ID.get();
        if (userId == null) {
            throw new IllegalStateException("No user context bound to this request");
        }
        return userId;
    }

    public static void clear() {
        TENANT_ID.remove();
        USER_ID.remove();
        try {
            runOnActiveTransactionConnection("RESET app.current_tenant");
        } catch (RuntimeException e) {
            // Safe to call unconditionally in a finally block: if the transaction is already
            // broken there is nothing left to reset, and we must not mask the real exception.
        }
    }

    /**
     * SET LOCAL is transaction-scoped, not thread-scoped, so the ThreadLocal alone is not
     * enough once a transaction is open. Flushes the Hibernate session first so queued writes
     * execute under the tenant they were made under, not the one we are switching to.
     * Targets the EntityManagerHolder (exactly one per transaction) rather than "any bound
     * connection holder", whose iteration order is not stable.
     */
    private static void runOnActiveTransactionConnection(String sql) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            return;
        }
        for (Object resource : TransactionSynchronizationManager.getResourceMap().values()) {
            if (resource instanceof EntityManagerHolder holder) {
                Session session = holder.getEntityManager().unwrap(Session.class);
                if (session.isOpen()) {
                    session.flush();
                }
                session.doWork(connection -> {
                    try (Statement statement = connection.createStatement()) {
                        statement.execute(sql);
                    } catch (SQLException e) {
                        throw new IllegalStateException(
                                "Failed to apply tenant context to the active transaction", e);
                    }
                });
                return;
            }
        }
    }
}
