package com.eam.config;

import com.eam.tenant.TenantContextHolder;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Applies SET LOCAL app.current_tenant to every connection handed out, as its own statement
 * (never string-concatenated onto a parameterized statement; Postgres silently drops it).
 * Also re-applies after commit()/rollback(): SET LOCAL ends with the transaction, so a second
 * transaction on the same physical connection would otherwise run with no tenant and RLS
 * would fail closed.
 */
public class TenantAwareDataSource extends DelegatingDataSource {

    public TenantAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        return prepare(connection);
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        return prepare(connection);
    }

    private Connection prepare(Connection connection) throws SQLException {
        try {
            applyTenantContext(connection);
        } catch (SQLException | RuntimeException e) {
            try {
                connection.close();
            } catch (SQLException closeFailure) {
                e.addSuppressed(closeFailure);
            }
            throw e;
        }
        return wrapForReapplyOnTransactionBoundary(connection);
    }

    /** Shuts down the wrapped pool; Spring invokes this as the bean's destroy method. */
    public void close() throws Exception {
        if (getTargetDataSource() instanceof AutoCloseable closeable) {
            closeable.close();
        }
    }

    private void applyTenantContext(Connection connection) throws SQLException {
        String tenantId;
        try {
            tenantId = TenantContextHolder.getTenantId();
        } catch (IllegalStateException e) {
            // No tenant bound (schema init, pre-auth paths): leave the connection untouched.
            return;
        }
        // SET LOCAL needs a transaction: autocommit off, so its scope outlives this statement.
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET LOCAL app.current_tenant = '" + tenantId.replace("'", "''") + "'");
        }
    }

    private Connection wrapForReapplyOnTransactionBoundary(Connection real) {
        InvocationHandler handler = (proxy, method, args) -> {
            Object result;
            try {
                result = method.invoke(real, args);
            } catch (InvocationTargetException e) {
                throw e.getCause();
            }
            String name = method.getName();
            if (name.equals("commit") || name.equals("rollback")) {
                try {
                    applyTenantContext(real);
                } catch (SQLException ignored) {
                    // Best effort: never mask the real commit/rollback outcome.
                }
            }
            return result;
        };
        return (Connection) Proxy.newProxyInstance(
                Connection.class.getClassLoader(), new Class<?>[]{Connection.class}, handler);
    }
}
