package com.smartitt.auth.controller;

import com.smartitt.auth.dto.AuthResponse;
import com.smartitt.auth.dto.DriverRegisterRequest;
import com.smartitt.auth.dto.LoginRequest;
import com.smartitt.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, registration, and token management")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Login with email/username and password")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register/driver")
    @Operation(summary = "Register a new driver")
    public ResponseEntity<AuthResponse> registerDriver(@RequestBody @Valid DriverRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerDriver(request));
    }

    @PostMapping("/register/supervisor")
    @Operation(summary = "Register a new port terminal supervisor")
    public ResponseEntity<AuthResponse> registerSupervisor(@RequestBody @Valid com.smartitt.auth.dto.SupervisorRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerSupervisor(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout driver and mark vehicle as inactive")
    public ResponseEntity<Void> logout(@RequestBody(required = false) java.util.Map<String, String> body) {
        String identifier = body != null ? body.get("identifier") : null;
        if (identifier == null && body != null) {
            identifier = body.get("driverCode");
        }
        if (identifier == null && body != null) {
            identifier = body.get("username");
        }
        authService.logout(identifier);
        return ResponseEntity.ok().build();
    }
}
