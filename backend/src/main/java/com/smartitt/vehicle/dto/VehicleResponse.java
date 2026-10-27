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
    private String operator;      // SCK Logistics, SDR LINK
    private String trailerSize;   // 40FT standard ITT container chassis
    private String status;        // ACTIVE, MAINTENANCE, INACTIVE, IN_TRANSIT
    private UUID assignedDriverId;
    private String driverCode;
    private String driverName;
    private String driverMobile;

    private java.time.LocalDate licenseIssuedDate;
    private java.time.LocalDate licenseExpiryDate;
    private Long daysUntilExpiry;
    private boolean renewalDue;
    private String licenseStatus; // VALID, RENEWAL_DUE, EXPIRED

    private String portPassNumber;
    private java.time.LocalDate portPassIssuedDate;
    private java.time.LocalDate portPassExpiryDate; // Vehicle Port Pass Renewal Date
    private Long portPassDaysUntilExpiry;
    private boolean portPassRenewalDue;
    private String portPassStatus; // VALID, RENEWAL_DUE, EXPIRED
}
