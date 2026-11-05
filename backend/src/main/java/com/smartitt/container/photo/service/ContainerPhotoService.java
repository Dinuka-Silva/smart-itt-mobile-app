package com.smartitt.container.photo.service;

import com.smartitt.audit.service.AuditLogService;
import com.smartitt.container.entity.Container;
import com.smartitt.container.photo.dto.PhotoUploadResponse;
import com.smartitt.container.photo.dto.PhotoVerifyRequest;
import com.smartitt.container.photo.dto.StorageStatsResponse;
import com.smartitt.container.photo.entity.ContainerPhoto;
import com.smartitt.container.photo.repository.ContainerPhotoRepository;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.user.entity.Role;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContainerPhotoService {

    private final ContainerPhotoRepository photoRepository;
    private final ContainerRepository containerRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Value("${app.upload.dir:./uploads/photos}")
    private String uploadBaseDir;

    @Value("${app.photos.retention-months:0}")
    private int retentionMonths;

    @PostConstruct
    public void initStorageDirectory() {
        try {
            Path basePath = Paths.get(uploadBaseDir).toAbsolutePath().normalize();
            if (!Files.exists(basePath)) {
                Files.createDirectories(basePath);
                log.info("[PhotoService] Created upload directory at: {}", basePath);
            }
            if (!Files.isWritable(basePath)) {
                log.error("[PhotoService] CRITICAL: Upload directory is NOT writable: {}", basePath);
                throw new IllegalStateException("Storage directory is not writable: " + basePath);
            }
            log.info("[PhotoService] Storage initialized successfully at: {} (Retention: {} months, 0=forever)",
                    basePath, retentionMonths);
        } catch (Exception e) {
            log.error("[PhotoService] Failed to initialize storage directory: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to initialize photo storage directory", e);
        }
    }

    /**
     * Checks magic bytes to verify genuine JPEG or PNG image signature.
     */
    private boolean isValidImageSignature(byte[] header) {
        if (header == null || header.length < 4) return false;

        // JPEG magic bytes: FF D8 FF
        boolean isJpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
        if (isJpeg) return true;

        // PNG magic bytes: 89 50 4E 47
        boolean isPng = (header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
                (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47;
        return isPng;
    }

    @Transactional
    public PhotoUploadResponse uploadPhoto(
            String tripIdStr,
            String containerIdStr,
            String containerNumber,
            MultipartFile file,
            String actorUsername
    ) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File cannot be empty");
        }

        // Limit size: Max 2 MB (2 * 1024 * 1024 bytes)
        long maxBytes = 2 * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("File size exceeds 2 MB limit (uploaded size: %.2f MB)", file.getSize() / (1024.0 * 1024.0)));
        }

        // Validate real file signature (magic bytes)
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[8];
            int read = is.read(header);
            if (read < 4 || !isValidImageSignature(header)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid image signature. Only genuine JPEG and PNG image files are permitted.");
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read image header");
        }

        UUID tripUuid = UUID.fromString(tripIdStr);
        Trip trip = tripRepository.findById(tripUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found: " + tripIdStr));

        UUID containerUuid = null;
        if (containerIdStr != null && !containerIdStr.isBlank() && !containerIdStr.equals("null") && !containerIdStr.equals("undefined")) {
            try {
                containerUuid = UUID.fromString(containerIdStr);
            } catch (Exception ignored) {}
        }

        // Organize file path: <uploadBaseDir>/<year>/<month>/<random-uuid>.jpg
        LocalDate now = LocalDate.now();
        String yearStr = String.valueOf(now.getYear());
        String monthStr = String.format("%02d", now.getMonthValue());
        String fileUuid = UUID.randomUUID().toString();
        String ext = file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".png") ? ".png" : ".jpg";
        String storedFilename = fileUuid + ext;

        Path targetDir = Paths.get(uploadBaseDir, yearStr, monthStr).toAbsolutePath().normalize();
        Path targetFile = targetDir.resolve(storedFilename);

        String sha256;
        try {
            Files.createDirectories(targetDir);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            try (InputStream is = file.getInputStream()) {
                byte[] buffer = new byte[8192];
                int bytesCount;
                while ((bytesCount = is.read(buffer)) != -1) {
                    digest.update(buffer, 0, bytesCount);
                }
            }
            byte[] hashBytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            sha256 = sb.toString();

            // Save file to disk
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
            log.info("[PhotoService] Saved container photo to: {} (Size: {} bytes, SHA-256: {})",
                    targetFile, file.getSize(), sha256);
        } catch (Exception e) {
            log.error("[PhotoService] Failed to write image file to disk: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save photo to storage");
        }

        String contentType = ext.equals(".png") ? "image/png" : "image/jpeg";

        ContainerPhoto photo = ContainerPhoto.builder()
                .tripId(tripUuid)
                .containerId(containerUuid)
                .containerNumber(containerNumber != null ? containerNumber.trim().toUpperCase() : null)
                .filePath(targetFile.toString())
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .sha256Hash(sha256)
                .uploadedBy(actorUsername != null ? actorUsername : "DRIVER")
                .uploadedAt(LocalDateTime.now())
                .verificationStatus("PENDING")
                .deleted(false)
                .build();

        photo = photoRepository.save(photo);

        return mapToResponse(photo);
    }

    public Resource loadPhotoResource(String photoIdStr, String callerUsername) {
        UUID photoUuid = UUID.fromString(photoIdStr);
        ContainerPhoto photo = photoRepository.findById(photoUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo record not found"));

        if (Boolean.TRUE.equals(photo.getDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo has been removed");
        }

        // Access check: Drivers may only see photos of their own trips
        if (callerUsername != null) {
            Optional<User> userOpt = userRepository.findByIdentifier(callerUsername)
                    .or(() -> userRepository.findByEmail(callerUsername));
            if (userOpt.isPresent()) {
                User u = userOpt.get();
                if (u.getRole() == Role.DRIVER) {
                    Trip trip = tripRepository.findById(photo.getTripId()).orElse(null);
                    if (trip != null && trip.getDriverId() != null && !trip.getDriverId().equals(u.getId())) {
                        throw new AccessDeniedException("Access denied: You may only view photos for your own trips.");
                    }
                }
            }
        }

        Path filePath = Paths.get(photo.getFilePath());
        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            log.error("[PhotoService] File missing on disk at: {}", filePath);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo file missing on storage");
        }

        return new FileSystemResource(filePath.toFile());
    }

    public ContainerPhoto getPhotoEntity(String photoIdStr) {
        return photoRepository.findById(UUID.fromString(photoIdStr))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo record not found"));
    }

    public List<PhotoUploadResponse> getPhotosByTrip(String tripIdStr) {
        UUID tripUuid = UUID.fromString(tripIdStr);
        return photoRepository.findByTripIdAndDeletedFalseOrderByUploadedAtDesc(tripUuid)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public Optional<PhotoUploadResponse> getPhotoByContainer(String tripIdStr, String containerNumber) {
        UUID tripUuid = UUID.fromString(tripIdStr);
        String clean = containerNumber != null ? containerNumber.trim().toUpperCase() : "";
        return photoRepository.findFirstByTripIdAndContainerNumberAndDeletedFalseOrderByUploadedAtDesc(tripUuid, clean)
                .map(this::mapToResponse);
    }

    @Transactional
    public PhotoUploadResponse verifyPhoto(String photoIdStr, PhotoVerifyRequest req, String supervisorUsername) {
        UUID photoUuid = UUID.fromString(photoIdStr);
        ContainerPhoto photo = photoRepository.findById(photoUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        String status = req.getStatus() != null ? req.getStatus().trim().toUpperCase() : "VERIFIED";
        if (!"VERIFIED".equals(status) && !"REJECTED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be VERIFIED or REJECTED");
        }

        if ("REJECTED".equals(status) && (req.getNote() == null || req.getNote().trim().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection note is mandatory when rejecting a photo");
        }

        photo.setVerificationStatus(status);
        photo.setVerifiedBy(supervisorUsername != null ? supervisorUsername : "SUPERVISOR");
        photo.setVerifiedAt(LocalDateTime.now());
        photo.setVerificationNote(req.getNote() != null ? req.getNote().trim() : null);

        photo = photoRepository.save(photo);

        // If verified, also mark the associated container as verified
        if ("VERIFIED".equals(status) && photo.getContainerId() != null) {
            containerRepository.findById(photo.getContainerId()).ifPresent(c -> {
                c.setIsVerified(true);
                c.setVerifiedBy(supervisorUsername);
                c.setVerifiedAt(LocalDateTime.now());
                containerRepository.save(c);
            });
        }

        // Record in audit log
        auditLogService.log(
                getCurrentActorId(),
                "SUPERVISOR",
                "PHOTO_" + status,
                "CONTAINER_PHOTO",
                photo.getId().toString(),
                String.format("Container photo for %s on Trip %s marked %s by %s. Note: %s",
                        photo.getContainerNumber(), photo.getTripId(), status, supervisorUsername, req.getNote())
        );

        return mapToResponse(photo);
    }

    @Transactional
    public void softDeletePhoto(String photoIdStr, String adminUsername) {
        UUID photoUuid = UUID.fromString(photoIdStr);
        ContainerPhoto photo = photoRepository.findById(photoUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found"));

        photo.setDeleted(true);
        photo.setDeletedBy(adminUsername != null ? adminUsername : "ADMIN");
        photo.setDeletedAt(LocalDateTime.now());
        photoRepository.save(photo);

        auditLogService.log(
                getCurrentActorId(),
                "ADMIN",
                "PHOTO_SOFT_DELETED",
                "CONTAINER_PHOTO",
                photoIdStr,
                "Photo soft-deleted by admin: " + adminUsername
        );
    }

    private UUID getCurrentActorId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u.getId();
            }
        } catch (Exception ignored) {}
        return UUID.fromString("00000000-0000-0000-0000-000000000000");
    }

    public StorageStatsResponse getStorageStats() {
        long count = photoRepository.countByDeletedFalse();
        Long totalSizeBytes = photoRepository.sumSizeBytesWhereDeletedFalse();
        if (totalSizeBytes == null) totalSizeBytes = 0L;

        double totalSizeGb = totalSizeBytes / (1024.0 * 1024.0 * 1024.0);

        File storageDir = new File(uploadBaseDir).getAbsoluteFile();
        long freeDiskSpaceBytes = storageDir.getFreeSpace();
        long totalDiskSpaceBytes = storageDir.getTotalSpace();

        double freeDiskSpaceGb = freeDiskSpaceBytes / (1024.0 * 1024.0 * 1024.0);
        double totalDiskSpaceGb = totalDiskSpaceBytes / (1024.0 * 1024.0 * 1024.0);

        double freeSpacePercent = totalDiskSpaceBytes > 0
                ? (freeDiskSpaceBytes * 100.0) / totalDiskSpaceBytes
                : 100.0;

        boolean lowSpaceWarning = freeSpacePercent < 20.0;

        return StorageStatsResponse.builder()
                .totalPhotos(count)
                .totalSizeBytes(totalSizeBytes)
                .totalSizeGb(Math.round(totalSizeGb * 100.0) / 100.0)
                .freeDiskSpaceBytes(freeDiskSpaceBytes)
                .freeDiskSpaceGb(Math.round(freeDiskSpaceGb * 100.0) / 100.0)
                .totalDiskSpaceBytes(totalDiskSpaceBytes)
                .totalDiskSpaceGb(Math.round(totalDiskSpaceGb * 100.0) / 100.0)
                .freeSpacePercentage(Math.round(freeSpacePercent * 10.0) / 10.0)
                .lowDiskSpaceWarning(lowSpaceWarning)
                .storageDirectory(storageDir.getAbsolutePath())
                .build();
    }

    private PhotoUploadResponse mapToResponse(ContainerPhoto photo) {
        return PhotoUploadResponse.builder()
                .id(photo.getId().toString())
                .tripId(photo.getTripId().toString())
                .containerId(photo.getContainerId() != null ? photo.getContainerId().toString() : null)
                .containerNumber(photo.getContainerNumber())
                .photoUrl("/api/v1/container-photos/" + photo.getId())
                .sizeBytes(photo.getSizeBytes())
                .contentType(photo.getContentType())
                .sha256Hash(photo.getSha256Hash())
                .uploadedBy(photo.getUploadedBy())
                .uploadedAt(photo.getUploadedAt())
                .verificationStatus(photo.getVerificationStatus())
                .verifiedBy(photo.getVerifiedBy())
                .verifiedAt(photo.getVerifiedAt())
                .verificationNote(photo.getVerificationNote())
                .build();
    }
}
