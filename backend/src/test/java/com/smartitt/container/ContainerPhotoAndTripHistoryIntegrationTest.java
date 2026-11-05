package com.smartitt.container;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;


import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Container Photo Permanent Storage, Query Token Auth & Trip History Integration Tests")
class ContainerPhotoAndTripHistoryIntegrationTest extends BaseIntegrationTest {

    // Valid JPEG bytes (FF D8 FF E0 ...)
    private static final byte[] VALID_JPEG_BYTES = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
            0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
    };

    @Test
    @DisplayName("Driver uploads container photo, then supervisor accesses it via ?token= query parameter and verifies evidence")
    void testUploadRetrieveWithQueryTokenAndVerifyEvidence() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supToken = obtainToken("SUP001", "supervisor");

        // 1. Create a trip with CSQU3054383
        String createPayload = """
            {
                "sourceTerminal": "JCT",
                "destTerminal": "CICT",
                "vehicleNumber": "LY-6439",
                "vesselName": "EVER GIVEN",
                "containers": [
                    {
                        "containerNumber": "CSQU3054383",
                        "size": "40FT",
                        "sourceTerminal": "JCT",
                        "destTerminal": "CICT"
                    }
                ]
            }
            """;

        String tripRes = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String tripId = extractJsonValue(tripRes, "id");

        // 2. Upload container photo
        MockMultipartFile file = new MockMultipartFile(
                "file", "container-CSQU3054383.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        String uploadRes = mockMvc.perform(multipart("/api/v1/container-photos/upload")
                        .file(file)
                        .param("tripId", tripId)
                        .param("containerNumber", "CSQU3054383")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.containerNumber", is("CSQU3054383")))
                .andExpect(jsonPath("$.verificationStatus", is("PENDING")))
                .andReturn().getResponse().getContentAsString();

        String photoId = extractJsonValue(uploadRes, "id");

        // 3. Retrieve photo using Query Token authentication (?token=...) without Authorization header (e.g. img tags)
        mockMvc.perform(get("/api/v1/container-photos/" + photoId)
                        .param("token", supToken)
                        .header("X-API-KEY", "smart-itt-mobile-key-v2-production"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().string("Content-Disposition", containsString("container-" + photoId)));

        // 4. Retrieve photo stream via /view/{id}?token=...
        mockMvc.perform(get("/api/v1/container-photos/view/" + photoId)
                        .param("token", supToken)
                        .header("X-API-KEY", "smart-itt-mobile-key-v2-production"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"));

        // 5. Supervisor verifies evidence
        String verifyPayload = """
            {
                "status": "VERIFIED",
                "note": "Container seals intact and container condition verified"
            }
            """;

        mockMvc.perform(patch("/api/v1/container-photos/" + photoId + "/verify")
                        .headers(authHeader(supToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(verifyPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus", is("VERIFIED")));

        // 6. Complete trip and verify confirmed trip retains photoId and photoUrl
        mockMvc.perform(post("/api/v1/trips/" + tripId + "/complete")
                        .headers(authHeader(driverToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dischargeBay\":\"Bay 04, Crane 02\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("PENDING_SUPERVISOR_CONFIRMATION")));

        // 7. Supervisor approves trip
        mockMvc.perform(post("/api/v1/trips/" + tripId + "/approve")
                        .headers(authHeader(supToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"SUPERVISOR_CONFIRMED\",\"supervisorId\":\"SUP001\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUPERVISOR_CONFIRMED")));

        // 8. Confirmed trip permanent inspection: containers still contain photoId and photoUrl
        mockMvc.perform(get("/api/v1/trips/" + tripId)
                        .headers(authHeader(supToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("SUPERVISOR_CONFIRMED")))
                .andExpect(jsonPath("$.containers[0].photoId", is(photoId)))
                .andExpect(jsonPath("$.containers[0].photoUrl", is("/api/v1/container-photos/" + photoId)))
                .andExpect(jsonPath("$.containers[0].photoStatus", is("VERIFIED")));
    }

    @Test
    @DisplayName("Supervisor rejection of photo requires mandatory rejection note")
    void testSupervisorRejectPhotoRequiresMandatoryNote() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");
        String supToken = obtainToken("SUP001", "supervisor");

        // Create trip
        String createPayload = """
            {
                "sourceTerminal": "ECT",
                "destTerminal": "JCT",
                "vehicleNumber": "LY-6439",
                "containers": [
                    {
                        "containerNumber": "MSCU1234567",
                        "size": "20FT"
                    }
                ]
            }
            """;

        String tripRes = mockMvc.perform(post("/api/v1/trips")
                        .headers(authHeader(driverToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String tripId = extractJsonValue(tripRes, "id");

        // Upload photo
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        String uploadRes = mockMvc.perform(multipart("/api/v1/container-photos/upload")
                        .file(file)
                        .param("tripId", tripId)
                        .param("containerNumber", "MSCU1234567")
                        .headers(authHeader(driverToken)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String photoId = extractJsonValue(uploadRes, "id");

        // Rejection without note should be rejected with 400 Bad Request
        mockMvc.perform(patch("/api/v1/container-photos/" + photoId + "/verify")
                        .headers(authHeader(supToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"REJECTED\",\"note\":\"\"}"))
                .andExpect(status().isBadRequest());

        // Rejection with note should succeed
        mockMvc.perform(patch("/api/v1/container-photos/" + photoId + "/verify")
                        .headers(authHeader(supToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"REJECTED\",\"note\":\"Blurry image, seal number illegible\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus", is("REJECTED")))
                .andExpect(jsonPath("$.verificationNote", is("Blurry image, seal number illegible")));
    }
}

