# eam Development Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable, verified, multi-tenant walking-skeleton dev environment for eam (Spring Boot + Postgres/Flyway/RLS + React/Vite + Docker + CI), modeled on `projects/freightclub`, with no domain code.

**Architecture:** Spring Boot 3.5 backend whose `TenantAwareDataSource` sets Postgres GUC `app.current_tenant` per connection; Flyway (run as a bootstrap admin) creates schema `eam`, three DB roles, and baseline `tenants`/`users` tables with RLS; the app connects as a non-superuser `eam_runtime` role so RLS really applies. Tests use Testcontainers. React/Vite frontend proxies `/api`. Docker Compose (dev and test) and a CI workflow mirror the three-role setup.

**Tech Stack:** Java 21, Spring Boot 3.5.16, Maven wrapper, PostgreSQL 16 (`postgis/postgis:16-3.4`), Flyway (Boot-managed version), Testcontainers, JaCoCo, Checkstyle, PMD, jjwt 0.13.0, MapStruct 1.5.5.Final, React 18, TypeScript, Vite 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-eam-dev-environment-design.md`

## Global Constraints

All paths are relative to `projects/eam/` (its own git repo). Work on branch `chore/dev-environment` (create from `chore/dev-environment-spec`); never commit to `main`.

- Java package root: `com.eam`. Maven artifactId: `eam-backend`.
- DB schema name: `eam`. Roles: `eam_runtime` (app, non-superuser, NOBYPASSRLS), `eam_login_lookup` (narrow pre-auth, NOBYPASSRLS). Flyway admin = the bootstrap Postgres user.
- Tenant GUC is exactly `app.current_tenant` (not `app.current_tenant_id`, not `app.tenant_id`).
- Ids are `UUID`; timestamps `TIMESTAMPTZ`; strings `VARCHAR`/`TEXT`, never `CHAR(n)`; soft delete via `deleted_at`; runtime role is never granted `DELETE`.
- Migration filenames: `VYYYYMMDD_HHmm__Desc.sql`. `spring.jpa.hibernate.ddl-auto=validate`. `spring.jpa.open-in-view=false`.
- Ports: Postgres dev 5433 / test 5434; backend dev 8180 / test 9191; Vite 5273. Configured via env, never hard-coded in Java.
- JaCoCo BRANCH floor 0.65 (target 80%). Never lower the floor to pass; add tests.
- No secrets committed. `.env`, `.env.test`, `.env.prod` are gitignored; only `.env.example` is tracked.
- Docker operations use the Docker MCP tool (`mcp__MCP_DOCKER__*`) per the user's global instructions; CLI commands below are the reference for what to run. If the MCP tool cannot perform an action, stop and ask the user rather than falling back to bash `docker`.
- Before any `./mvnw` build: confirm no stale Java process holds `backend/target/*.jar`. Stop test containers before `mvn clean`.
- Do not narrate while executing; report outcomes tersely.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Inputs and conditions the spec implies that are most likely to bite, most likely first. Each has a pinning test in the task named in brackets.

1. No tenant bound (request before auth, or after `clear()`): queries must return zero rows, not error and not all rows. [Task 3: `failsClosedWhenNoTenantBound`]
2. Tenant context must survive a `commit()` on the same physical connection (second transaction on one connection). [Task 3: `tenantContextSurvivesCommitOnSameConnection`]
3. A test connected as a superuser passes RLS tests for the wrong reason. [Task 3: `appConnectionIsNotSuperuser`; Task 2: `runtimeRoleIsNotSuperuserAndDoesNotBypassRls`]
4. Runtime role must not be able to hard-delete (soft-delete rule). [Task 2: `runtimeRoleCannotHardDelete`]
5. Unauthenticated callers: `/actuator/health` open, everything else 401. [Task 1: `healthIsOpenAndOtherPathsAreUnauthorized`]

---

### Task 1: Backend skeleton, build gates, DB roles, health

**Files:**
- Create: `backend/pom.xml`, `backend/checkstyle.xml`, `backend/pmd-ruleset.xml`
- Create (via wrapper plugin): `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`
- Create: `backend/src/main/java/com/eam/EamApplication.java`
- Create: `backend/src/main/java/com/eam/config/SecurityConfig.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/db/migration/V20261003_0900__Create_roles.sql`
- Create: `backend/src/test/java/com/eam/support/AbstractPostgresIT.java`
- Test: `backend/src/test/java/com/eam/HealthEndpointIT.java`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `AbstractPostgresIT` (abstract base for all DB-backed tests) with:
  - `static final PostgreSQLContainer<?> POSTGRES`
  - `static Connection adminConnection() throws SQLException` (bootstrap superuser, autocommit on)
  - `static Connection runtimeConnection(UUID tenantId) throws SQLException` (role `eam_runtime`, autocommit **off**, `SET LOCAL app.current_tenant` applied when `tenantId != null`)
  - constants `ADMIN_USER = "eam_test_admin"`, `ADMIN_PASSWORD = "eam_admin"`, `RUNTIME_USER = "eam_runtime"`, `RUNTIME_PASSWORD = "eam_runtime_pw"`, `LOGIN_USER = "eam_login_lookup"`, `LOGIN_PASSWORD = "eam_login"`
  - `static Connection loginLookupConnection() throws SQLException`
  - `static String jdbcUrl()` (container URL with `currentSchema=eam`, no `loggerLevel` suffix)
- Produces: schema `eam`, roles `eam_runtime` and `eam_login_lookup`.

- [ ] **Step 1: Create the branch**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git checkout chore/dev-environment-spec
git checkout -b chore/dev-environment
mkdir -p backend/src/main/java/com/eam/config backend/src/main/resources/db/migration backend/src/test/java/com/eam/support
```

- [ ] **Step 2: Write `backend/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.16</version>
        <relativePath/>
    </parent>

    <groupId>com.eam</groupId>
    <artifactId>eam-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>eam-backend</name>

    <properties>
        <java.version>21</java.version>
        <jjwt.version>0.13.0</jjwt.version>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>

            <!-- Unit tests (*Test) run in `test`; DB-backed tests (*IT) run in `verify`. -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-failsafe-plugin</artifactId>
                <executions>
                    <execution>
                        <goals>
                            <goal>integration-test</goal>
                            <goal>verify</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-checkstyle-plugin</artifactId>
                <version>3.4.0</version>
                <dependencies>
                    <dependency>
                        <groupId>com.puppycrawl.tools</groupId>
                        <artifactId>checkstyle</artifactId>
                        <version>10.17.0</version>
                    </dependency>
                </dependencies>
                <configuration>
                    <configLocation>checkstyle.xml</configLocation>
                    <includeTestSourceDirectory>true</includeTestSourceDirectory>
                    <consoleOutput>true</consoleOutput>
                    <failsOnError>true</failsOnError>
                </configuration>
                <executions>
                    <execution>
                        <id>checkstyle</id>
                        <phase>validate</phase>
                        <goals><goal>check</goal></goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-pmd-plugin</artifactId>
                <version>3.26.0</version>
                <configuration>
                    <rulesets>
                        <ruleset>pmd-ruleset.xml</ruleset>
                    </rulesets>
                    <linkXRef>false</linkXRef>
                    <printFailingErrors>true</printFailingErrors>
                </configuration>
                <executions>
                    <execution>
                        <id>pmd</id>
                        <phase>verify</phase>
                        <goals><goal>check</goal></goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>0.8.12</version>
                <executions>
                    <execution>
                        <id>prepare-agent</id>
                        <goals><goal>prepare-agent</goal></goals>
                    </execution>
                    <execution>
                        <id>prepare-agent-integration</id>
                        <goals><goal>prepare-agent-integration</goal></goals>
                    </execution>
                    <execution>
                        <id>report</id>
                        <phase>verify</phase>
                        <goals><goal>report</goal></goals>
                    </execution>
                    <execution>
                        <!-- Bound to verify because IT classes run in failsafe. Floor 0.65 BRANCH;
                             ratchet toward 0.80 as coverage grows. Never lower to pass a build. -->
                        <id>check</id>
                        <phase>verify</phase>
                        <goals><goal>check</goal></goals>
                        <configuration>
                            <excludes>
                                <exclude>com/eam/EamApplication</exclude>
                            </excludes>
                            <rules>
                                <rule>
                                    <element>BUNDLE</element>
                                    <limits>
                                        <limit>
                                            <counter>BRANCH</counter>
                                            <value>COVEREDRATIO</value>
                                            <minimum>0.65</minimum>
                                        </limit>
                                    </limits>
                                </rule>
                            </rules>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 3: Write `backend/checkstyle.xml` and `backend/pmd-ruleset.xml`**

`backend/checkstyle.xml`:

```xml
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
        "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
    <property name="severity" value="error"/>
    <module name="FileTabCharacter"/>
    <module name="NewlineAtEndOfFile">
        <property name="lineSeparator" value="lf_cr_crlf"/>
    </module>
    <module name="TreeWalker">
        <module name="UnusedImports"/>
        <module name="AvoidStarImport"/>
        <module name="RedundantImport"/>
        <module name="EmptyBlock">
            <property name="option" value="TEXT"/>
        </module>
        <module name="NeedBraces"/>
        <module name="ModifierOrder"/>
        <module name="RedundantModifier"/>
    </module>
</module>
```

`backend/pmd-ruleset.xml`:

```xml
<?xml version="1.0"?>
<ruleset name="eam"
         xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.sourceforge.io/ruleset_2_0_0.xsd">
    <description>eam baseline rules</description>
    <rule ref="category/java/errorprone.xml/EmptyCatchBlock">
        <properties>
            <property name="allowCommentedBlocks" value="true"/>
        </properties>
    </rule>
    <rule ref="category/java/bestpractices.xml/UnusedPrivateField"/>
    <rule ref="category/java/bestpractices.xml/UnusedLocalVariable"/>
    <rule ref="category/java/bestpractices.xml/UnusedPrivateMethod"/>
</ruleset>
```

- [ ] **Step 4: Generate the Maven wrapper**

Check `mvn -v` works and no stale Java process locks `backend/target`. Then:

```bash
cd backend && mvn -N wrapper:wrapper -Dmaven=3.9.6 -q && ls mvnw mvnw.cmd .mvn/wrapper
```

Expected: `mvnw`, `mvnw.cmd`, and `.mvn/wrapper/maven-wrapper.properties` exist.

- [ ] **Step 5: Write the failing test and its base class**

`backend/src/test/java/com/eam/support/AbstractPostgresIT.java`:

```java
package com.eam.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Base for DB-backed tests. One shared PostGIS container per JVM. The bootstrap user is the
 * Flyway admin (superuser); the application connects as the non-superuser eam_runtime role so
 * RLS actually applies. Never point the app at the admin user: superusers bypass RLS and every
 * isolation test would pass for the wrong reason.
 */
@SpringBootTest
public abstract class AbstractPostgresIT {

    public static final String ADMIN_USER = "eam_test_admin";
    public static final String ADMIN_PASSWORD = "eam_admin";
    public static final String RUNTIME_USER = "eam_runtime";
    public static final String RUNTIME_PASSWORD = "eam_runtime_pw";
    public static final String LOGIN_USER = "eam_login_lookup";
    public static final String LOGIN_PASSWORD = "eam_login";

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("eam_test")
            .withUsername(ADMIN_USER)
            .withPassword(ADMIN_PASSWORD);

    static {
        POSTGRES.start();
    }

    public static String jdbcUrl() {
        return "jdbc:postgresql://" + POSTGRES.getHost() + ":" + POSTGRES.getMappedPort(5432)
                + "/eam_test?currentSchema=eam";
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", AbstractPostgresIT::jdbcUrl);
        registry.add("spring.datasource.username", () -> RUNTIME_USER);
        registry.add("spring.datasource.password", () -> RUNTIME_PASSWORD);
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "5");
        registry.add("spring.flyway.url", AbstractPostgresIT::jdbcUrl);
        registry.add("spring.flyway.user", () -> ADMIN_USER);
        registry.add("spring.flyway.password", () -> ADMIN_PASSWORD);
        registry.add("spring.flyway.placeholders.runtime_password", () -> RUNTIME_PASSWORD);
        registry.add("spring.flyway.placeholders.login_lookup_password", () -> LOGIN_PASSWORD);
    }

    public static Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), ADMIN_USER, ADMIN_PASSWORD);
    }

    public static Connection loginLookupConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), LOGIN_USER, LOGIN_PASSWORD);
    }

    /** Autocommit off; applies SET LOCAL app.current_tenant when tenantId is non-null. */
    public static Connection runtimeConnection(UUID tenantId) throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(), RUNTIME_USER, RUNTIME_PASSWORD);
        connection.setAutoCommit(false);
        if (tenantId != null) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("SET LOCAL app.current_tenant = '" + tenantId + "'");
            }
        }
        return connection;
    }
}
```

`backend/src/test/java/com/eam/HealthEndpointIT.java`:

```java
package com.eam;

import com.eam.support.AbstractPostgresIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class HealthEndpointIT extends AbstractPostgresIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthIsOpenAndOtherPathsAreUnauthorized() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/api/v1/anything"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 6: Run to verify it fails**

```bash
cd backend && ./mvnw -B -q verify -Dit.test=HealthEndpointIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false
```

Expected: FAIL (no `EamApplication` class / cannot find `@SpringBootConfiguration`).

- [ ] **Step 7: Write the implementation**

`backend/src/main/java/com/eam/EamApplication.java`:

```java
package com.eam;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EamApplication {

    public static void main(String[] args) {
        SpringApplication.run(EamApplication.class, args);
    }
}
```

`backend/src/main/java/com/eam/config/SecurityConfig.java`:

```java
package com.eam.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .httpBasic(Customizer.withDefaults());
        return http.build();
    }
}
```

Note: `httpBasic` is a placeholder-free default so the filter chain has an authentication mechanism until US-001 replaces it with JWT. The `HttpStatusEntryPoint` keeps unauthenticated responses at 401 without a `WWW-Authenticate` browser prompt.

`backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  flyway:
    enabled: true
    schemas: eam
    user: ${FLYWAY_DB_USERNAME:${DB_USERNAME}}
    password: ${FLYWAY_DB_PASSWORD:${DB_PASSWORD}}
    url: ${FLYWAY_DB_URL:${spring.datasource.url}}
    placeholders:
      runtime_password: ${DB_PASSWORD}
      login_lookup_password: ${DB_LOGIN_PASSWORD}

  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate

server:
  port: ${PORT:8180}

management:
  endpoints:
    web:
      exposure:
        include: health
```

`backend/src/main/resources/db/migration/V20261003_0900__Create_roles.sql`:

```sql
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
```

Append to `.gitignore`:

```
# ---- Backend ----
backend/target/
backend/.mvn/wrapper/maven-wrapper.jar

# ---- Frontend ----
frontend/node_modules/
frontend/dist/
frontend/.env.local
frontend/.env.*.local

# ---- Env files (only .env.example is tracked) ----
.env
.env.*
!.env.example

# ---- IDEs / OS ----
.idea/
*.iml
.vscode/
.DS_Store
Thumbs.db
```

- [ ] **Step 8: Run to verify it passes**

```bash
cd backend && ./mvnw -B -q verify -Dit.test=HealthEndpointIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true
```

Expected: PASS (`HealthEndpointIT`), Checkstyle and PMD clean. (JaCoCo skipped here only because a one-test run cannot meet the project-wide floor; the full-suite JaCoCo check is Task 9.) Docker must be running for Testcontainers.

- [ ] **Step 9: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add .gitignore backend
git update-index --chmod=+x backend/mvnw
git commit -m "feat(env): backend skeleton, build gates, DB roles, health endpoint

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tenants/users baseline migration with RLS

**Files:**
- Create: `backend/src/main/resources/db/migration/V20261003_0910__Create_tenants_and_users.sql`
- Test: `backend/src/test/java/com/eam/db/MigrationIT.java`

**Interfaces:**
- Consumes: `AbstractPostgresIT` (`adminConnection()`, `runtimeConnection(UUID)`, `loginLookupConnection()`) from Task 1.
- Produces: tables `eam.tenants(id, name, created_at, updated_at, deleted_at)` and `eam.users(id, tenant_id, email, created_at, updated_at, deleted_at)`, both RLS-enabled with policies keyed on `app.current_tenant`; `eam_runtime` has SELECT/INSERT/UPDATE (no DELETE); `eam_login_lookup` has column-level SELECT on `users(id, tenant_id, email, deleted_at)`.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/eam/db/MigrationIT.java`:

```java
package com.eam.db;

import com.eam.support.AbstractPostgresIT;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationIT extends AbstractPostgresIT {

    static void seedTenantWithUser(UUID tenantId, String email) throws SQLException {
        try (Connection admin = adminConnection()) {
            try (PreparedStatement tenant = admin.prepareStatement(
                    "INSERT INTO eam.tenants (id, name) VALUES (?, ?)")) {
                tenant.setObject(1, tenantId);
                tenant.setString(2, "Tenant " + tenantId);
                tenant.executeUpdate();
            }
            try (PreparedStatement user = admin.prepareStatement(
                    "INSERT INTO eam.users (id, tenant_id, email) VALUES (?, ?, ?)")) {
                user.setObject(1, UUID.randomUUID());
                user.setObject(2, tenantId);
                user.setString(3, email);
                user.executeUpdate();
            }
        }
    }

    private static boolean queryBoolean(String sql) throws SQLException {
        try (Connection admin = adminConnection();
             Statement statement = admin.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {
            rs.next();
            return rs.getBoolean(1);
        }
    }

    @Test
    void flywayAppliesAllMigrationsSuccessfully() throws Exception {
        try (Connection admin = adminConnection();
             Statement statement = admin.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT count(*) FILTER (WHERE success), count(*) FROM eam.flyway_schema_history")) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(rs.getInt(2)).isGreaterThanOrEqualTo(2);
        }
    }

    @Test
    void runtimeRoleIsNotSuperuserAndDoesNotBypassRls() throws Exception {
        assertThat(queryBoolean("SELECT rolsuper FROM pg_roles WHERE rolname = 'eam_runtime'")).isFalse();
        assertThat(queryBoolean("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'eam_runtime'")).isFalse();
    }

    @Test
    void rlsIsEnabledOnTenantsAndUsers() throws Exception {
        assertThat(queryBoolean("SELECT relrowsecurity FROM pg_class WHERE oid = 'eam.tenants'::regclass")).isTrue();
        assertThat(queryBoolean("SELECT relrowsecurity FROM pg_class WHERE oid = 'eam.users'::regclass")).isTrue();
    }

    @Test
    void runtimeRoleCannotHardDelete() throws Exception {
        UUID tenantId = UUID.randomUUID();
        seedTenantWithUser(tenantId, "delete-" + tenantId + "@example.com");
        try (Connection runtime = runtimeConnection(tenantId);
             Statement statement = runtime.createStatement()) {
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM eam.users"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }

    @Test
    void loginLookupRoleReadsEmailAcrossTenantsButCannotWrite() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@example.com";
        String emailB = "b-" + tenantB + "@example.com";
        seedTenantWithUser(tenantA, emailA);
        seedTenantWithUser(tenantB, emailB);

        try (Connection login = loginLookupConnection();
             Statement statement = login.createStatement();
             ResultSet rs = statement.executeQuery("SELECT email FROM eam.users")) {
            List<String> emails = new ArrayList<>();
            while (rs.next()) {
                emails.add(rs.getString(1));
            }
            assertThat(emails).contains(emailA, emailB);
        }

        try (Connection login = loginLookupConnection();
             Statement statement = login.createStatement()) {
            assertThatThrownBy(() -> statement.executeUpdate("UPDATE eam.users SET email = 'x'"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }
}
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && ./mvnw -B -q verify -Dit.test=MigrationIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true
```

Expected: FAIL (`relation "eam.tenants" does not exist`).

- [ ] **Step 3: Write the migration**

`backend/src/main/resources/db/migration/V20261003_0910__Create_tenants_and_users.sql`:

```sql
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
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd backend && ./mvnw -B -q verify -Dit.test=MigrationIT -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false -Djacoco.skip=true
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add backend
git commit -m "feat(env): baseline tenants/users migration with RLS and role grants

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tenant context plumbing and RLS canary

**Files:**
- Create: `backend/src/main/java/com/eam/tenant/TenantContextHolder.java`
- Create: `backend/src/main/java/com/eam/config/TenantAwareDataSource.java`
- Create: `backend/src/main/java/com/eam/config/DataSourceConfig.java`
- Test: `backend/src/test/java/com/eam/tenant/TenantContextHolderTest.java` (plain unit test, no DB)
- Test: `backend/src/test/java/com/eam/tenant/RlsCanaryIT.java`

**Interfaces:**
- Consumes: `AbstractPostgresIT`, `MigrationIT.seedTenantWithUser(UUID, String)` (package-private static in `com.eam.db`; **this task copies the helper into a new `com.eam.support.TenantSeed` class** so tests in other packages can use it — see Step 1).
- Produces:
  - `com.eam.tenant.TenantContextHolder`: `static void setTenantId(String)`, `static String getTenantId()` (throws `IllegalStateException` if unbound), `static void setUserId(String)`, `static String getCurrentUserId()`, `static void clear()`.
  - `com.eam.config.TenantAwareDataSource extends DelegatingDataSource` and a `@Primary DataSource` bean named `dataSource` that wraps a Hikari pool.
  - `com.eam.support.TenantSeed.seedTenantWithUser(UUID tenantId, String email)`.

- [ ] **Step 1: Extract the seed helper**

Create `backend/src/test/java/com/eam/support/TenantSeed.java`:

```java
package com.eam.support;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/** Inserts rows as the bootstrap admin (bypasses RLS) so tests control exactly what exists. */
public final class TenantSeed {

    private TenantSeed() {
    }

    public static void seedTenantWithUser(UUID tenantId, String email) throws SQLException {
        try (Connection admin = AbstractPostgresIT.adminConnection()) {
            try (PreparedStatement tenant = admin.prepareStatement(
                    "INSERT INTO eam.tenants (id, name) VALUES (?, ?)")) {
                tenant.setObject(1, tenantId);
                tenant.setString(2, "Tenant " + tenantId);
                tenant.executeUpdate();
            }
            try (PreparedStatement user = admin.prepareStatement(
                    "INSERT INTO eam.users (id, tenant_id, email) VALUES (?, ?, ?)")) {
                user.setObject(1, UUID.randomUUID());
                user.setObject(2, tenantId);
                user.setString(3, email);
                user.executeUpdate();
            }
        }
    }
}
```

In `MigrationIT`, delete its private `seedTenantWithUser` method, add `import com.eam.support.TenantSeed;` and change the three call sites to `TenantSeed.seedTenantWithUser(...)`. Remove now-unused imports (`PreparedStatement`) so Checkstyle passes.

- [ ] **Step 2: Write the failing tests**

`backend/src/test/java/com/eam/tenant/TenantContextHolderTest.java`:

```java
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
```

`backend/src/test/java/com/eam/tenant/RlsCanaryIT.java`:

```java
package com.eam.tenant;

import com.eam.support.AbstractPostgresIT;
import com.eam.support.TenantSeed;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RlsCanaryIT extends AbstractPostgresIT {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @AfterEach
    void cleanUp() {
        TenantContextHolder.clear();
    }

    private List<String> emailsVisible() {
        return jdbcTemplate.queryForList(
                "SELECT email FROM eam.users WHERE email LIKE '%@canary.test'", String.class);
    }

    @Test
    void appConnectionIsNotSuperuser() throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)")) {
            rs.next();
            assertThat(rs.getString(1)).isEqualTo(RUNTIME_USER);
            assertThat(rs.getBoolean(2)).isFalse();
        }
    }

    @Test
    void rlsIsolatesTenants() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@canary.test";
        String emailB = "b-" + tenantB + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, emailA);
        TenantSeed.seedTenantWithUser(tenantB, emailB);

        TenantContextHolder.setTenantId(tenantA.toString());
        assertThat(transactionTemplate.execute(status -> emailsVisible())).containsExactly(emailA);

        TenantContextHolder.setTenantId(tenantB.toString());
        assertThat(transactionTemplate.execute(status -> emailsVisible())).containsExactly(emailB);
    }

    @Test
    void failsClosedWhenNoTenantBound() throws Exception {
        TenantSeed.seedTenantWithUser(UUID.randomUUID(), "unbound-" + UUID.randomUUID() + "@canary.test");

        TenantContextHolder.clear();
        assertThat(transactionTemplate.execute(status -> emailsVisible())).isEmpty();
    }

    @Test
    void settingTenantInsideAnOpenTransactionTakesEffect() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailB = "b-" + tenantB + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, "a-" + tenantA + "@canary.test");
        TenantSeed.seedTenantWithUser(tenantB, emailB);

        List<String> seen = transactionTemplate.execute(status -> {
            TenantContextHolder.setTenantId(tenantB.toString());
            return emailsVisible();
        });
        assertThat(seen).containsExactly(emailB);
    }

    @Test
    void tenantContextSurvivesCommitOnSameConnection() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, emailA);
        TenantSeed.seedTenantWithUser(tenantB, "b-" + tenantB + "@canary.test");

        TenantContextHolder.setTenantId(tenantA.toString());
        try (Connection connection = dataSource.getConnection()) {
            assertThat(visibleOn(connection)).containsExactly(emailA);
            connection.commit();
            assertThat(visibleOn(connection)).containsExactly(emailA);
            connection.rollback();
            assertThat(visibleOn(connection)).containsExactly(emailA);
        }
    }

    private static List<String> visibleOn(Connection connection) throws Exception {
        List<String> emails = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT email FROM eam.users WHERE email LIKE '%@canary.test'")) {
            while (rs.next()) {
                emails.add(rs.getString(1));
            }
        }
        return emails;
    }
}
```

- [ ] **Step 3: Run to verify they fail**

```bash
cd backend && ./mvnw -B -q verify -Dtest=TenantContextHolderTest -Dit.test=RlsCanaryIT -Djacoco.skip=true
```

Expected: FAIL (compilation: `TenantContextHolder` does not exist).

- [ ] **Step 4: Write the implementation**

`backend/src/main/java/com/eam/tenant/TenantContextHolder.java`:

```java
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
```

`backend/src/main/java/com/eam/config/TenantAwareDataSource.java`:

```java
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
 * transaction on the same physical connection would otherwise run with no tenant and RLS would
 * fail closed.
 */
public class TenantAwareDataSource extends DelegatingDataSource {

    public TenantAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws SQLException {
        Connection connection = super.getConnection();
        applyTenantContext(connection);
        return wrapForReapplyOnTransactionBoundary(connection);
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        Connection connection = super.getConnection(username, password);
        applyTenantContext(connection);
        return wrapForReapplyOnTransactionBoundary(connection);
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
```

`backend/src/main/java/com/eam/config/DataSourceConfig.java`:

```java
package com.eam.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    /**
     * Defining this bean makes Spring Boot's DataSource auto-configuration back off, so the
     * pool size is read explicitly here instead of through spring.datasource.hikari binding.
     */
    @Primary
    @Bean(name = "dataSource")
    public DataSource dataSource(
            DataSourceProperties properties,
            @Value("${spring.datasource.hikari.maximum-pool-size:10}") int maximumPoolSize) {
        HikariDataSource raw = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        raw.setMaximumPoolSize(maximumPoolSize);
        return new TenantAwareDataSource(raw);
    }
}
```

- [ ] **Step 5: Run to verify they pass**

```bash
cd backend && ./mvnw -B -q verify -Dtest=TenantContextHolderTest -Dit.test=RlsCanaryIT -Djacoco.skip=true
```

Expected: PASS (`TenantContextHolderTest` 6 tests, `RlsCanaryIT` 5 tests). If `settingTenantInsideAnOpenTransactionTakesEffect` fails because no `EntityManagerHolder` is bound (no entities in the skeleton), report it to the user as a finding rather than weakening the test: it means the transaction-reapply path needs a JPA entity to exercise and the test should move to the first story that adds one.

- [ ] **Step 6: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add backend
git commit -m "feat(env): tenant context plumbing and RLS canary tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Frontend skeleton

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/.eslintrc.cjs`
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/vite-env.d.ts`, `frontend/src/test/setup.ts`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: npm scripts `dev`, `build` (`tsc && vite build`), `lint`, `test` (`vitest run`); Vite server on `VITE_PORT` (default 5273) proxying `/api` to `VITE_API_URL` (default `http://localhost:8180`).

- [ ] **Step 1: Write the config files**

`frontend/package.json`:

```json
{
  "name": "eam-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/dom": "^10.4.1",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^8.57.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.26",
    "jsdom": "^24.1.0",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0"
  }
}
```

`frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

`frontend/vite.config.ts`:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '5273'),
    host: true,
    allowedHosts: [
      'mikebarnes.tail67dcb4.ts.net',
      'host.docker.internal',
      ...(process.env.VITE_ALLOWED_HOST ? [process.env.VITE_ALLOWED_HOST] : []),
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8180',
        changeOrigin: true,
      },
    },
  },
})
```

`frontend/.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
  },
}
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eam</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`frontend/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`frontend/src/test/setup.ts`:

```ts
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 2: Write the failing test**

`frontend/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the application heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /eam/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Install and run to verify it fails**

```bash
cd frontend && npm install --legacy-peer-deps && npm run test
```

Expected: FAIL (`Failed to resolve import "./App"`). `package-lock.json` is created; keep it.

- [ ] **Step 4: Write the implementation**

`frontend/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main>
      <h1>eam</h1>
    </main>
  )
}
```

`frontend/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Note: the `tsconfig.json` `exclude` for test files that FreightClub uses is intentionally omitted; `tsc` here type-checks tests too, so test type errors fail the build.

- [ ] **Step 5: Run lint, tests, and build**

```bash
cd frontend && npm run lint && npm run test && npm run build
```

Expected: lint clean, 1 test passes, `dist/` is produced.

- [ ] **Step 6: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add frontend
git commit -m "feat(env): frontend skeleton (React, Vite, Vitest)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Docker images, compose files, env template

**Files:**
- Create: `backend/Dockerfile`, `backend/.dockerignore`
- Create: `frontend/Dockerfile.dev`, `frontend/.dockerignore`
- Create: `docker-compose.dev.yml`, `docker-compose.test.yml`, `.env.example`

**Interfaces:**
- Consumes: backend env contract from `application.yml` (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `FLYWAY_DB_USERNAME`, `FLYWAY_DB_PASSWORD`, `DB_LOGIN_PASSWORD`, `PORT`).
- Produces: `docker-compose.test.yml` services `test-db` (host 5434) and `backend-test` (host 9191, health at `/actuator/health`); `docker-compose.dev.yml` services `db` (5433), `backend` (8180), `frontend` (5273).

- [ ] **Step 1: Write the Dockerfiles and ignore files**

`backend/Dockerfile`:

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml checkstyle.xml pmd-ruleset.xml ./
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -Djacoco.skip=true -Dcheckstyle.skip=true -Dpmd.skip=true -q

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system appgroup && useradd --system --gid appgroup --home-dir /app appuser \
    && chown -R appuser:appgroup /app
USER appuser
COPY --from=build /app/target/eam-backend-*.jar app.jar
EXPOSE 8180
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`backend/.dockerignore`:

```
target
.mvn/wrapper/maven-wrapper.jar
```

`frontend/Dockerfile.dev`:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 5273
ENV VITE_PORT=5273
CMD ["npm", "run", "dev", "--", "--host"]
```

`frontend/.dockerignore`:

```
node_modules
dist
```

- [ ] **Step 2: Write `.env.example`**

```
# Copy to .env for local dev. .env, .env.test and .env.prod are gitignored.
# Ports are eam-specific so eam can run beside FreightClub (9090/9091/5173/5432).

# --- Postgres (dev) ---
EAM_DB_ADMIN_PASSWORD=change-me-admin
EAM_DB_RUNTIME_PASSWORD=change-me-runtime
EAM_DB_LOGIN_PASSWORD=change-me-login

# --- Host ports (dev) ---
EAM_DB_PORT=5433
EAM_BACKEND_PORT=8180
EAM_FRONTEND_PORT=5273

# --- Frontend ---
# Add the current Tailscale hostname here if you reach Vite through the tailnet.
VITE_ALLOWED_HOST=
```

- [ ] **Step 3: Write `docker-compose.dev.yml`**

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: eam_db
      POSTGRES_USER: eam_admin
      POSTGRES_PASSWORD: ${EAM_DB_ADMIN_PASSWORD:?set EAM_DB_ADMIN_PASSWORD in .env}
    ports:
      - "${EAM_DB_PORT:-5433}:5432"
    volumes:
      - eam_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eam_admin -d eam_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    build:
      context: ./backend
    environment:
      PORT: 8180
      DB_URL: jdbc:postgresql://db:5432/eam_db?currentSchema=eam
      DB_USERNAME: eam_runtime
      DB_PASSWORD: ${EAM_DB_RUNTIME_PASSWORD:?set EAM_DB_RUNTIME_PASSWORD in .env}
      FLYWAY_DB_USERNAME: eam_admin
      FLYWAY_DB_PASSWORD: ${EAM_DB_ADMIN_PASSWORD}
      DB_LOGIN_PASSWORD: ${EAM_DB_LOGIN_PASSWORD:?set EAM_DB_LOGIN_PASSWORD in .env}
    ports:
      - "${EAM_BACKEND_PORT:-8180}:8180"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8180/actuator/health"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    environment:
      VITE_PORT: 5273
      VITE_API_URL: http://backend:8180
      VITE_ALLOWED_HOST: ${VITE_ALLOWED_HOST:-}
    ports:
      - "${EAM_FRONTEND_PORT:-5273}:5273"
    depends_on:
      - backend

volumes:
  eam_postgres_data:
```

- [ ] **Step 4: Write `docker-compose.test.yml`**

These are throwaway test-only credentials (same values the Testcontainers base class uses); the test database is never reachable outside the machine.

```yaml
services:
  test-db:
    image: postgis/postgis:16-3.4
    container_name: eam-test-db
    environment:
      POSTGRES_DB: eam_test
      # Bootstrap superuser, used ONLY by Flyway. Deliberately not eam_runtime: superusers
      # bypass RLS unconditionally, so running the app as this user would make every RLS
      # test pass for the wrong reason.
      POSTGRES_USER: eam_test_admin
      POSTGRES_PASSWORD: eam_admin
      POSTGRES_INITDB_ARGS: "-c max_connections=400"
    ports:
      - "5434:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U eam_test_admin -d eam_test"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  backend-test:
    build:
      context: ./backend
    container_name: eam-test-backend
    ports:
      - "9191:9191"
    depends_on:
      test-db:
        condition: service_healthy
    environment:
      PORT: 9191
      DB_URL: jdbc:postgresql://test-db:5432/eam_test?currentSchema=eam
      DB_USERNAME: eam_runtime
      DB_PASSWORD: eam_runtime_pw
      FLYWAY_DB_USERNAME: eam_test_admin
      FLYWAY_DB_PASSWORD: eam_admin
      DB_LOGIN_PASSWORD: eam_login
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9191/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

- [ ] **Step 5: Verify the test stack comes up**

Follow the global Pre-Test Protocol steps that apply (volumes down, build JAR, up). Via the Docker MCP tool, run the equivalent of:

```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up --build -d
```

Then poll `http://localhost:9191/actuator/health` for up to 60s:

```bash
for i in $(seq 1 30); do curl -sf http://localhost:9191/actuator/health && break; sleep 2; done
```

Expected: `{"status":"UP"}`. Also check the dev compose parses: `docker compose -f docker-compose.dev.yml config -q` with a throwaway `.env` copied from `.env.example` (do not commit it). Then bring the test stack down (`down -v`).

- [ ] **Step 6: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add backend/Dockerfile backend/.dockerignore frontend/Dockerfile.dev frontend/.dockerignore docker-compose.dev.yml docker-compose.test.yml .env.example
git commit -m "feat(env): Dockerfiles, dev/test compose, env template

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `./mvnw verify` (Task 1-3), `npm run lint/test/build` (Task 4). Testcontainers needs the runner's Docker, which `ubuntu-latest` provides; no service container.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: ["**"]
    paths-ignore:
      - "**/*.md"
      - "docs/**"
      - ".gitignore"
  pull_request:
    branches: ["**"]
    paths-ignore:
      - "**/*.md"
      - "docs/**"
      - ".gitignore"

jobs:
  backend:
    name: Backend - Build and Verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: temurin
          cache: maven

      # Testcontainers starts the PostGIS container itself, using the bootstrap superuser as
      # the Flyway admin and the non-superuser eam_runtime role for app traffic (see
      # AbstractPostgresIT). Checkstyle, PMD and the JaCoCo branch floor all run in verify.
      - name: Verify
        working-directory: backend
        run: ./mvnw -B verify

      - name: Upload JaCoCo report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: backend/target/site/jacoco/

  frontend:
    name: Frontend - Lint, Test and Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci --legacy-peer-deps

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Test
        working-directory: frontend
        run: npm run test

      - name: Build
        working-directory: frontend
        run: npm run build
```

- [ ] **Step 2: Validate the YAML parses**

```bash
python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"
```

Expected: `ok`. (A real CI run only happens once the branch is pushed; do not push without asking the user.)

- [ ] **Step 3: Commit**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
git add .github
git commit -m "feat(env): CI workflow for backend verify and frontend build

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Rules, docs, and role-doc ports

**Files:**
- Create: `.claude/rules/postgres-native.md`, `database-migrations.md`, `ARCHITECTURE.md`
- Modify: `CLAUDE.md:71` (the "not multi-tenant" line)
- Modify: `docs/roles/REVIEWER.md:69-70` (section 3), `docs/roles/LIBRARIAN.md` (Core Rules list), `docs/roles/ARCHITECT.md:81-88` (Deliverables)

- [ ] **Step 1: Write `.claude/rules/postgres-native.md`**

```markdown
# eam PostgreSQL Native Standards

## Keys & Types
- `UUID` for all primary and foreign keys.
- `TIMESTAMPTZ` (`OffsetDateTime` in Java) for all date/time fields.
- `VARCHAR` or `TEXT` for strings. Never `CHAR(n)`.

## Multi-Tenancy & Isolation
- Every tenant-owned table has a `tenant_id UUID NOT NULL` column, RLS enabled, and a policy keyed on `NULLIF(current_setting('app.current_tenant', true), '')::uuid` (fail closed: unset means zero rows).
- The GUC is exactly `app.current_tenant`. It is set by `TenantAwareDataSource` from `TenantContextHolder`. Do not invent other names.
- The app connects as `eam_runtime` (non-superuser, NOBYPASSRLS). Never run app traffic or RLS tests as the Flyway admin: superusers bypass RLS.
- Every query includes the tenant filter in application code as well (defense in depth), derived from `TenantContextHolder`.
- No joins across different `tenant_id` values.
- Every new tenant-owned table's migration must `GRANT` to `eam_runtime` explicitly (no default privileges) and ship its own RLS policy.

## Soft Delete
- Never `DELETE` core entities. Set `deleted_at = CURRENT_TIMESTAMP`.
- All `SELECT`s include `AND deleted_at IS NULL`.
- `eam_runtime` is never granted `DELETE`.

## Concurrency & Performance
- `SELECT ... FOR UPDATE` (`@Lock` in JPA) for claim-style operations and refresh-token rotation.
- Composite index `(tenant_id, deleted_at)` on frequently scanned tables.

## RLS Exemption: Session-Token Tables
Auth-adjacent, non-tenant-scoped session/token tables (e.g. refresh tokens, password-reset tokens) are RLS-exempt by design: no `tenant_id` column, access-controlled by application-layer role checks. Any table with a `tenant_id`, or holding a tenant's business records, still requires RLS without exception.

## Pre-Auth Lookup Role
`eam_login_lookup` has column-level SELECT on `users(id, tenant_id, email, deleted_at)` and a SELECT-only policy. It exists so login can find a user before any tenant is known. Do not widen its grants without ARCHITECT sign-off.
```

- [ ] **Step 2: Write `database-migrations.md`**

```markdown
# Database Migrations (Flyway)

Flyway owns all DDL. Hibernate only validates (`ddl-auto=validate`).

## Rules
1. Never modify a committed migration. Flyway checksums applied files; editing one breaks every environment that already ran it. Fix forward with a new migration.
2. Filename: `VYYYYMMDD_HHmm__Description_With_Underscores.sql` (double underscore before the description). Location: `backend/src/main/resources/db/migration/`.
3. Every new tenant-owned table: `tenant_id UUID NOT NULL`, `deleted_at TIMESTAMPTZ`, `ENABLE ROW LEVEL SECURITY`, a tenant-isolation policy on `app.current_tenant`, an explicit `GRANT SELECT, INSERT, UPDATE` to `eam_runtime`, and an index on `(tenant_id, deleted_at)`. See `.claude/rules/postgres-native.md`.
4. Every new `@Entity` ships with its migration in the same PR. An entity without a migration fails `ddl-auto=validate` at startup.
5. Role passwords come from Flyway placeholders (`${runtime_password}`, `${login_lookup_password}`), never literals.
6. Flyway runs as the admin user (`FLYWAY_DB_USERNAME`); the app runs as `eam_runtime`. They must never be the same user.

## Local workflow
1. Add the migration file.
2. Run `./mvnw verify` in `backend/` (Testcontainers applies all migrations to a fresh database).
3. Start the app; Flyway applies it on startup.

## Test database
Integration tests extend `AbstractPostgresIT` (Testcontainers, PostGIS image, bootstrap superuser as Flyway admin, `eam_runtime` for app traffic). `docker-compose.test.yml` provides the same three-role layout for running the full stack on ports 5434 (db) and 9191 (backend).

## Merge conflicts
Two branches adding migrations with close timestamps are fine as long as the filenames differ; keep the `HHmm` unique per branch.
```

- [ ] **Step 3: Write `ARCHITECTURE.md`**

```markdown
# eam Architecture

eam is a multi-tenant utility asset and field operations platform. This document covers the development-environment baseline only; domain design is owned by ARCHITECT per story.

## Stack
Java 21, Spring Boot 3.5, Maven wrapper, PostgreSQL 16 (PostGIS image, extension not yet enabled), Flyway, React 18 + TypeScript + Vite.

## Multi-tenancy
- Tenant identity lives in `TenantContextHolder` (ThreadLocal) and must be cleared in a `finally` block.
- `TenantAwareDataSource` wraps the Hikari pool and issues `SET LOCAL app.current_tenant = '<uuid>'` as its own statement on every connection, and again after every `commit()`/`rollback()`.
- Postgres RLS policies on every tenant-owned table filter on that setting; unset means zero rows (fail closed).
- `spring.jpa.open-in-view=false`: with OSIV on, one connection serves several transactions per request and SET LOCAL is lost after the first.

## Database roles
| Role | Purpose | Privileges |
|---|---|---|
| bootstrap admin | Flyway only | superuser (bypasses RLS) |
| `eam_runtime` | all app traffic | SELECT/INSERT/UPDATE on tenant tables, subject to RLS; no DELETE |
| `eam_login_lookup` | pre-auth user lookup | column-level SELECT on `users(id, tenant_id, email, deleted_at)` |

## Ports
| Service | Dev | Test |
|---|---|---|
| Postgres | 5433 | 5434 |
| Backend | 8180 | 9191 |
| Vite | 5273 | n/a |

## Running
- Backend tests: `cd backend && ./mvnw verify` (Docker must be running; Testcontainers).
- Frontend: `cd frontend && npm run lint && npm run test && npm run build`.
- Full stack: copy `.env.example` to `.env`, then `docker compose -f docker-compose.dev.yml up --build`.
- Test stack: `docker compose -f docker-compose.test.yml up --build -d`, health at `http://localhost:9191/actuator/health`.

## Not yet wired
`eam_login_lookup` has a role and grants but no `DataSource` bean yet; US-001 (login/RBAC) adds it with the JWT filter. `httpBasic` in `SecurityConfig` is a placeholder until then.
```

- [ ] **Step 4: Replace the "not multi-tenant" lines**

In `CLAUDE.md`, replace line 71:

```
This project is not multi-tenant; no tenant-isolation rules apply.
```

with:

```
This project is multi-tenant (`tenant_id` + Postgres RLS on `app.current_tenant`). Full DB rules: `.claude/rules/postgres-native.md`. Migrations (Flyway): `database-migrations.md`. Environment, ports, and run commands: `ARCHITECTURE.md`. eam ports are backend 8180/9191, Postgres 5433/5434, Vite 5273 (not FreightClub's 9090/9091/5173).
```

In `docs/roles/REVIEWER.md`, replace section 3 body (line 70, `- [ ] N/A — this project is not multi-tenant.`) with:

```
* [ ] **Database Migrations:** Does the Flyway script include `tenant_id`, `ENABLE ROW LEVEL SECURITY`, a tenant-isolation policy on `app.current_tenant`, and an explicit `GRANT` to `eam_runtime` (no `DELETE`)? Tables exempt under the session-token carve-out in `.claude/rules/postgres-native.md` are the only exception.
* [ ] **Entity-Migration Parity:** Does this PR add any new `@Entity`? If yes, verify a corresponding migration exists (`VYYYYMMDD_HHmm__Desc.sql`). Orphaned entities without migrations fail `ddl-auto=validate`.
* [ ] **Schema Type Consistency:** All id/code/string columns use `UUID`, `VARCHAR`, or `TEXT`, never `CHAR(n)`; timestamps are `TIMESTAMPTZ`.
* [ ] **RLS Proof:** New tenant-owned tables are covered by a test that connects as `eam_runtime` (not the admin) and shows one tenant cannot read another's rows.
```

In `docs/roles/LIBRARIAN.md`, add as a new bullet at the end of the "Core Rules" list (after the "Post-merge branch cleanup" bullet):

```
- **Flyway filename check:** Ensure every new migration filename matches `VYYYYMMDD_HHmm__Desc.sql` and that the story's sign-off records the migration version(s) it added.
```

In `docs/roles/ARCHITECT.md` Deliverables, change item 5 (`5. Soft-delete / multi-tenancy notes, if applicable to this project`) to:

```
5. Soft-delete and multi-tenancy notes (this project is multi-tenant: RLS policy per tenant-owned table, per `.claude/rules/postgres-native.md`)
6. Flyway migration plan: filename(s) per `database-migrations.md` and the grants each new table needs
```

- [ ] **Step 5: Verify no stale "not multi-tenant" text remains**

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam
grep -rn 'not multi-tenant' --include=*.md . | grep -v 'docs/superpowers/'
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add .claude/rules/postgres-native.md database-migrations.md ARCHITECTURE.md CLAUDE.md docs/roles
git commit -m "docs(env): multi-tenant rules, migrations guide, architecture, role-doc ports

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Final verification (Definition of Done)

**Files:** none created; this task proves the spec's Section 5.

- [ ] **Step 1: Pre-flight**

Confirm no stale Java process holds `backend/target`, and no test containers are running (use the Docker MCP tool to list; stop any `eam-test-*` containers). Then:

```bash
cd /c/projects/mdbintegratedlogistics/projects/eam/backend && ./mvnw -B clean verify 2>&1 | tail -40
```

Expected: `BUILD SUCCESS`. Confirm in the output: Checkstyle 0 violations, all tests pass (`HealthEndpointIT` 1, `MigrationIT` 5, `RlsCanaryIT` 5, `TenantContextHolderTest` 6), PMD clean, JaCoCo `All coverage checks have been met`. If JaCoCo fails the 0.65 branch floor, add tests for the uncovered branches (read `target/site/jacoco/index.html`); do not lower the floor.

- [ ] **Step 2: Frontend**

```bash
cd ../frontend && npm run lint && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 3: Running stack**

Via the Docker MCP tool: `down -v`, then `up --build -d` on `docker-compose.test.yml`, poll `http://localhost:9191/actuator/health` (max 60s) for `{"status":"UP"}`, then `down -v`.

- [ ] **Step 4: Report against the Definition of Done**

Report each of the five spec criteria as pass/fail with the evidence line (build result, Flyway migration count from `MigrationIT`, canary pass, `npm run build`, health response). If any fail, say so with the output; do not claim completion.

- [ ] **Step 5: Hand off**

`git log --oneline chore/dev-environment-spec..chore/dev-environment` to list the commits, and tell the user the branch is ready for REVIEWER. Do not push or open a PR without asking.
