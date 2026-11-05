package com.smartitt.vehicle;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Supervisor Dynamic Vehicle Fleet & Trip Filtering Integration Tests")
public class VehicleFleetAndFilterIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Supervisor retrieves all registered fleet vehicles dynamically from /api/v1/vehicles")
    void supervisorCanRetrieveAllFleetVehiclesDynamically() throws Exception {
        String supervisorToken = obtainToken("SUP001", "supervisor");
        HttpHeaders headers = authHeader(supervisorToken);

        mockMvc.perform(get("/api/v1/vehicles").headers(headers))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(20)))
                .andExpect(jsonPath("$[*].vehicleNumber", hasItem("LY-6439")))
                .andExpect(jsonPath("$[*].vehicleNumber", hasItem("LY-6434")))
                .andExpect(jsonPath("$[*].vehicleNumber", hasItem("LY-6435")));
    }

    @Test
    @DisplayName("Filter fleet vehicles by status ACTIVE")
    void filterVehiclesByStatusActive() throws Exception {
        String supervisorToken = obtainToken("SUP001", "supervisor");
        HttpHeaders headers = authHeader(supervisorToken);

        mockMvc.perform(get("/api/v1/vehicles?status=ACTIVE").headers(headers))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$[0].status", equalToIgnoringCase("ACTIVE")));
    }

    @Test
    @DisplayName("Search vehicles dynamically by plate fragment")
    void searchVehiclesByPlateFragment() throws Exception {
        String supervisorToken = obtainToken("SUP001", "supervisor");
        HttpHeaders headers = authHeader(supervisorToken);

        mockMvc.perform(get("/api/v1/vehicles?search=6439").headers(headers))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$[0].vehicleNumber", equalTo("LY-6439")))
                .andExpect(jsonPath("$[0].chassisNumber", equalTo("SCK 100")));
    }

    @Test
    @DisplayName("Supervisor filters trips by vehicleNumber through backend API")
    void supervisorFiltersTripsByVehicle() throws Exception {
        String supervisorToken = obtainToken("SUP001", "supervisor");
        HttpHeaders headers = authHeader(supervisorToken);

        mockMvc.perform(get("/api/v1/trips?vehicleNumber=LY-6439").headers(headers))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)));
    }

    @Test
    @DisplayName("Supervisor multi-filter compatibility (vehicle + terminal + status)")
    void supervisorMultiFilterTripsWithAndLogic() throws Exception {
        String supervisorToken = obtainToken("SUP001", "supervisor");
        HttpHeaders headers = authHeader(supervisorToken);

        mockMvc.perform(get("/api/v1/trips?vehicleNumber=LY-6439&terminal=ECT&status=PENDING_APPROVAL").headers(headers))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)));
    }
}
