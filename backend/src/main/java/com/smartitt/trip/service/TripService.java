package com.smartitt.trip.service;

import com.smartitt.container.entity.Container;
import com.smartitt.container.entity.ContainerSize;
import com.smartitt.container.entity.ContainerStatus;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.trip.dto.CreateTripRequest;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final ContainerRepository containerRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;

    private UUID resolveDriverUuid(String driverIdStr) {
        if (driverIdStr == null || driverIdStr.isBlank() || "ALL".equalsIgnoreCase(driverIdStr)) {
            return driverRepository.findAll().stream().findFirst().map(Driver::getId).orElse(null);
        }
        try {
            return UUID.fromString(driverIdStr);
        } catch (IllegalArgumentException e) {
            return driverRepository.findByDriverCodeOrUsernameOrEmail(driverIdStr)
                    .map(Driver::getId)
                    .orElseGet(() -> userRepository.findByIdentifier(driverIdStr)
                            .map(User::getId)
                            .orElseGet(() -> driverRepository.findAll().stream().findFirst().map(Driver::getId).orElse(null)));
        }
    }

    @Transactional
    public TripResponse createTrip(CreateTripRequest req) {
        // Generate trip number
        String tripNumber = generateTripNumber();

        UUID driverUuid = resolveDriverUuid(req.getDriverId());

        // Validate chassis capacity: 1 trip can carry only 1x 40FT OR up to 2x 20FT containers
        if (req.getContainers() != null && !req.getContainers().isEmpty()) {
            long count20 = req.getContainers().stream()
                    .filter(c -> "20FT".equalsIgnoreCase(c.getSize()))
                    .count();
            long count40 = req.getContainers().stream()
                    .filter(c -> !"20FT".equalsIgnoreCase(c.getSize()))
                    .count();
            if (count40 > 1 || (count40 >= 1 && count20 > 0) || count20 > 2) {
                throw new IllegalArgumentException(
                        "Chassis capacity exceeded: A single trip can carry only 1 40FT container OR up to 2 20FT containers.");
            }
        }

        // Driver loads containers → confirms trip → waits for supervisor
        Trip trip = Trip.builder()
                .tripNumber(tripNumber)
                .driverId(driverUuid)
                .vehicleNumber(req.getVehicleNumber())
                .vesselName(req.getVesselName())
                .chassisNumber(req.getChassisNumber())
                .sourceTerminal(req.getSourceTerminal())
                .destTerminal(req.getDestTerminal())
                .status(TripStatus.PENDING_APPROVAL)
                .notes(req.getNotes())
                .startTime(LocalDateTime.now())
                .build();

        List<Container> containerEntities = new java.util.ArrayList<>();
        if (req.getContainers() != null) {
            for (CreateTripRequest.ContainerInput ci : req.getContainers()) {
                ContainerSize size = (ci.getSize() != null && "20FT".equalsIgnoreCase(ci.getSize()))
                        ? ContainerSize.FT_20
                        : ContainerSize.FT_40;

                Container container = Container.builder()
                        .containerNumber(ci.getContainerNumber() != null ? ci.getContainerNumber().toUpperCase() : "MSCU1234567")
                        .size(size)
                        .trip(trip)
                        .sourceTerminal(req.getSourceTerminal())
                        .destTerminal(ci.getDestTerminal() != null ? ci.getDestTerminal() : req.getDestTerminal())
                        .status(ContainerStatus.LOADED)
                        .build();
                containerEntities.add(container);
            }
        }

        trip.setContainers(containerEntities);
        trip = tripRepository.save(trip);
        return mapToResponse(trip);
    }

    public List<TripResponse> getAllTrips(String driverId, String status) {
        List<Trip> trips;
        UUID driverUuid = resolveDriverUuid(driverId);

        if (driverUuid != null && status != null) {
            trips = tripRepository.findByDriverIdAndStatusOrderByCreatedAtDesc(
                    driverUuid, TripStatus.valueOf(status));
        } else if (driverUuid != null) {
            trips = tripRepository.findByDriverIdOrderByCreatedAtDesc(driverUuid);
        } else if (status != null) {
            trips = tripRepository.findByStatusOrderByCreatedAtDesc(TripStatus.valueOf(status));
        } else {
            trips = tripRepository.findAllByOrderByCreatedAtDesc();
        }

        return trips.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public TripResponse getTripById(String id) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse updateTripStatus(String id, String newStatus, String supervisorId, String reason) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        TripStatus status = TripStatus.valueOf(newStatus);

        if (status == TripStatus.APPROVED) {
            trip.setStatus(TripStatus.APPROVED);
        } else if (status == TripStatus.IN_PROGRESS) {
            trip.setStatus(TripStatus.IN_PROGRESS);
            if (trip.getStartTime() == null) {
                trip.setStartTime(LocalDateTime.now());
            }
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.IN_TRANSIT);
                containerRepository.save(c);
            });
        } else if (status == TripStatus.COMPLETED) {
            trip.setStatus(TripStatus.COMPLETED);
            trip.setEndTime(LocalDateTime.now());
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.DISCHARGED);
                if (c.getUnloadedAt() == null) {
                    c.setUnloadedAt(LocalDateTime.now().toString());
                }
                containerRepository.save(c);
            });
        } else {
            trip.setStatus(status);
        }

        if (status == TripStatus.REJECTED) {
            trip.setEndTime(LocalDateTime.now());
        }

        return mapToResponse(tripRepository.save(trip));
    }

    @Transactional
    public TripResponse unloadContainer(String tripId, String containerId, String unloadedAt) {
        Trip trip = tripRepository.findById(UUID.fromString(tripId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Trip must be approved (IN_PROGRESS) before unloading containers");
        }

        Container container = containerRepository.findById(UUID.fromString(containerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Container not found"));

        container.setStatus(ContainerStatus.DISCHARGED);
        container.setUnloadedAt(unloadedAt);
        containerRepository.save(container);

        // Check if all containers are discharged
        boolean allDischarged = trip.getContainers().stream()
                .allMatch(c -> c.getStatus() == ContainerStatus.DISCHARGED);

        if (allDischarged) {
            trip.setStatus(TripStatus.COMPLETED);
            trip.setEndTime(LocalDateTime.now());
            tripRepository.save(trip);
        }

        trip = tripRepository.findById(trip.getId()).orElseThrow();
        return mapToResponse(trip);
    }

    private String generateTripNumber() {
        long count = tripRepository.count() + 1;
        return String.format("ITT-%05d", count);
    }

    public TripResponse mapToResponse(Trip trip) {
        List<TripResponse.ContainerResponse> containers = trip.getContainers().stream()
                .map(c -> TripResponse.ContainerResponse.builder()
                        .id(c.getId().toString())
                        .containerNumber(c.getContainerNumber())
                        .size(c.getSize() == ContainerSize.FT_20 ? "20FT" : "40FT")
                        .sourceTerminal(c.getSourceTerminal())
                        .destTerminal(c.getDestTerminal())
                        .status(c.getStatus().name())
                        .unloadedAt(c.getUnloadedAt())
                        .build())
                .collect(Collectors.toList());

        String driverName = null;
        if (trip.getDriverId() != null) {
            driverName = userRepository.findById(trip.getDriverId())
                    .map(User::getFullName)
                    .orElseGet(() -> driverRepository.findById(trip.getDriverId())
                            .map(Driver::getFullName)
                            .orElse("Kamal Perera"));
        }

        return TripResponse.builder()
                .id(trip.getId().toString())
                .tripNumber(trip.getTripNumber())
                .driverId(trip.getDriverId() != null ? trip.getDriverId().toString() : null)
                .driverName(driverName)
                .vehicleNumber(trip.getVehicleNumber())
                .vesselName(trip.getVesselName())
                .chassisNumber(trip.getChassisNumber())
                .sourceTerminal(trip.getSourceTerminal())
                .destTerminal(trip.getDestTerminal())
                .status(trip.getStatus().name())
                .notes(trip.getNotes())
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .createdAt(trip.getCreatedAt())
                .containers(containers)
                .build();
    }
}
