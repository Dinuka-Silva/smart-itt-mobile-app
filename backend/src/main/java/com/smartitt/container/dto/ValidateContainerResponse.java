package com.smartitt.container.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateContainerResponse {
    private boolean valid;
    private boolean isoFormatValid;
    private boolean checkDigitValid;
    private int expectedCheckDigit;
    private int actualCheckDigit;
    private boolean duplicate;
    private String message;
    private String normalizedNumber;
    private String suggestedNumber;
    private String typoWarning;
    private boolean isVerified;
    private String existingTripNumber;
    private String existingTerminal;
    private String existingStatus;
}
