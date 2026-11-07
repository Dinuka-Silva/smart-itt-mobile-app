package com.smartitt.trip.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

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
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String photoStatus,
            @RequestParam(required = false) Boolean unverifiedOnly) {
        return ResponseEntity.ok(tripService.getAllTrips(driverId, status, vehicleNumber, terminal, startDate, endDate,
                search, photoStatus, unverifiedOnly));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get trip by ID")
    public ResponseEntity<TripResponse> getTripById(@PathVariable String id) {
        return ResponseEntity.ok(tripService.getTripById(id));
    }

    /**
     * Approve or Reject a trip — called from supervisor screen
     * Frontend POST /trips/{id}/approve with { status: "APPROVED"|"REJECTED",
     * supervisorId, reason }
     */

    @PostMapping("/{id}/start")
    @Operation(summary = "Start a trip")
    public ResponseEntity<TripResponse> startTripPost(@PathVariable String id) {
        return ResponseEntity.ok(tripService.startTrip(id));
    }

    @PatchMapping("/{id}/start")
    @Operation(summary = "Start a trip")
    public ResponseEntity<TripResponse> startTripPatch(@PathVariable String id) {
        return ResponseEntity.ok(tripService.startTrip(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Complete trip with container discharge and submit for verification")
    public ResponseEntity<TripResponse> completeTripPost(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(tripService.completeTrip(id, body));
    }

    private String resolveRole(Authentication auth) {
        if (auth == null) return "SUPERVISOR";
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.contains("ADMIN") || a.contains("SUPERVISOR"))
                .findFirst()
                .map(a -> a.replace("ROLE_", ""))
                .orElse("SUPERVISOR");
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    @Operation(summary = "Verify a trip (Verify Evidence or Approve/Reject) - Supervisor or Admin")
    public ResponseEntity<TripResponse> verifyTrip(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String decision = null;
        String rejectReason = null;
        if (body != null) {
            decision = body.get("decision");
            if (decision == null) decision = body.get("action");
            if (decision == null) decision = body.get("status");
            if ("SUPERVISOR_CONFIRMED".equalsIgnoreCase(decision) || "CONFIRMED".equalsIgnoreCase(decision)) {
                decision = "APPROVE";
            } else if ("SUPERVISOR_REJECTED".equalsIgnoreCase(decision) || "REJECTED".equalsIgnoreCase(decision)) {
                decision = "REJECT";
            }
            rejectReason = body.get("rejectReason");
            if (rejectReason == null) rejectReason = body.get("reason");
        }
        String actor = auth != null ? auth.getName() : "SUPERVISOR";
        String actorRole = resolveRole(auth);
        return ResponseEntity.ok(tripService.verifyTrip(id, decision, actor, actorRole, rejectReason));
    }

    @PostMapping("/{id}/verify-evidence")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    @Operation(summary = "Explicitly verify container photo evidence - Supervisor or Admin")
    public ResponseEntity<TripResponse> verifyTripEvidence(
            @PathVariable String id,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : "SUPERVISOR";
        String actorRole = resolveRole(auth);
        return ResponseEntity.ok(tripService.verifyTripEvidence(id, actor, actorRole));
    }

    @PostMapping("/{id}/resubmit")
    @Operation(summary = "Driver edits and resubmits a rejected trip for verification")
    public ResponseEntity<TripResponse> resubmitTrip(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String actor = auth != null ? auth.getName() : null;
        return ResponseEntity.ok(tripService.resubmitTrip(id, body, actor));
    }

    @GetMapping("/pending-verification")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    @Operation(summary = "List trips pending verification with filtering - Supervisor and Admin")
    public ResponseEntity<List<TripResponse>> getPendingVerification(
            @RequestParam(required = false) String driverId,
            @RequestParam(required = false) String vehicleNumber,
            @RequestParam(required = false) String terminal,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(tripService.getPendingVerificationTrips(driverId, vehicleNumber, terminal, startDate, endDate, search));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPERVISOR', 'ADMIN')")
    @Operation(summary = "Approve and confirm trip completion or reject - Supervisor or Admin")
    public ResponseEntity<TripResponse> approveTripDecision(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String status = body != null ? body.get("status") : null;
        if (status == null && body != null) status = body.get("decision");
        String supervisorId = body != null ? body.get("supervisorId") : null;
        if (supervisorId == null && auth != null) supervisorId = auth.getName();
        String reason = body != null ? body.get("reason") : null;
        if (reason == null && body != null) reason = body.get("rejectReason");
        String actorRole = resolveRole(auth);

        if ("REJECTED".equalsIgnoreCase(status) || "SUPERVISOR_REJECTED".equalsIgnoreCase(status) || "REJECT".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(tripService.rejectTrip(id, supervisorId, actorRole, reason));
        }
        return ResponseEntity.ok(tripService.confirmTrip(id, supervisorId, actorRole));
    }

    /**
     * Submit a completed trip for approval — frontend can call this to move to
     * PENDING_APPROVAL
     */
    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a completed trip for supervisor approval")
    public ResponseEntity<TripResponse> submitForApproval(@PathVariable String id) {
        return ResponseEntity.ok(tripService.updateTripStatus(id, "PENDING_APPROVAL", null, null));
    }

    /**
     * Unload a container at a terminal
     * Frontend PATCH /trips/{tripId}/containers/{containerId}/unload with {
     * unloadedAt }
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
        return ResponseEntity.ok(tripService.completeTrip(id, body));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update trip status")
    public ResponseEntity<TripResponse> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(tripService.updateTripStatus(id, body.get("status"), null, null));
    }
}
