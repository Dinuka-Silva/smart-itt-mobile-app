package com.smartitt.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkImportResult {
    private int totalRows;
    private int importedCount;
    private int failedCount;

    @Builder.Default
    private List<RowError> errors = new ArrayList<>();

    @Builder.Default
    private List<ImportedCredential> credentials = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        private int rowNumber;
        private String field;
        private String value;
        private String errorReason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportedCredential {
        private String username;
        private String temporaryPassword;
        private String role;
        private String employeeId;
        private String fullName;
    }
}
