package com.eam.db;

// Story: US-001 (lesson). A second JdbcTemplate bean for the pre-auth lookup pool made Spring Boot back off
// its own template, so RlsCanaryIT's @Autowired JdbcTemplate silently ran as the cross-tenant lookup role.
// This fails the build if any template other than the eam_runtime one is ever exposed as a bean.

import com.eam.support.AbstractPostgresIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DataSourceIsolationIT extends AbstractPostgresIT {

    @Autowired
    private ApplicationContext context;

    @Test
    void theOnlyJdbcTemplateBeanRunsAsTheRuntimeRole() {
        Map<String, JdbcTemplate> templates = context.getBeansOfType(JdbcTemplate.class);

        assertThat(templates).hasSize(1);
        assertThat(templates.values().iterator().next().queryForObject("SELECT current_user", String.class))
                .isEqualTo(RUNTIME_USER);
    }

    @Test
    void theOnlyNamedParameterTemplateBeanRunsAsTheRuntimeRole() {
        Map<String, NamedParameterJdbcTemplate> templates = context.getBeansOfType(NamedParameterJdbcTemplate.class);

        assertThat(templates).hasSize(1);
        assertThat(templates.values().iterator().next().getJdbcOperations()
                .queryForObject("SELECT current_user", String.class)).isEqualTo(RUNTIME_USER);
    }
}
