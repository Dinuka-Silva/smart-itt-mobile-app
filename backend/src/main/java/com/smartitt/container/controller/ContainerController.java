package com.smartitt.container.controller;

import com.smartitt.container.dto.AddManualContainerRequest;
import com.smartitt.container.dto.ValidateContainerResponse;
import com.smartitt.container.entity.Container;
import com.smartitt.container.service.ContainerService;
import com.smartitt.trip.dto.TripResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/containers")
@RequiredArgsConstructor
@Tag(name = "Containers", description = "Manual container entry and ISO 6346 validation")
public class ContainerController {

    private final ContainerService containerService;

    @GetMapping("/validate")
    @Operation(summary = "Validate container number against ISO 6346 check digit and database duplicates")
    public ResponseEntity<ValidateContainerResponse> validateContainer(
            @RequestParam String containerNumber,
            @RequestParam(required = false) String tripId) {
        return ResponseEntity.ok(containerService.validateContainer(containerNumber, tripId));
    }

    @PatchMapping("/{id}/verify")
    @Operation(summary = "Mark an unverified container as verified (Supervisor/Admin)")
    public ResponseEntity<Container> verifyContainer(
            @PathVariable String id,
            @RequestParam(required = false) String verifiedBy,
            Authentication auth) {
        String actor = verifiedBy != null ? verifiedBy : (auth != null ? auth.getName() : "SUPERVISOR");
        return ResponseEntity.ok(containerService.markVerified(id, actor));
    }

    @PostMapping
    @Operation(summary = "Manually add a verified container to an active trip")
    public ResponseEntity<TripResponse> addManualContainer(
            @RequestBody @Valid AddManualContainerRequest request,
            Authentication auth) {
        String driverId = auth != null ? auth.getName() : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(containerService.addManualContainer(request, driverId));
    }

    @GetMapping
    @Operation(summary = "Get list of containers (filterable by tripId or status)")
    public ResponseEntity<List<Container>> getContainers(
            @RequestParam(required = false) String tripId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(containerService.getAllContainers(tripId, status));
    }
}
