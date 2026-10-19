package com.smartitt.vehicle.controller;

import com.smartitt.vehicle.dto.VehicleResponse;
import com.smartitt.vehicle.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VehicleController {

    private final VehicleService vehicleService;

    @GetMapping
    public ResponseEntity<List<VehicleResponse>> getAllVehicles() {
        return ResponseEntity.ok(vehicleService.getAllVehicles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehicleResponse> getVehicleById(@PathVariable UUID id) {
        return vehicleService.getVehicleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-number/{vehicleNumber}")
    public ResponseEntity<VehicleResponse> getVehicleByNumber(@PathVariable String vehicleNumber) {
        return vehicleService.getVehicleByNumber(vehicleNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<VehicleResponse> updateVehicleStatus(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(vehicleService.updateVehicleStatus(id, status));
    }

    @PatchMapping("/by-number/{vehicleNumber}/status")
    public ResponseEntity<VehicleResponse> updateVehicleStatusByNumber(
            @PathVariable String vehicleNumber,
            @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(vehicleService.updateVehicleStatusByNumber(vehicleNumber, status));
    }

    @PatchMapping("/by-chassis/{chassisNumber}/status")
    public ResponseEntity<VehicleResponse> updateVehicleStatusByChassis(
            @PathVariable String chassisNumber,
            @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(vehicleService.updateVehicleStatusByChassis(chassisNumber, status));
    }

    @PutMapping("/{id}/license")
    public ResponseEntity<VehicleResponse> updateVehicleLicense(
            @PathVariable UUID id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        java.time.LocalDate issuedDate = null;
        if (body != null && body.containsKey("issuedDate") && body.get("issuedDate") != null && !body.get("issuedDate").isBlank()) {
            issuedDate = java.time.LocalDate.parse(body.get("issuedDate").trim());
        }
        return ResponseEntity.ok(vehicleService.updateVehicleLicense(id, issuedDate));
    }

    @PutMapping("/by-number/{vehicleNumber}/license")
    public ResponseEntity<VehicleResponse> updateVehicleLicenseByNumber(
            @PathVariable String vehicleNumber,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        java.time.LocalDate issuedDate = null;
        if (body != null && body.containsKey("issuedDate") && body.get("issuedDate") != null && !body.get("issuedDate").isBlank()) {
            issuedDate = java.time.LocalDate.parse(body.get("issuedDate").trim());
        }
        return ResponseEntity.ok(vehicleService.updateVehicleLicenseByNumber(vehicleNumber, issuedDate));
    }
}
