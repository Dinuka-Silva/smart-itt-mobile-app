package com.smartitt.admin.controller;

import com.smartitt.admin.dto.AdminDashboardResponse;
import com.smartitt.admin.dto.BulkImportResult;
import com.smartitt.admin.service.AdminBulkImportService;
import com.smartitt.admin.service.AdminService;
import com.smartitt.audit.entity.AuditLog;
import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.vehicle.dto.VehicleResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@CrossOrigin(originPatterns = "*")
@Tag(name = "Admin", description = "Complete Admin Management APIs for Smart ITT System")
public class AdminController {

    private final AdminService adminService;
    private final AdminBulkImportService bulkImportService;

    // ─────────────────────────────────────────────────────────────
    // 1. DASHBOARD
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    @Operation(summary = "Get full Admin Dashboard KPIs and statistics")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DRIVERS
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/drivers")
    @Operation(summary = "Get all drivers with search and status filter")
    public ResponseEntity<List<DriverProfileResponse>> getDrivers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getAllDrivers(search, status));
    }

    @GetMapping("/drivers/{id}")
    @Operation(summary = "Get driver details by ID or Driver Code")
    public ResponseEntity<DriverProfileResponse> getDriverById(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getDriverById(id));
    }

    @PostMapping("/drivers")
    @Operation(summary = "Create a new driver account")
    public ResponseEntity<DriverProfileResponse> createDriver(@RequestBody Map<String, Object> req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createDriver(req));
    }

    @RequestMapping(value = "/drivers/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @Operation(summary = "Update driver details")
    public ResponseEntity<DriverProfileResponse> updateDriver(
            @PathVariable String id,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(adminService.updateDriver(id, req));
    }

    @PatchMapping("/drivers/{id}/status")
    @Operation(summary = "Update driver account status (ACTIVE, SUSPENDED, DEACTIVATED)")
    public ResponseEntity<DriverProfileResponse> updateDriverStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(adminService.updateDriverStatus(id, status, reason));
    }

    @PostMapping("/drivers/{id}/reset-password")
    @Operation(summary = "Reset driver password")
    public ResponseEntity<Map<String, String>> resetDriverPassword(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String newPassword = (body != null && body.containsKey("newPassword") && body.get("newPassword") != null && !body.get("newPassword").isBlank())
                ? body.get("newPassword")
                : null;
        String temporaryPassword = adminService.resetDriverPassword(id, newPassword);
        return ResponseEntity.ok(Map.of(
                "message", "Driver password reset successfully",
                "temporaryPassword", temporaryPassword
        ));
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SUPERVISORS
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/supervisors")
    @Operation(summary = "Get all supervisors with search and status filter")
    public ResponseEntity<List<Map<String, Object>>> getSupervisors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getAllSupervisors(search, status));
    }

    @GetMapping("/supervisors/{id}")
    @Operation(summary = "Get supervisor details by ID or Employee ID")
    public ResponseEntity<Map<String, Object>> getSupervisorById(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getSupervisorById(id));
    }

    @PostMapping("/supervisors")
    @Operation(summary = "Create a new supervisor account")
    public ResponseEntity<Map<String, Object>> createSupervisor(@RequestBody Map<String, Object> req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createSupervisor(req));
    }

    @RequestMapping(value = "/supervisors/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @Operation(summary = "Update supervisor details")
    public ResponseEntity<Map<String, Object>> updateSupervisor(
            @PathVariable String id,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(adminService.updateSupervisor(id, req));
    }

    @PatchMapping("/supervisors/{id}/status")
    @Operation(summary = "Update supervisor account status")
    public ResponseEntity<Map<String, Object>> updateSupervisorStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(adminService.updateSupervisorStatus(id, status, reason));
    }

    @PostMapping("/supervisors/{id}/reset-password")
    @Operation(summary = "Reset supervisor password")
    public ResponseEntity<Map<String, String>> resetSupervisorPassword(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String newPassword = (body != null && body.containsKey("newPassword") && body.get("newPassword") != null && !body.get("newPassword").isBlank())
                ? body.get("newPassword")
                : null;
        String temporaryPassword = adminService.resetSupervisorPassword(id, newPassword);
        return ResponseEntity.ok(Map.of(
                "message", "Supervisor password reset successfully",
                "temporaryPassword", temporaryPassword
        ));
    }

    // ─────────────────────────────────────────────────────────────
    // 4. VEHICLES & FLEET
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/vehicles")
    @Operation(summary = "Get all fleet vehicles with search, operator, and status filter")
    public ResponseEntity<List<VehicleResponse>> getVehicles(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(adminService.getAllVehicles(search, operator, status));
    }

    @PostMapping("/vehicles")
    @Operation(summary = "Add a new vehicle to fleet")
    public ResponseEntity<VehicleResponse> createVehicle(@RequestBody Map<String, Object> req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createVehicle(req));
    }

    @RequestMapping(value = "/vehicles/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @Operation(summary = "Update vehicle details, status, or driver assignment")
    public ResponseEntity<VehicleResponse> updateVehicle(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> req) {
        return ResponseEntity.ok(adminService.updateVehicle(id, req));
    }

    // ─────────────────────────────────────────────────────────────
    // 5. TRIPS & OPERATIONS
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/trips")
    @Operation(summary = "Get all ITT trips with comprehensive filtering")
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String terminal,
            @RequestParam(required = false) String vehicleNumber,
            @RequestParam(required = false) String driverId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(adminService.getAllTrips(search, status, terminal, vehicleNumber, driverId, startDate, endDate));
    }

    @GetMapping("/trips/{id}")
    @Operation(summary = "Get complete trip details")
    public ResponseEntity<TripResponse> getTripById(@PathVariable String id) {
        return ResponseEntity.ok(adminService.getTripById(id));
    }

    @PostMapping("/trips/{id}/action")
    @Operation(summary = "Admin direct action on a trip (approve, reject, return for correction)")
    public ResponseEntity<TripResponse> actionTrip(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String reason = body.get("reason");
        return ResponseEntity.ok(adminService.actionTrip(id, status, reason));
    }

    // ─────────────────────────────────────────────────────────────
    // 6. CONTAINERS
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/containers")
    @Operation(summary = "Search containers and inspect movement history")
    public ResponseEntity<List<Map<String, Object>>> searchContainers(
            @RequestParam(required = false) String containerNumber,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String terminal) {
        return ResponseEntity.ok(adminService.searchContainers(containerNumber, size, terminal));
    }

    // ─────────────────────────────────────────────────────────────
    // 7. AUDIT LOGS
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/audit-logs")
    @Operation(summary = "Get system audit logs")
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action) {
        return ResponseEntity.ok(adminService.getAuditLogs(page, size, entityType, action));
    }

    // ─────────────────────────────────────────────────────────────
    // 8. BULK IMPORT & TEMPLATES
    // ─────────────────────────────────────────────────────────────
    @PostMapping(value = "/drivers/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk import drivers from CSV or Excel file")
    public ResponseEntity<BulkImportResult> importDrivers(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkImportService.importDrivers(file));
    }

    @PostMapping(value = "/supervisors/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk import supervisors from CSV or Excel file")
    public ResponseEntity<BulkImportResult> importSupervisors(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkImportService.importSupervisors(file));
    }

    @PostMapping(value = "/vehicles/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Bulk import fleet vehicles from CSV or Excel file")
    public ResponseEntity<BulkImportResult> importVehicles(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkImportService.importVehicles(file));
    }

    @GetMapping("/import/templates/{type}")
    @Operation(summary = "Download sample CSV template for bulk import (drivers, supervisors, vehicles)")
    public ResponseEntity<byte[]> downloadTemplate(@PathVariable String type) {
        String csvContent = bulkImportService.getTemplateCsv(type);
        byte[] bytes = csvContent.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + type + "_template.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }
}
