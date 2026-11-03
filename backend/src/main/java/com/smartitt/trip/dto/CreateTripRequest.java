package com.smartitt.trip.dto;

import lombok.Data;

import java.util.List;

@Data
public class CreateTripRequest {
    private String driverId;
    private String vehicleNumber;
    private String vesselName;
    private String chassisNumber;
    private String sourceTerminal;
    private String destTerminal;
    private String notes;
    private List<ContainerInput> containers;

    @Data
    public static class ContainerInput {
        private String containerNumber;
        private String size; // "20FT" or "40FT"
        private String destTerminal;
        private Boolean isVerified;
    }
}
