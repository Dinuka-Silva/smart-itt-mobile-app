package com.smartitt.driver.controller;

import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.driver.service.DriverService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Drivers", description = "Driver registration, profile, and management APIs")
public class DriverController {

    private final DriverService driverService;

    @GetMapping({"/api/v1/drivers/me", "/api/drivers/me"})
    @Operation(summary = "Get currently authenticated driver profile")
    public ResponseEntity<DriverProfileResponse> getMyProfile() {
        return ResponseEntity.ok(driverService.getCurrentDriverProfile());
    }

    @GetMapping({"/api/v1/drivers", "/api/drivers"})
    @Operation(summary = "Get all drivers (filterable by status)")
    public ResponseEntity<List<DriverProfileResponse>> getAllDrivers(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(driverService.getAllDrivers(status));
    }

    @GetMapping({"/api/v1/drivers/{id}", "/api/drivers/{id}"})
    @Operation(summary = "Get driver by ID or Driver Code")
    public ResponseEntity<DriverProfileResponse> getDriverById(@PathVariable String id) {
        return ResponseEntity.ok(driverService.getDriverById(id));
    }

    @PatchMapping({"/api/v1/drivers/{id}/status", "/api/drivers/{id}/status"})
    @Operation(summary = "Update driver account status (ACTIVE, SUSPENDED, DEACTIVATED)")
    public ResponseEntity<DriverProfileResponse> updateDriverStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(driverService.updateDriverStatus(id, status));
    }

    @PatchMapping({"/api/v1/drivers/{id}/photos", "/api/drivers/{id}/photos"})
    @Operation(summary = "Update driver profile photo and background cover image")
    public ResponseEntity<DriverProfileResponse> updateDriverPhotos(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String profilePhoto = body.get("profilePhoto");
        String coverImage = body.get("coverImage");
        return ResponseEntity.ok(driverService.updateProfilePhotos(id, profilePhoto, coverImage));
    }

    @PutMapping({"/api/v1/drivers/{id}", "/api/drivers/{id}"})
    @PatchMapping({"/api/v1/drivers/{id}", "/api/drivers/{id}"})
    @Operation(summary = "Update driver details (personal, contact, license, vehicle)")
    public ResponseEntity<DriverProfileResponse> updateDriver(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(driverService.updateDriverDetails(id, body));
    }
}

