package com.smartitt.driver.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverProfileResponse {
    private String id;
    private String driverCode;
    private String username;
    private String employeeId;
    private String fullName;
    private String nic;
    private String mobileNumber;
    private String email;
    private String address;
    private String licenseNumber;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate licenseExpiryDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String emergencyContactName;
    private String emergencyContactNumber;
    private String profilePhoto;
    private String coverImage;
    private String vehicleNumber;
    private String chassisNumber; // SCK number (CHE No)
    private String cheNumber;     // Alias for chassisNumber
    private String operator;      // Fleet Operator name
    private String status;

    // Assigned Vehicle Revenue License details (valid for 1 year from issued date)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate vehicleLicenseIssuedDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate vehicleLicenseExpiryDate;

    private Long vehicleLicenseDaysLeft;
    private Boolean vehicleLicenseRenewalDue;
    private String vehicleLicenseStatus;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
