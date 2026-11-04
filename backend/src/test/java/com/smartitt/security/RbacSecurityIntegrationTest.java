package com.smartitt.security;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Role-Based Access Control (RBAC) & Security Integration Tests")
class RbacSecurityIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Anonymous request to protected /api/v1/trips endpoint should be denied")
    void testAnonymousRequestToProtectedEndpointsShouldBeDenied() throws Exception {
        mockMvc.perform(get("/api/v1/trips")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Driver attempting to access /api/v1/admin/dashboard should receive HTTP 403 Forbidden")
    void testDriverAccessToAdminDashboardForbidden() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Supervisor attempting to access /api/v1/admin/dashboard should receive HTTP 403 Forbidden")
    void testSupervisorAccessToAdminDashboardForbidden() throws Exception {
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Administrator accessing /api/v1/admin/dashboard should receive HTTP 200 OK")
    void testAdminAccessToAdminDashboardAllowed() throws Exception {
        String adminToken = obtainToken("ADMIN", "Admin@123");

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .headers(authHeader(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDrivers", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.activeVehicles", greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("Driver accessing /api/v1/admin/drivers should receive HTTP 403 Forbidden")
    void testDriverAccessToAdminDriversRosterForbidden() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/admin/drivers")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Request with malformed or tampered JWT token should be rejected with HTTP 403 Forbidden")
    void testMalformedJwtTokenRejected() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidPayload.invalidSignature999");
        headers.setContentType(MediaType.APPLICATION_JSON);

        mockMvc.perform(get("/api/v1/trips")
                        .headers(headers))
                .andExpect(status().isForbidden());
    }
}

