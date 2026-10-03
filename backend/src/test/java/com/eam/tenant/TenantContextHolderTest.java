package com.eam.tenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantContextHolderTest {

    @AfterEach
    void cleanUp() {
        TenantContextHolder.clear();
    }

    @Test
    void storesAndReturnsTenantAndUser() {
        TenantContextHolder.setTenantId("tenant-1");
        TenantContextHolder.setUserId("user-1");
        assertThat(TenantContextHolder.getTenantId()).isEqualTo("tenant-1");
        assertThat(TenantContextHolder.getCurrentUserId()).isEqualTo("user-1");
    }

    @Test
    void rejectsNullOrBlankTenant() {
        assertThatThrownBy(() -> TenantContextHolder.setTenantId(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TenantContextHolder.setTenantId("  "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNullOrBlankUser() {
        assertThatThrownBy(() -> TenantContextHolder.setUserId(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TenantContextHolder.setUserId(""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unboundContextThrowsIllegalState() {
        assertThatThrownBy(TenantContextHolder::getTenantId).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(TenantContextHolder::getCurrentUserId).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void clearRemovesContextAndIsSafeWithoutTransaction() {
        TenantContextHolder.setTenantId("tenant-1");
        assertThatCode(TenantContextHolder::clear).doesNotThrowAnyException();
        assertThatThrownBy(TenantContextHolder::getTenantId).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void contextIsIsolatedPerThread() throws Exception {
        TenantContextHolder.setTenantId("main-tenant");
        String[] seenOnOtherThread = new String[1];
        Thread other = new Thread(() -> {
            try {
                TenantContextHolder.getTenantId();
            } catch (IllegalStateException e) {
                seenOnOtherThread[0] = "unbound";
            }
        });
        other.start();
        other.join();
        assertThat(seenOnOtherThread[0]).isEqualTo("unbound");
    }
}
