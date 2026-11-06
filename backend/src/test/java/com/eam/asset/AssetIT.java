package com.eam.asset;

// Story: US-002. AC 1 (search by Asset ID), AC 2 (hierarchy), AC 3 (no match), plus tenant isolation,
// soft delete, role gating and the PostGIS round trip as eam_runtime.

import com.eam.auth.AuthProperties;
import com.eam.auth.AuthenticatedUser;
import com.eam.auth.JwtService;
import com.eam.auth.Role;
import com.eam.support.AbstractPostgresIT;
import com.eam.support.AssetSeed;
import com.eam.support.TenantSeed;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AssetIT extends AbstractPostgresIT {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private AuthProperties properties;

    private UUID newTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        return tenantId;
    }

    private String token(UUID tenantId, Role role) {
        return new JwtService(properties).issue(new AuthenticatedUser(UUID.randomUUID(), tenantId, role));
    }

    private ResultActions search(UUID tenantId, String assetId) throws Exception {
        return mockMvc.perform(get("/api/v1/assets").param("assetId", assetId)
                .header("Authorization", "Bearer " + token(tenantId, Role.OPERATOR)));
    }

    private ResultActions fetch(UUID tenantId, UUID assetId) throws Exception {
        return mockMvc.perform(get("/api/v1/assets/" + assetId)
                .header("Authorization", "Bearer " + token(tenantId, Role.OPERATOR)));
    }

    // AC 1

    @Test
    void searchByAssetIdReturnsTheAssetSummary() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-S1");

        search(tenantId, "TX-4587-S1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(chain[2].toString()))
                .andExpect(jsonPath("$[0].assetCode").value("TX-4587-S1"))
                .andExpect(jsonPath("$[0].name").value("Main St Transformer"))
                .andExpect(jsonPath("$[0].assetType").value("TRANSFORMER"))
                .andExpect(jsonPath("$[0].status").value("IN_SERVICE"))
                .andExpect(jsonPath("$[0].criticality").value("HIGH"));
    }

    @Test
    void searchIgnoresCaseAndSurroundingSpaces() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-S2");

        search(tenantId, "  tx-4587-s2  ")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(chain[2].toString()));
    }

    @Test
    void assetDetailHasHeaderFieldsLocationAndDetails() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-D1");

        fetch(tenantId, chain[2])
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(chain[2].toString()))
                .andExpect(jsonPath("$.assetCode").value("TX-4587-D1"))
                .andExpect(jsonPath("$.name").value("Main St Transformer"))
                .andExpect(jsonPath("$.status").value("IN_SERVICE"))
                .andExpect(jsonPath("$.criticality").value("HIGH"))
                .andExpect(jsonPath("$.location.latitude").value(40.7128))
                .andExpect(jsonPath("$.location.longitude").value(-74.006))
                .andExpect(jsonPath("$.manufacturer").value("ABB"))
                .andExpect(jsonPath("$.model").value("TX-200"))
                .andExpect(jsonPath("$.serialNumber").value("SN-99812"));
    }

    @Test
    void assetWithNoRecordedLocationAndNoDetailsReturnsNulls() throws Exception {
        UUID tenantId = newTenant();
        UUID substation = AssetSeed.seed(tenantId, "SUB-N1", "SUBSTATION", null);

        fetch(tenantId, substation)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location").value((Object) null))
                .andExpect(jsonPath("$.manufacturer").value((Object) null))
                .andExpect(jsonPath("$.model").value((Object) null))
                .andExpect(jsonPath("$.serialNumber").value((Object) null));
    }

    // AC 2

    @Test
    void hierarchyRunsUtilitySubstationFeederAssetRootFirst() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-H1");

        fetch(tenantId, chain[2])
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hierarchy.length()").value(4))
                .andExpect(jsonPath("$.hierarchy[0].id").value(tenantId.toString()))
                .andExpect(jsonPath("$.hierarchy[0].name").value("Tenant " + tenantId))
                .andExpect(jsonPath("$.hierarchy[0].assetType").value("UTILITY"))
                .andExpect(jsonPath("$.hierarchy[0].assetCode").value((Object) null))
                .andExpect(jsonPath("$.hierarchy[1].id").value(chain[0].toString()))
                .andExpect(jsonPath("$.hierarchy[1].assetCode").value("SUB-3-H1"))
                .andExpect(jsonPath("$.hierarchy[1].assetType").value("SUBSTATION"))
                .andExpect(jsonPath("$.hierarchy[2].id").value(chain[1].toString()))
                .andExpect(jsonPath("$.hierarchy[2].assetType").value("FEEDER"))
                .andExpect(jsonPath("$.hierarchy[3].id").value(chain[2].toString()))
                .andExpect(jsonPath("$.hierarchy[3].assetType").value("TRANSFORMER"));
    }

    @Test
    void substationHierarchyIsUtilityThenItself() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-H2");

        fetch(tenantId, chain[0])
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hierarchy.length()").value(2))
                .andExpect(jsonPath("$.hierarchy[0].assetType").value("UTILITY"))
                .andExpect(jsonPath("$.hierarchy[1].id").value(chain[0].toString()));
    }

    @Test
    void hierarchyOmitsASoftDeletedAncestor() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-H3");
        AssetSeed.softDelete(chain[1]);

        fetch(tenantId, chain[2])
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hierarchy[?(@.assetType == 'FEEDER')]").isEmpty());
    }

    // AC 3

    @Test
    void searchWithNoMatchReturnsAnEmptyArray() throws Exception {
        search(newTenant(), "NO-SUCH-ASSET")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unknownAssetIdReturns404AssetNotFound() throws Exception {
        fetch(newTenant(), UUID.randomUUID())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ASSET_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("No matching asset."));
    }

    // Boundary validation

    @Test
    void blankMissingOrTooLongSearchIsAValidationError() throws Exception {
        UUID tenantId = newTenant();
        String bearer = "Bearer " + token(tenantId, Role.OPERATOR);

        for (String bad : new String[] {"", "   ", "x".repeat(51)}) {
            mockMvc.perform(get("/api/v1/assets").param("assetId", bad).header("Authorization", bearer))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.message").value("Enter an Asset ID."));
        }
        mockMvc.perform(get("/api/v1/assets").header("Authorization", bearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void aMalformedAssetIdPathIsAValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/assets/not-a-uuid")
                        .header("Authorization", "Bearer " + token(newTenant(), Role.OPERATOR)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // Tenant isolation and soft delete

    @Test
    void anotherTenantsAssetIsInvisibleBySearchAndById() throws Exception {
        UUID tenantA = newTenant();
        UUID tenantB = newTenant();
        UUID[] inB = AssetSeed.seedChain(tenantB, "-T1");

        search(tenantA, "TX-4587-T1").andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        fetch(tenantA, inB[2]).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ASSET_NOT_FOUND"));
        search(tenantB, "TX-4587-T1").andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void sameAssetCodeInTwoTenantsReturnsEachTenantsOwnAsset() throws Exception {
        UUID tenantA = newTenant();
        UUID tenantB = newTenant();
        UUID inA = AssetSeed.seed(tenantA, "SHARED-1", "SUBSTATION", null);
        UUID inB = AssetSeed.seed(tenantB, "SHARED-1", "SUBSTATION", null);

        search(tenantA, "SHARED-1").andExpect(jsonPath("$[0].id").value(inA.toString()));
        search(tenantB, "SHARED-1").andExpect(jsonPath("$[0].id").value(inB.toString()));
    }

    @Test
    void aSoftDeletedAssetIsInvisibleBySearchAndById() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-X1");
        AssetSeed.softDelete(chain[2]);

        search(tenantId, "TX-4587-X1").andExpect(jsonPath("$.length()").value(0));
        fetch(tenantId, chain[2]).andExpect(status().isNotFound());
    }

    // Role gating

    @ParameterizedTest
    @EnumSource(Role.class)
    void everyRoleCanSearchAndView(Role role) throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-R" + role.ordinal());
        String bearer = "Bearer " + token(tenantId, role);

        mockMvc.perform(get("/api/v1/assets").param("assetId", "TX-4587-R" + role.ordinal())
                        .header("Authorization", bearer))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/assets/" + chain[2]).header("Authorization", bearer))
                .andExpect(status().isOk());
    }

    @Test
    void aUserWithNoRoleGets403AccessDeniedOnBothEndpoints() throws Exception {
        UUID tenantId = newTenant();
        UUID[] chain = AssetSeed.seedChain(tenantId, "-N1");
        String bearer = "Bearer " + token(tenantId, null);

        mockMvc.perform(get("/api/v1/assets").param("assetId", "TX-4587-N1").header("Authorization", bearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        mockMvc.perform(get("/api/v1/assets/" + chain[2]).header("Authorization", bearer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void anonymousRequestsAre401() throws Exception {
        mockMvc.perform(get("/api/v1/assets").param("assetId", "TX-4587")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/assets/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
    }

    // PostGIS as eam_runtime

    @Test
    void aPointWrittenAsRuntimeComesBackWithTheSameLatitudeAndLongitude() throws Exception {
        UUID tenantId = newTenant();
        UUID id = UUID.randomUUID();
        try (Connection runtime = runtimeConnection(tenantId); Statement statement = runtime.createStatement()) {
            statement.executeUpdate("INSERT INTO eam.assets (id, tenant_id, asset_code, name, asset_type, location)"
                    + " VALUES ('" + id + "', '" + tenantId + "', 'GEO-1', 'Geo', 'SUBSTATION',"
                    + " public.ST_SetSRID(public.ST_MakePoint(-122.41942, 37.77493), 4326)::public.geography)");
            try (ResultSet rs = statement.executeQuery("SELECT public.ST_Y(location::public.geometry), public.ST_X(location::public.geometry)"
                    + " FROM eam.assets WHERE id = '" + id + "'")) {
                rs.next();
                assertThat(rs.getDouble(1)).isEqualTo(37.77493);
                assertThat(rs.getDouble(2)).isEqualTo(-122.41942);
            }
            runtime.commit();
        }

        fetch(tenantId, id)
                .andExpect(jsonPath("$.location.latitude").value(37.77493))
                .andExpect(jsonPath("$.location.longitude").value(-122.41942));
    }
}
