package com.smartitt.admin.dto;

import com.smartitt.audit.entity.AuditLog;
import com.smartitt.trip.dto.TripResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    // Drivers
    private long totalDrivers;
    private long activeDrivers;
    private long suspendedDrivers;
    private long deactivatedDrivers;

    // Supervisors
    private long totalSupervisors;
    private long activeSupervisors;

    // Vehicles
    private long totalVehicles;
    private long activeVehicles;
    private long maintenanceVehicles;
    private long assignedVehicles;
    private long sckVehicles;
    private long sdrVehicles;

    // Trips
    private long todayTrips;
    private long tripsInProgress;
    private long tripsPendingApproval;
    private long tripsCompleted;
    private long tripsApproved;
    private long tripsRejected;
    private long totalTripsAllTime;

    // Containers
    private long totalContainers;
    private long twentyFtContainers;
    private long fortyFtContainers;

    // Terminals
    private Map<String, Long> terminalWiseTrips;

    // Recent items
    private List<TripResponse> recentTrips;
    private List<AuditLog> recentAuditLogs;
}
