package com.smartitt.dashboard.controller;

import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.trip.service.TripService;
import com.smartitt.user.entity.AccountStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Driver and Supervisor dashboard statistics")
public class DashboardController {

    private final TripRepository tripRepository;
    private final DriverRepository driverRepository;
    private final ContainerRepository containerRepository;
    private final TripService tripService;

    @GetMapping
    @Operation(summary = "Get supervisor dashboard statistics")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        long inProgress = tripRepository.countByStatus(TripStatus.IN_PROGRESS);
        long completed = tripRepository.countByStatus(TripStatus.COMPLETED)
                + tripRepository.countByStatus(TripStatus.SUPERVISOR_CONFIRMED)
                + tripRepository.countByStatus(TripStatus.APPROVED);
        long pending = tripRepository.countByStatus(TripStatus.PENDING_APPROVAL)
                + tripRepository.countByStatus(TripStatus.PENDING_SUPERVISOR_CONFIRMATION);
        long approved = tripRepository.countByStatus(TripStatus.APPROVED)
                + tripRepository.countByStatus(TripStatus.SUPERVISOR_CONFIRMED);
        long rejected = tripRepository.countByStatus(TripStatus.REJECTED)
                + tripRepository.countByStatus(TripStatus.SUPERVISOR_REJECTED);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalTripsToday", tripRepository.countTodayTrips(startOfDay, endOfDay));
        stats.put("activeTrips", inProgress);
        stats.put("tripsPendingApproval", pending);
        stats.put("completedTripsToday", completed);
        stats.put("approvedTrips", approved);
        stats.put("rejectedTrips", rejected);
        stats.put("totalContainersTransportedToday", containerRepository.count());
        stats.put("registeredDrivers", driverRepository.count());
        stats.put("activeDrivers", driverRepository.findByStatus(AccountStatus.ACTIVE).size());

        // Terminal-wise stats for all 6 terminals
        Map<String, Long> terminalStats = new LinkedHashMap<>();
        for (String t : new String[]{"CICT", "CWIT", "ECT", "JCT", "UCT", "SAGT"}) {
            terminalStats.put(t, tripRepository.countBySourceTerminalToday(t, startOfDay, endOfDay));
        }
        stats.put("terminalWiseTrips", terminalStats);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/driver/{driverId}")
    @Operation(summary = "Get live driver dashboard statistics")
    public ResponseEntity<Map<String, Object>> getDriverDashboard(@PathVariable String driverId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        UUID dId = tripService.resolveDriverUuid(driverId);

        long activeTrips = 0;
        long completedToday = 0;
        long pendingApprovals = 0;
        long containersTransportedToday = 0;
        TripResponse activeTripResponse = null;

        if (dId != null) {
            activeTrips = tripRepository.countByDriverIdAndStatus(dId, TripStatus.IN_PROGRESS);
            completedToday = tripRepository.countCompletedTodayByDriver(dId, startOfDay, endOfDay);
            pendingApprovals = tripRepository.countByDriverIdAndStatus(dId, TripStatus.PENDING_APPROVAL)
                    + tripRepository.countByDriverIdAndStatus(dId, TripStatus.PENDING_SUPERVISOR_CONFIRMATION);

            List<Trip> activeList = tripRepository.findActiveTripsByDriver(dId);
            if (!activeList.isEmpty()) {
                activeTripResponse = tripService.mapToResponse(activeList.get(0));
                containersTransportedToday = activeList.get(0).getContainers().size();
            }
        }

        // Standard driver allowance: LKR 2,500 per approved/completed trip
        double approvedAllowance = completedToday * 2500.0;
        double pendingAllowance = pendingApprovals * 2500.0;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("activeTrips", activeTrips);
        stats.put("completedTripsToday", completedToday);
        stats.put("containersTransportedToday", containersTransportedToday);
        stats.put("tripsPendingApproval", pendingApprovals);
        stats.put("approvedAllowance", approvedAllowance);
        stats.put("pendingAllowance", pendingAllowance);
        stats.put("activeTrip", activeTripResponse);

        return ResponseEntity.ok(stats);
    }
}
