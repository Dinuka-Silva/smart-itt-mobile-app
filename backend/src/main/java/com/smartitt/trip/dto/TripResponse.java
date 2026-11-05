package com.smartitt.trip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripResponse {
    private String id;
    private String tripNumber;
    private String driverId;
    private String driverName;
    private String vehicleNumber;
    private String vesselName;
    private String chassisNumber;
    private String sourceTerminal;
    private String destTerminal;
    private String status;
    private String notes;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationMinutes;
    private String dischargeBay;
    private String sealStatus;
    private String damageStatus;
    private String driverCompletionNotes;
    private String supervisorId;
    private String supervisorName;
    private LocalDateTime confirmedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private List<ContainerResponse> containers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContainerResponse {
        private String id;
        private String containerNumber;
        private String size;       // "20FT" or "40FT"
        private String sourceTerminal;
        private String destTerminal;
        private String status;
        private String unloadedAt;
        private Boolean isVerified;
        private String verifiedBy;
        private LocalDateTime verifiedAt;
        private String photoId;
        private String photoStatus;
        private String photoUrl;
    }
}
