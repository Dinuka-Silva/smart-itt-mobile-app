package com.smartitt.container.photo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoVerifyRequest {
    @NotBlank
    private String status; // VERIFIED or REJECTED
    private String note;   // Mandatory if REJECTED
}

