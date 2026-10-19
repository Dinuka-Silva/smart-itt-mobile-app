package com.smartitt.auth.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisorRegisterRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "NIC number is required")
    private String nic;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Mobile number is required")
    private String mobileNumber;

    @NotBlank(message = "Email is required")
    private String email;

    // Optional: Supervisors oversee all port terminals across the SLPA network
    private String terminalCode;

    private String address;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String emergencyContactName;

    private String emergencyContactNumber;

    @NotBlank(message = "Password is required")
    private String password;

    private String confirmPassword;

    private String username;
}
