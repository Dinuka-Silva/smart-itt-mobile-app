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
    @DisplayName("Driver Starts Immediately Without Supervisor -> Completes Trip -> Supervisor Confirms Workflow")
    void testEndToEndTripWorkflow() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        // Step 1: Driver creates trip — starts immediately as IN_PROGRESS without ANY supervisor blocker
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
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andReturn();

        JsonNode createdTrip = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String tripId = createdTrip.get("id").asText();
        assertNotNull(tripId);

        // Step 2: Driver completes trip with discharge manifest details -> enters PENDING_SUPERVISOR_CONFIRMATION
        Map<String, Object> completeBody = Map.of(
                "dischargeBay", "Bay 04, Crane 02",
                "sealStatus", "INTACT",
                "damageStatus", "NONE",
                "driverNotes", "Cargo discharged safely at destination berth"
        );

        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(completeBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PENDING_SUPERVISOR_CONFIRMATION")))
                .andExpect(jsonPath("$.dischargeBay", is("Bay 04, Crane 02")))
                .andExpect(jsonPath("$.sealStatus", is("INTACT")))
                .andExpect(jsonPath("$.endTime", notNullValue()));

        // Duplicate complete call is rejected / locked
        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(completeBody)))
                .andExpect(status().isBadRequest());

        // Step 3: Supervisor confirms completed trip -> transitions to SUPERVISOR_CONFIRMED
        Map<String, String> confirmBody = Map.of(
                "status", "SUPERVISOR_CONFIRMED",
                "supervisorId", "SUP001",
                "reason", "Discharge verified and confirmed"
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(confirmBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUPERVISOR_CONFIRMED")))
                .andExpect(jsonPath("$.confirmedAt", notNullValue()));
    }

    @Test
    @DisplayName("Supervisor Rejection Flow: Mandatory reason required and records SUPERVISOR_REJECTED")
    void testSupervisorRejectionWithReason() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        // Driver creates and completes trip
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
        req.setContainers(List.of(c1));

        MvcResult createResult = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String tripId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isOk());

        // Attempt rejection without reason -> 400 Bad Request
        Map<String, String> rejectWithoutReason = Map.of(
                "status", "SUPERVISOR_REJECTED",
                "supervisorId", "SUP001",
                "reason", ""
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(rejectWithoutReason)))
                .andExpect(status().isBadRequest());

        // Rejection with mandatory reason -> succeeds
        Map<String, String> rejectWithReason = Map.of(
                "status", "SUPERVISOR_REJECTED",
                "supervisorId", "SUP001",
                "reason", "Discharge bay mismatch. Container placed in staging area."
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(rejectWithReason)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUPERVISOR_REJECTED")))
                .andExpect(jsonPath("$.rejectionReason", containsString("Discharge bay mismatch")));
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

