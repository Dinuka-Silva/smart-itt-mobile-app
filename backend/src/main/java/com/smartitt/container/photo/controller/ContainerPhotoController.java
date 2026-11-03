package com.smartitt.container.photo.controller;

import com.smartitt.container.photo.dto.PhotoUploadResponse;
import com.smartitt.container.photo.dto.PhotoVerifyRequest;
import com.smartitt.container.photo.dto.StorageStatsResponse;
import com.smartitt.container.photo.entity.ContainerPhoto;
import com.smartitt.container.photo.service.ContainerPhotoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/container-photos")
@RequiredArgsConstructor
@Tag(name = "Container Photos", description = "Server-side photo storage, verification, and retention for container verification")
public class ContainerPhotoController {

    private final ContainerPhotoService photoService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload container verification photo (JPEG/PNG, max 2MB, genuine signature verified)")
    public ResponseEntity<PhotoUploadResponse> uploadPhoto(
            @RequestParam("tripId") String tripId,
            @RequestParam(value = "containerId", required = false) String containerId,
            @RequestParam(value = "containerNumber", required = false) String containerNumber,
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "DRIVER";
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(photoService.uploadPhoto(tripId, containerId, containerNumber, file, actor));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get container verification photo by ID (Authenticated; Driver sees own trips only)")
    public ResponseEntity<Resource> getPhoto(
            @PathVariable String id,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : null;
        Resource resource = photoService.loadPhotoResource(id, actor);
        ContainerPhoto entity = photoService.getPhotoEntity(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(entity.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"container-" + id + ".jpg\"")
                .body(resource);
    }

    @GetMapping("/trip/{tripId}")
    @Operation(summary = "List all photos attached to a specific trip")
    public ResponseEntity<List<PhotoUploadResponse>> getPhotosByTrip(@PathVariable String tripId) {
        return ResponseEntity.ok(photoService.getPhotosByTrip(tripId));
    }

    @GetMapping("/trip/{tripId}/container/{containerNumber}")
    @Operation(summary = "Get the latest photo attached to a container on a trip")
    public ResponseEntity<PhotoUploadResponse> getPhotoByContainer(
            @PathVariable String tripId,
            @PathVariable String containerNumber
    ) {
        return photoService.getPhotoByContainer(tripId, containerNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/verify")
    @Operation(summary = "Verify or Reject a container photo (Supervisor or Admin)")
    public ResponseEntity<PhotoUploadResponse> verifyPhoto(
            @PathVariable String id,
            @RequestBody @Valid PhotoVerifyRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "SUPERVISOR";
        return ResponseEntity.ok(photoService.verifyPhoto(id, request, actor));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft-delete a photo record (Admin only)")
    public ResponseEntity<Void> softDeletePhoto(
            @PathVariable String id,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "ADMIN";
        photoService.softDeletePhoto(id, actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/storage/stats")
    @Operation(summary = "Get photo storage metrics and disk capacity (Admin)")
    public ResponseEntity<StorageStatsResponse> getStorageStats() {
        return ResponseEntity.ok(photoService.getStorageStats());
    }
}

