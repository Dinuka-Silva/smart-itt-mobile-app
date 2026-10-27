package com.smartitt.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForgotPasswordVerifyRequest {

    @NotBlank(message = "Username or Operator Code is required")
    private String username;

    @NotBlank(message = "Registration ID / NIC Number is required")
    private String idNumber;
}
