package com.smartitt.vehicle.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleResponse {
    private UUID id;
    private String vehicleNumber; // LY number (e.g., "LY 5234")
    private String chassisNumber; // SCK number (e.g., "SCK 100")
    private String cheNumber;     // Alias for chassisNumber
    private String operator;      // SCK Logistics, SDR LINK, E3 Logistics
    private String trailerSize;   // 40FT standard ITT container chassis
    private String status;        // ACTIVE, MAINTENANCE, INACTIVE
    private UUID assignedDriverId;
}
