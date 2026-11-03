package com.smartitt.trip.dto;

import com.smartitt.container.entity.ContainerStatus;
import com.smartitt.trip.entity.TripStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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
    }
}
