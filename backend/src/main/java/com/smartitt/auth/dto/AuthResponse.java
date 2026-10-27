package com.smartitt.auth.dto;

import com.smartitt.driver.dto.DriverProfileResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String id;
    private String name;
    private String username;
    private String role;
    private String token;
    private String refreshToken;
    private String driverId;
    private String driverCode;
    private String supervisorId;
    private String vehicleNumber;
    private String employeeId;
    private String status;
    private String supervisorPortPassExpiryDate;
    private DriverProfileResponse driver;
}
