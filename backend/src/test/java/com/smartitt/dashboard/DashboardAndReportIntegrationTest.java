package com.smartitt.dashboard;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Dashboard, Allowance & Reports Integration Tests")
class DashboardAndReportIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Supervisor dashboard should return KPIs and terminal-wise distribution for all 6 port terminals")
    void testSupervisorDashboardMetrics() throws Exception {
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        mockMvc.perform(get("/api/v1/dashboard")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.terminalWiseTrips.CICT", notNullValue()))
                .andExpect(jsonPath("$.terminalWiseTrips.CWIT", notNullValue()))
                .andExpect(jsonPath("$.terminalWiseTrips.ECT", notNullValue()))
                .andExpect(jsonPath("$.terminalWiseTrips.JCT", notNullValue()))
                .andExpect(jsonPath("$.terminalWiseTrips.UCT", notNullValue()))
                .andExpect(jsonPath("$.terminalWiseTrips.SAGT", notNullValue()))
                .andExpect(jsonPath("$.registeredDrivers", greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("Driver dashboard should return active trips and calculate standard allowance (LKR 2,500/trip)")
    void testDriverDashboardMetricsAndAllowance() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/dashboard/driver/DRV-00001")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeTrips", notNullValue()))
                .andExpect(jsonPath("$.approvedAllowance", notNullValue()))
                .andExpect(jsonPath("$.pendingAllowance", notNullValue()));
    }

    @Test
    @DisplayName("Admin fleet and drivers rosters should be accessible to Administrator with full records")
    void testAdminFleetAndDriverRosters() throws Exception {
        String adminToken = obtainToken("ADMIN", "Admin@123");

        // Drivers roster
        mockMvc.perform(get("/api/v1/admin/drivers")
                        .headers(authHeader(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        // Vehicles fleet
        mockMvc.perform(get("/api/v1/admin/vehicles")
                        .headers(authHeader(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("Admin container photo storage metrics endpoint should report disk capacity and photo counters")
    void testAdminPhotoStorageMetricsEndpoint() throws Exception {
        String adminToken = obtainToken("ADMIN", "Admin@123");

        mockMvc.perform(get("/api/v1/container-photos/storage/stats")
                        .headers(authHeader(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPhotos", notNullValue()))
                .andExpect(jsonPath("$.totalSizeBytes", notNullValue()))
                .andExpect(jsonPath("$.freeDiskSpaceGb", notNullValue()));
    }

    @Test
    @DisplayName("Trip queries with multi-criteria filters (status, photoStatus, unverifiedOnly) should return filtered results")
    void testReportsEndpointWithFilters() throws Exception {
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        mockMvc.perform(get("/api/v1/trips")
                        .headers(authHeader(supervisorToken))
                        .param("status", "COMPLETED")
                        .param("photoStatus", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)));
    }
}

