package com.smartitt.container;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Container ISO 6346 Validation & Duplicate Guard Integration Tests")
class ContainerValidationIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Valid ISO 6346 container number (CSQU3054383) should be verified with matching check digit")
    void testValidateValidIso6346Container() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/containers/validate")
                        .headers(authHeader(driverToken))
                        .param("containerNumber", "CSQU3054383"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)))
                .andExpect(jsonPath("$.isoFormatValid", is(true)))
                .andExpect(jsonPath("$.checkDigitValid", is(true)))
                .andExpect(jsonPath("$.expectedCheckDigit", is(3)))
                .andExpect(jsonPath("$.actualCheckDigit", is(3)))
                .andExpect(jsonPath("$.normalizedNumber", is("CSQU3054383")))
                .andExpect(jsonPath("$.duplicate", is(false)))
                .andExpect(jsonPath("$.verified", is(true)));
    }

    @Test
    @DisplayName("Invalid check digit (CSQU3054384) should fail check digit and return suggested corrected number")
    void testValidateInvalidCheckDigitWithSuggestion() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/containers/validate")
                        .headers(authHeader(driverToken))
                        .param("containerNumber", "CSQU3054384"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)))
                .andExpect(jsonPath("$.isoFormatValid", is(true)))
                .andExpect(jsonPath("$.checkDigitValid", is(false)))
                .andExpect(jsonPath("$.expectedCheckDigit", is(3)))
                .andExpect(jsonPath("$.actualCheckDigit", is(4)))
                .andExpect(jsonPath("$.suggestedNumber", is("CSQU3054383")))
                .andExpect(jsonPath("$.verified", is(false)));
    }

    @Test
    @DisplayName("Typo guard: Serial digits with letters 'O' or 'I' should be flagged with helpful guidance")
    void testValidateTypoGuardInDigits() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/containers/validate")
                        .headers(authHeader(driverToken))
                        .param("containerNumber", "CSQU3O54383")) // Letter O instead of 0
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)))
                .andExpect(jsonPath("$.typoWarning", containsString("0 / 1")));
    }

    @Test
    @DisplayName("Malformed container number with symbols should be rejected")
    void testValidateSymbolsRejected() throws Exception {
        String driverToken = obtainToken("DRV-00001", "driver");

        mockMvc.perform(get("/api/v1/containers/validate")
                        .headers(authHeader(driverToken))
                        .param("containerNumber", "CSQU#305-4383"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(false)))
                .andExpect(jsonPath("$.message", containsString("Symbols are not allowed")));
    }
}

