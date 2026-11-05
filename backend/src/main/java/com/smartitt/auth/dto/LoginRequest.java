package com.smartitt.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String username; // frontend sends "username" field (could be email)

    @NotBlank
    private String password;
}
