package com.smartitt.container.photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoUploadResponse {
    private String id;
    private String tripId;
    private String containerId;
    private String containerNumber;
    private String photoUrl;
    private Long sizeBytes;
    private String contentType;
    private String sha256Hash;
    private String uploadedBy;
    private LocalDateTime uploadedAt;
    private String verificationStatus;
    private String verifiedBy;
    private LocalDateTime verifiedAt;
    private String verificationNote;
}

