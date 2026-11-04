package com.smartitt.exception;

import com.smartitt.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Global Exception Handler Unit & Integration Tests")
class GlobalExceptionHandlerIntegrationTest extends BaseIntegrationTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("IllegalArgumentException should return HTTP 400 Bad Request with standardized error structure")
    void testHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Chassis capacity exceeded for selected containers");
        ResponseEntity<Map<String, Object>> response = handler.handleIllegalArgument(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(400, response.getBody().get("status"));
        assertEquals("Chassis capacity exceeded for selected containers", response.getBody().get("message"));
        assertNotNull(response.getBody().get("timestamp"));
    }

    @Test
    @DisplayName("AccessDeniedException should return HTTP 403 Forbidden with standardized error structure")
    void testHandleAccessDenied() {
        AccessDeniedException ex = new AccessDeniedException("User role DRIVER is not authorized for administrator console");
        ResponseEntity<Map<String, Object>> response = handler.handleAccessDenied(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(403, response.getBody().get("status"));
        assertTrue(response.getBody().get("message").toString().contains("Access denied"));
        assertNotNull(response.getBody().get("timestamp"));
    }

    @Test
    @DisplayName("BadCredentialsException should return HTTP 401 Unauthorized with standardized error structure")
    void testHandleBadCredentials() {
        BadCredentialsException ex = new BadCredentialsException("Bad credentials");
        ResponseEntity<Map<String, Object>> response = handler.handleBadCredentials(ex);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(401, response.getBody().get("status"));
        assertEquals("Invalid username or password.", response.getBody().get("message"));
        assertNotNull(response.getBody().get("timestamp"));
    }
}

