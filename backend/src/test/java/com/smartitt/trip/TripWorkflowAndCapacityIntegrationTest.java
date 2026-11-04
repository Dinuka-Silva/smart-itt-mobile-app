package com.smartitt.trip;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartitt.BaseIntegrationTest;
import com.smartitt.trip.dto.CreateTripRequest;
import com.smartitt.trip.service.TripService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Trip Workflow & Chassis Capacity Rules Integration Tests")
class TripWorkflowAndCapacityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TripService tripService;

    @Test
    @DisplayName("Chassis Rule: Trip with single 40FT container should be accepted (HTTP 201 Created)")
    void testChassisCapacityValidSingle40Ft() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");
        req.setSourceTerminal("CICT");
        req.setDestTerminal("JCT");
        req.setVesselName("MV Colombo Express");
        req.setVehicleNumber("LY-6439");
        req.setChassisNumber("SCK 100");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("CSQU3054383");
        c1.setSize("40FT");
        c1.setIsVerified(true);
        req.setContainers(List.of(c1));

        mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.tripNumber", not(emptyOrNullString())))
                .andExpect(jsonPath("$.containers", hasSize(1)))
                .andExpect(jsonPath("$.containers[0].size", is("40FT")));
    }

    @Test
    @DisplayName("Chassis Rule: Trip with two 20FT containers should be accepted (HTTP 201 Created)")
    void testChassisCapacityValidDouble20Ft() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");
        req.setSourceTerminal("CWIT");
        req.setDestTerminal("ECT");
        req.setVesselName("Ever Given");
        req.setVehicleNumber("LY-6439");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("MSCU7721892");
        c1.setSize("20FT");
        c1.setIsVerified(true);

        CreateTripRequest.ContainerInput c2 = new CreateTripRequest.ContainerInput();
        c2.setContainerNumber("TGHU1234567");
        c2.setSize("20FT");
        c2.setIsVerified(true);

        req.setContainers(List.of(c1, c2));

        mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.containers", hasSize(2)));
    }

    @Test
    @DisplayName("Chassis Rule Violation: Trip with 1x 20FT and 1x 40FT should be rejected (HTTP 400 Bad Request)")
    void testChassisCapacityRejectMixed20FtAnd40Ft() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("MSCU7721892");
        c1.setSize("20FT");

        CreateTripRequest.ContainerInput c2 = new CreateTripRequest.ContainerInput();
        c2.setContainerNumber("CSQU3054383");
        c2.setSize("40FT");

        req.setContainers(List.of(c1, c2));

        mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Chassis capacity exceeded")));
    }

    @Test
    @DisplayName("Chassis Rule Violation: Trip with 3x 20FT should be rejected (HTTP 400 Bad Request)")
    void testChassisCapacityRejectTriple20Ft() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("MSCU1111111");
        c1.setSize("20FT");
        CreateTripRequest.ContainerInput c2 = new CreateTripRequest.ContainerInput();
        c2.setContainerNumber("MSCU2222222");
        c2.setSize("20FT");
        CreateTripRequest.ContainerInput c3 = new CreateTripRequest.ContainerInput();
        c3.setContainerNumber("MSCU3333333");
        c3.setSize("20FT");

        req.setContainers(List.of(c1, c2, c3));

        mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Chassis capacity exceeded")));
    }

    @Test
    @DisplayName("Chassis Rule Violation: Trip with 2x 40FT should be rejected (HTTP 400 Bad Request)")
    void testChassisCapacityRejectDouble40Ft() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("CSQU3054383");
        c1.setSize("40FT");
        CreateTripRequest.ContainerInput c2 = new CreateTripRequest.ContainerInput();
        c2.setContainerNumber("CSQU3054384");
        c2.setSize("40FT");

        req.setContainers(List.of(c1, c2));

        mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Chassis capacity exceeded")));
    }

    @Test
    @DisplayName("Complete End-to-End Workflow: Create -> Approve -> In Progress -> Complete")
    void testEndToEndTripWorkflow() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        // Step 1: Driver creates a trip
        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");
        req.setSourceTerminal("CICT");
        req.setDestTerminal("JCT");
        req.setVesselName("MV Colombo Express");
        req.setVehicleNumber("LY-6439");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("CSQU3054383");
        c1.setSize("40FT");
        c1.setIsVerified(true);
        req.setContainers(List.of(c1));

        MvcResult createResult = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("PENDING_APPROVAL")))
                .andReturn();

        JsonNode createdTrip = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String tripId = createdTrip.get("id").asText();
        assertNotNull(tripId);

        // Step 2: Supervisor sees and approves the trip
        Map<String, String> approveBody = Map.of(
                "status", "APPROVED",
                "supervisorId", "SUP001",
                "reason", "Approved for transport transit"
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(approveBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")));

        // Step 3: Trip starts (moves to IN_PROGRESS)
        Map<String, String> startBody = Map.of("status", "IN_PROGRESS");
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/status")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(startBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));

        // Step 4: Trip completes (all containers discharged)
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    @DisplayName("Driver identifier resolution should correctly resolve driver code, username, and UUID")
    void testDriverIdentifierResolution() {
        UUID uuidByCode = tripService.resolveDriverUuid("DRV-00001");
        assertNotNull(uuidByCode, "Driver code DRV-00001 should resolve to a valid UUID");

        UUID uuidDirect = tripService.resolveDriverUuid(uuidByCode.toString());
        assertEquals(uuidByCode, uuidDirect, "Resolving an existing UUID string should return the identical UUID");

        // When "ALL" or null is passed, TripService provides a graceful fallback to the first active driver
        UUID fallbackUuid = tripService.resolveDriverUuid("ALL");
        assertNotNull(fallbackUuid, "Identifier 'ALL' should gracefully resolve to a driver in repository");
        assertNotNull(tripService.resolveDriverUuid(null), "Null identifier should gracefully resolve to fallback driver");
    }
}

