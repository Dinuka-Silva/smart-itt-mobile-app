package com.smartitt.trip.controller;

import com.smartitt.trip.dto.CreateTripRequest;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.trip.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/trips")
@RequiredArgsConstructor
@Tag(name = "Trips", description = "ITT trip management APIs")
public class TripController {

    private final TripService tripService;

    @PostMapping
    @Operation(summary = "Create trip with loaded containers and submit for supervisor approval")
    public ResponseEntity<TripResponse> createTrip(@RequestBody CreateTripRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tripService.createTrip(request));
    }

    @GetMapping
    @Operation(summary = "Get all trips with comprehensive server-side filtering")
    public ResponseEntity<List<TripResponse>> getTrips(
            @RequestParam(required = false) String driverId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String vehicleNumber,
            @RequestParam(required = false) String terminal,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(tripService.getAllTrips(driverId, status, vehicleNumber, terminal, startDate, endDate, search));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get trip by ID")
    public ResponseEntity<TripResponse> getTripById(@PathVariable String id) {
        return ResponseEntity.ok(tripService.getTripById(id));
    }

    /**
     * Approve or Reject a trip — called from supervisor screen
     * Frontend POST /trips/{id}/approve with { status: "APPROVED"|"REJECTED", supervisorId, reason }
     */
    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve or reject a trip (supervisor)")
    public ResponseEntity<TripResponse> approveTripDecision(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        String supervisorId = body.get("supervisorId");
        String reason = body.get("reason");
        return ResponseEntity.ok(tripService.updateTripStatus(id, status, supervisorId, reason));
    }

    /**
     * Submit a completed trip for approval — frontend can call this to move to PENDING_APPROVAL
     */
    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a completed trip for supervisor approval")
    public ResponseEntity<TripResponse> submitForApproval(@PathVariable String id) {
        return ResponseEntity.ok(tripService.updateTripStatus(id, "PENDING_APPROVAL", null, null));
    }

    /**
     * Unload a container at a terminal
     * Frontend PATCH /trips/{tripId}/containers/{containerId}/unload with { unloadedAt }
     */
    @PatchMapping("/{tripId}/containers/{containerId}/unload")
    @Operation(summary = "Unload a container at a terminal")
    public ResponseEntity<TripResponse> unloadContainer(
            @PathVariable String tripId,
            @PathVariable String containerId,
            @RequestBody Map<String, String> body) {
        String unloadedAt = body.get("unloadedAt");
        return ResponseEntity.ok(tripService.unloadContainer(tripId, containerId, unloadedAt));
    }

    @GetMapping("/driver/{driverId}")
    @Operation(summary = "Get trips for a driver")
    public ResponseEntity<List<TripResponse>> getTripsByDriver(@PathVariable String driverId) {
        return ResponseEntity.ok(tripService.getAllTrips(driverId, null));
    }

    @PatchMapping("/{id}/complete")
    @Operation(summary = "Complete trip with container discharge")
    public ResponseEntity<TripResponse> completeTrip(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(tripService.updateTripStatus(id, "COMPLETED", null, null));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update trip status")
    public ResponseEntity<TripResponse> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(tripService.updateTripStatus(id, body.get("status"), null, null));
    }
}
