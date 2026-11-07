package com.smartitt.trip;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartitt.BaseIntegrationTest;
import com.smartitt.container.photo.entity.ContainerPhoto;
import com.smartitt.container.photo.repository.ContainerPhotoRepository;
import com.smartitt.trip.dto.CreateTripRequest;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.repository.TripRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Supervisor Two-Stage Verification and Confirmation Integration Tests")
class SupervisorVerificationTwoStageIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ContainerPhotoRepository containerPhotoRepository;

    private String createAndCompleteTrip(String driverToken, boolean withPhoto) throws Exception {
        // Step 1: Create trip
        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");
        req.setSourceTerminal("CICT");
        req.setDestTerminal("JCT");
        req.setVesselName("MV Colombo Express");
        req.setVehicleNumber("LY-6439");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("MSCU9912345");
        c1.setSize("40FT");
        c1.setIsVerified(false);
        req.setContainers(List.of(c1));

        MvcResult createResult = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String tripId = created.get("id").asText();
        assertNotNull(tripId);

        // Step 2: Driver completes trip
        Map<String, Object> completeBody = Map.of(
                "dischargeBay", "Bay 02, Crane 01",
                "sealStatus", "INTACT",
                "damageStatus", "NONE",
                "driverNotes", "Cargo delivered safely"
        );

        mockMvc.perform(patch("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(completeBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PENDING_SUPERVISOR_CONFIRMATION")));

        if (withPhoto) {
            // Attach a container photo record to simulate uploaded evidence
            ContainerPhoto photo = ContainerPhoto.builder()
                    .tripId(UUID.fromString(tripId))
                    .containerNumber("MSCU9912345")
                    .filePath("photos/seal_photo.jpg")
                    .contentType("image/jpeg")
                    .sizeBytes(1024L)
                    .sha256Hash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
                    .uploadedBy("DRV-00001")
                    .uploadedAt(LocalDateTime.now())
                    .verificationStatus("PENDING")
                    .deleted(false)
                    .build();
            containerPhotoRepository.save(photo);
        }

        return tripId;
    }

    @Test
    @DisplayName("1. Verification with invalid UUID format returns HTTP 400 Bad Request")
    void testVerificationInvalidTripUuid() throws Exception {
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        mockMvc.perform(post("/api/v1/trips/invalid-uuid-abc/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("2. Verification of nonexistent trip returns HTTP 404 Not Found")
    void testVerificationNonexistentTrip() throws Exception {
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");
        String nonexistentId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/v1/trips/" + nonexistentId + "/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("3. Verification before driver trip completion returns HTTP 400 Bad Request")
    void testVerificationBeforeDriverCompletion() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        // Create trip but DO NOT complete it (status is IN_PROGRESS)
        CreateTripRequest req = new CreateTripRequest();
        req.setDriverId("DRV-00001");
        req.setSourceTerminal("CICT");
        req.setDestTerminal("JCT");
        req.setVesselName("MV Colombo Express");
        req.setVehicleNumber("LY-6439");

        CreateTripRequest.ContainerInput c1 = new CreateTripRequest.ContainerInput();
        c1.setContainerNumber("CSQU8822331");
        c1.setSize("40FT");
        c1.setIsVerified(false);
        req.setContainers(List.of(c1));

        MvcResult createResult = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String tripId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        // Supervisor tries to verify before completion
        mockMvc.perform(post("/api/v1/trips/" + tripId + "/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("4. Verification without required container evidence returns HTTP 400 Bad Request")
    void testVerificationWithoutRequiredEvidence() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        // Complete trip without photos
        String tripId = createAndCompleteTrip(driverToken, false);

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("5. Unauthorized DRIVER role cannot access verification endpoint (HTTP 403 Forbidden)")
    void testUnauthorizedDriverCannotVerify() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String tripId = createAndCompleteTrip(driverToken, true);

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/verify")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Final confirmation is blocked if container evidence is NOT yet verified (HTTP 400)")
    void testConfirmationBlockedBeforeEvidenceVerification() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        String tripId = createAndCompleteTrip(driverToken, true);

        // Attempting to confirm before verifyEvidence
        Map<String, String> confirmBody = Map.of(
                "status", "SUPERVISOR_CONFIRMED",
                "supervisorId", "SUP001"
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(confirmBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("7. Complete Two-Stage Workflow: Stage A Verify Evidence -> Stage B Confirm Trip -> 409 Double Action Guard")
    void testCompleteTwoStageVerificationAndConfirmation() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supervisorToken = obtainToken("supervisor@smartitt.lk", "supervisor");

        String tripId = createAndCompleteTrip(driverToken, true);

        // STAGE A: Supervisor verifies container evidence
        mockMvc.perform(post("/api/v1/trips/" + tripId + "/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evidenceVerified", is(true)))
                .andExpect(jsonPath("$.status", is("PENDING_SUPERVISOR_CONFIRMATION")))
                .andExpect(jsonPath("$.verifiedBy", notNullValue()))
                .andExpect(jsonPath("$.verifiedAt", notNullValue()));

        // STAGE B: Supervisor performs final confirmation
        Map<String, String> confirmBody = Map.of(
                "status", "SUPERVISOR_CONFIRMED",
                "supervisorId", "SUP001"
        );

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(confirmBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUPERVISOR_CONFIRMED")))
                .andExpect(jsonPath("$.confirmedAt", notNullValue()));

        // Database persistence check
        Trip persisted = tripRepository.findById(UUID.fromString(tripId)).orElseThrow();
        assertTrue(persisted.getEvidenceVerified());
        assertNotNull(persisted.getConfirmedAt());
        assertNotNull(persisted.getVerifiedAt());

        // Double-action guard: subsequent verification or confirmation is rejected with HTTP 409 Conflict
        mockMvc.perform(post("/api/v1/trips/" + tripId + "/verify")
                        .headers(authHeader(supervisorToken)))
                .andExpect(status().isConflict());

        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supervisorToken))
                        .content(objectMapper.writeValueAsString(confirmBody)))
                .andExpect(status().isConflict());
    }
}
