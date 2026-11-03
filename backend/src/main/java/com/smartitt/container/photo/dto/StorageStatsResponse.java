package com.smartitt.container.photo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageStatsResponse {
    private long totalPhotos;
    private long totalSizeBytes;
    private double totalSizeGb;
    private long freeDiskSpaceBytes;
    private double freeDiskSpaceGb;
    private long totalDiskSpaceBytes;
    private double totalDiskSpaceGb;
    private double freeSpacePercentage;
    private boolean lowDiskSpaceWarning; // Amber warning when below 20%
    private String storageDirectory;
}
