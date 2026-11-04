package com.smartitt.auth;

import com.smartitt.BaseIntegrationTest;
import com.smartitt.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Authentication Controller Integration Tests")
class AuthControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private JwtUtil jwtUtil;

    @Test
    @DisplayName("Driver online authentication should return HTTP 200, valid JWT, and DRIVER role")
    void testDriverOnlineLoginSuccess() throws Exception {
        Map<String, String> payload = Map.of(
                "username", "DRV-00001",
                "password", "driver"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.role", is("DRIVER")))
                .andExpect(jsonPath("$.driverCode", is("DRV-00001")))
                .andExpect(jsonPath("$.name", not(emptyOrNullString())))
                .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    @DisplayName("Supervisor online authentication should return HTTP 200, valid JWT, and SUPERVISOR role")
    void testSupervisorOnlineLoginSuccess() throws Exception {
        Map<String, String> payload = Map.of(
                "username", "supervisor@smartitt.lk",
                "password", "supervisor"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.role", is("SUPERVISOR")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    @DisplayName("Admin online authentication should return HTTP 200, valid JWT, and ADMIN role")
    void testAdminOnlineLoginSuccess() throws Exception {
        Map<String, String> payload = Map.of(
                "username", "ADMIN",
                "password", "Admin@123"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyOrNullString())))
                .andExpect(jsonPath("$.role", is("ADMIN")))
                .andExpect(jsonPath("$.username", is("ADMIN")));
    }

    @Test
    @DisplayName("Login with invalid password should return HTTP 401 Unauthorized")
    void testLoginInvalidPassword() throws Exception {
        Map<String, String> payload = Map.of(
                "username", "DRV-00001",
                "password", "WrongPassword999!"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", containsString("Invalid")));
    }

    @Test
    @DisplayName("Login with non-existent account should return HTTP 401 Unauthorized")
    void testLoginNonExistentUser() throws Exception {
        Map<String, String> payload = Map.of(
                "username", "UNKNOWN-OPERATOR-999",
                "password", "SomePassword123"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Issued JWT token should be cryptographically validated by JwtUtil")
    void testJwtTokenValidationAndClaims() throws Exception {
        String token = obtainToken("ADMIN", "Admin@123");
        assertNotNull(token);
        assertTrue(jwtUtil.validateToken(token));
        assertEquals("admin@smartitt.lk", jwtUtil.extractUsername(token));
    }
}

