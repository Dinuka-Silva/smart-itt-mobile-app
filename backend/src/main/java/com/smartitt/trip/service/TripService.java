package com.smartitt.trip.service;

import com.smartitt.audit.service.AuditLogService;

import com.smartitt.container.entity.Container;
import com.smartitt.container.entity.ContainerSize;
import com.smartitt.container.entity.ContainerStatus;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.container.photo.entity.ContainerPhoto;
import com.smartitt.container.photo.repository.ContainerPhotoRepository;
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
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final ContainerRepository containerRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final ContainerPhotoRepository photoRepository;
    private final AuditLogService auditLogService;

    public UUID resolveDriverUuid(String driverIdStr) {
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
                            .orElseGet(() -> driverRepository.findAll().stream().findFirst().map(Driver::getId)
                                    .orElse(null)));
        }
    }

    @Transactional
    public TripResponse createTrip(CreateTripRequest req) {
        // Generate trip number
        String tripNumber = generateTripNumber();

        UUID driverUuid = resolveDriverUuid(req.getDriverId());

        // Validate chassis capacity: 1 trip can carry only 1x 40FT OR up to 2x 20FT
        // containers
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

        // Driver loads containers â†’ confirms trip â†’ waits for supervisor
        String vesselName = (req.getVesselName() != null && !req.getVesselName().isBlank())
                ? req.getVesselName().trim()
                : "MV Colombo Express";

        String vehicleNumber = req.getVehicleNumber();
        String chassisNumber = req.getChassisNumber();
        if ((vehicleNumber == null || vehicleNumber.isBlank()) && driverUuid != null) {
            vehicleNumber = driverRepository.findById(driverUuid).map(Driver::getVehicleNumber).orElse(null);
        }
        if ((chassisNumber == null || chassisNumber.isBlank()) && driverUuid != null) {
            chassisNumber = driverRepository.findById(driverUuid).map(Driver::getChassisNumber).orElse(null);
        }
        if (chassisNumber == null || chassisNumber.isBlank()) {
            chassisNumber = "SCK 100";
        }

        String sourceTerm = req.getSourceTerminal() != null && !req.getSourceTerminal().isBlank() ? req.getSourceTerminal().trim() : "CICT";
        String destTerm = req.getDestTerminal() != null && !req.getDestTerminal().isBlank() ? req.getDestTerminal().trim() : "JCT";

        TripStatus initialStatus = TripStatus.IN_PROGRESS;
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            try {
                initialStatus = TripStatus.valueOf(req.getStatus().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                initialStatus = TripStatus.IN_PROGRESS;
            }
        }

        Trip trip = Trip.builder()
                .tripNumber(tripNumber)
                .driverId(driverUuid)
                .vehicleNumber(vehicleNumber)
                .vesselName(vesselName)
                .chassisNumber(chassisNumber)
                .sourceTerminal(sourceTerm)
                .destTerminal(destTerm)
                .status(initialStatus)
                .notes(req.getNotes())
                .startTime(initialStatus == TripStatus.IN_PROGRESS ? LocalDateTime.now() : null)
                .build();

        List<Container> containerEntities = new java.util.ArrayList<>();
        if (req.getContainers() != null) {
            for (CreateTripRequest.ContainerInput ci : req.getContainers()) {
                ContainerSize size = (ci.getSize() != null && "20FT".equalsIgnoreCase(ci.getSize()))
                        ? ContainerSize.FT_20
                        : ContainerSize.FT_40;

                String cNum = ci.getContainerNumber() != null ? ci.getContainerNumber().toUpperCase().trim()
                        : "MSCU1234567";
                Boolean verified = ci.getIsVerified();
                if (verified == null) {
                    verified = com.smartitt.container.service.Iso6346Validator.isValidCheckDigit(cNum);
                }

                Container container = Container.builder()
                        .containerNumber(cNum)
                        .size(size)
                        .trip(trip)
                        .sourceTerminal(req.getSourceTerminal())
                        .destTerminal(ci.getDestTerminal() != null ? ci.getDestTerminal() : req.getDestTerminal())
                        .status(initialStatus == TripStatus.IN_PROGRESS ? ContainerStatus.IN_TRANSIT : ContainerStatus.LOADED)
                        .isVerified(verified)
                        .build();
                containerEntities.add(container);
            }
        }

        trip.setContainers(containerEntities);
        trip = tripRepository.save(trip);
        return mapToResponse(trip);
    }

    public static String normalizePlate(String plate) {
        if (plate == null)
            return "";
        return plate.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    public List<TripResponse> getAllTrips(String driverId, String status) {
        return getAllTrips(driverId, status, null, null, null, null, null, null, null);
    }

    public List<TripResponse> getAllTrips(String driverId, String status, String vehicleNumber, String terminal,
            String startDate, String endDate, String search) {
        return getAllTrips(driverId, status, vehicleNumber, terminal, startDate, endDate, search, null, null);
    }

    public List<TripResponse> getAllTrips(String driverId, String status, String vehicleNumber, String terminal, String startDate, String endDate, String search, String photoStatus, Boolean unverifiedOnly) {
        List<Trip> trips = tripRepository.findAllByOrderByCreatedAtDesc();

        if (driverId != null && !driverId.isBlank() && !"ALL".equalsIgnoreCase(driverId)) {
            UUID driverUuid = resolveDriverUuid(driverId);
            if (driverUuid != null) {
                trips = trips.stream().filter(t -> driverUuid.equals(t.getDriverId())).collect(Collectors.toList());
            } else {
                String dLower = driverId.trim().toLowerCase();
                trips = trips.stream().filter(t -> {
                    String dName = getDriverNameForTrip(t);
                    return dName != null && dName.toLowerCase().contains(dLower);
                }).collect(Collectors.toList());
            }
        }

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            String sUpper = status.trim().toUpperCase();
            trips = trips.stream().filter(t -> {
                if (t.getStatus() == null)
                    return false;
                String st = t.getStatus().name();
                if (st.equalsIgnoreCase(sUpper))
                    return true;
                if (("PENDING".equals(sUpper) || "PENDING_APPROVAL".equals(sUpper) || "PENDING_SUPERVISOR_CONFIRMATION".equals(sUpper))
                        && (st.equals("PENDING_APPROVAL") || st.equals("PENDING_SUPERVISOR_CONFIRMATION")))
                    return true;
                if (("APPROVED".equals(sUpper) || "SUPERVISOR_CONFIRMED".equals(sUpper) || "COMPLETED".equals(sUpper))
                        && (st.equals("APPROVED") || st.equals("SUPERVISOR_CONFIRMED") || st.equals("COMPLETED")))
                    return true;
                if (("REJECTED".equals(sUpper) || "SUPERVISOR_REJECTED".equals(sUpper))
                        && (st.equals("REJECTED") || st.equals("SUPERVISOR_REJECTED")))
                    return true;
                return false;
            }).collect(Collectors.toList());
        }

        if (vehicleNumber != null && !vehicleNumber.isBlank() && !"ALL".equalsIgnoreCase(vehicleNumber)) {
            String cleanVeh = normalizePlate(vehicleNumber);
            trips = trips.stream().filter(t -> {
                String tripVeh = normalizePlate(t.getVehicleNumber());
                return tripVeh.equals(cleanVeh) || tripVeh.contains(cleanVeh);
            })
                    .collect(Collectors.toList());
        }

        if (terminal != null && !terminal.isBlank() && !"ALL".equalsIgnoreCase(terminal)) {
            String termUpper = terminal.trim().toUpperCase();
            trips = trips.stream().filter(t -> termUpper.equalsIgnoreCase(t.getSourceTerminal()) ||
                    termUpper.equalsIgnoreCase(t.getDestTerminal()) ||
                    (t.getContainers() != null
                            && t.getContainers().stream()
                                    .anyMatch(c -> termUpper.equalsIgnoreCase(c.getSourceTerminal())
                                            || termUpper.equalsIgnoreCase(c.getDestTerminal()))))
                    .collect(Collectors.toList());
        }

        if (startDate != null && !startDate.isBlank()) {
            try {
                java.time.LocalDate sDate = java.time.LocalDate.parse(startDate);
                LocalDateTime start = sDate.atStartOfDay();
                trips = trips.stream().filter(t -> {
                    LocalDateTime tripTime = t.getStartTime() != null ? t.getStartTime() : t.getCreatedAt();
                    return tripTime != null && !tripTime.isBefore(start);
                }).collect(Collectors.toList());
            } catch (Exception ignored) {
            }
        }

        if (endDate != null && !endDate.isBlank()) {
            try {
                java.time.LocalDate eDate = java.time.LocalDate.parse(endDate);
                LocalDateTime end = eDate.plusDays(1).atStartOfDay();
                trips = trips.stream().filter(t -> {
                    LocalDateTime tripTime = t.getStartTime() != null ? t.getStartTime() : t.getCreatedAt();
                    return tripTime != null && tripTime.isBefore(end);
                }).collect(Collectors.toList());
            } catch (Exception ignored) {
            }
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            String qNorm = normalizePlate(search);
            trips = trips
                    .stream().filter(t -> (t.getTripNumber() != null && t.getTripNumber().toLowerCase().contains(q)) ||
                            (t.getVehicleNumber() != null && (t.getVehicleNumber().toLowerCase().contains(q)
                                    || (!qNorm.isEmpty() && normalizePlate(t.getVehicleNumber()).contains(qNorm))))
                            ||
                            (t.getVesselName() != null && t.getVesselName().toLowerCase().contains(q)) ||
                            (getDriverNameForTrip(t) != null && getDriverNameForTrip(t).toLowerCase().contains(q)) ||
                            (t.getContainers() != null && t.getContainers().stream()
                                    .anyMatch(c -> c.getContainerNumber() != null
                                            && c.getContainerNumber().toLowerCase().contains(q))))
                    .collect(Collectors.toList());
        }

        List<TripResponse> responses = trips.stream().map(this::mapToResponse).collect(Collectors.toList());

        if (Boolean.TRUE.equals(unverifiedOnly)) {
            responses = responses.stream().filter(t ->
                    t.getContainers() != null && t.getContainers().stream().anyMatch(c -> !Boolean.TRUE.equals(c.getIsVerified()))
            ).collect(Collectors.toList());
        }

        if (photoStatus != null && !photoStatus.isBlank() && !"ALL".equalsIgnoreCase(photoStatus)) {
            String pUpper = photoStatus.trim().toUpperCase();
            responses = responses.stream().filter(t -> {
                List<TripResponse.ContainerResponse> containers = t.getContainers() != null ? t.getContainers() : List.of();
                if ("VERIFIED".equals(pUpper)) {
                    return containers.stream().anyMatch(c -> "VERIFIED".equalsIgnoreCase(c.getPhotoStatus()) || Boolean.TRUE.equals(c.getIsVerified()));
                }
                if ("PENDING".equals(pUpper)) {
                    return containers.stream().anyMatch(c -> "PENDING".equalsIgnoreCase(c.getPhotoStatus()));
                }
                if ("REJECTED".equals(pUpper)) {
                    return containers.stream().anyMatch(c -> "REJECTED".equalsIgnoreCase(c.getPhotoStatus()));
                }
                if ("MISSING".equals(pUpper)) {
                    return containers.stream().anyMatch(c -> c.getPhotoUrl() == null && (c.getPhotoStatus() == null || "NONE".equalsIgnoreCase(c.getPhotoStatus())));
                }
                return true;
            }).collect(Collectors.toList());
        }

        return responses;
    }

    public TripResponse getTripById(String id) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));
        return mapToResponse(trip);
    }

    public UUID resolveSupervisorUuid(String supervisorIdStr) {
        if (supervisorIdStr == null || supervisorIdStr.isBlank()) return null;
        try {
            return UUID.fromString(supervisorIdStr);
        } catch (Exception e) {
            return userRepository.findByIdentifier(supervisorIdStr).map(User::getId).orElse(null);
        }
    }

    public String resolveSupervisorName(String supervisorIdStr) {
        if (supervisorIdStr == null || supervisorIdStr.isBlank()) return "Operations Supervisor";
        try {
            UUID id = UUID.fromString(supervisorIdStr);
            return userRepository.findById(id).map(User::getFullName)
                    .orElseGet(() -> userRepository.findByIdentifier(supervisorIdStr).map(User::getFullName)
                            .orElse(supervisorIdStr));
        } catch (Exception e) {
            return userRepository.findByIdentifier(supervisorIdStr).map(User::getFullName).orElse(supervisorIdStr);
        }
    }
    @Transactional
    public TripResponse startTrip(String id) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (trip.getStatus() == TripStatus.PENDING_SUPERVISOR_CONFIRMATION
                || trip.getStatus() == TripStatus.SUPERVISOR_CONFIRMED
                || trip.getStatus() == TripStatus.PENDING_APPROVAL
                || trip.getStatus() == TripStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip has already been completed and confirmed.");
        }

        trip.setStatus(TripStatus.IN_PROGRESS);
        if (trip.getStartTime() == null) {
            trip.setStartTime(LocalDateTime.now());
        }
        if (trip.getContainers() != null) {
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.IN_TRANSIT);
                containerRepository.save(c);
            });
        }
        return mapToResponse(tripRepository.save(trip));
    }


    @Transactional
    public TripResponse completeTrip(String id, java.util.Map<String, Object> body) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (trip.getStatus() == TripStatus.PENDING_SUPERVISOR_CONFIRMATION
                || trip.getStatus() == TripStatus.SUPERVISOR_CONFIRMED
                || trip.getStatus() == TripStatus.PENDING_APPROVAL
                || trip.getStatus() == TripStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip has already been submitted for supervisor confirmation and is locked.");
        }

        trip.setStatus(TripStatus.PENDING_SUPERVISOR_CONFIRMATION);
        trip.setEndTime(LocalDateTime.now());
        if (trip.getStartTime() != null) {
            trip.setDurationMinutes(Math.max(0L, java.time.Duration.between(trip.getStartTime(), trip.getEndTime()).toMinutes()));
        }

        if (body != null) {
            if (body.get("dischargeBay") != null) {
                trip.setDischargeBay(body.get("dischargeBay").toString());
            }
            if (body.get("sealStatus") != null) {
                trip.setSealStatus(body.get("sealStatus").toString());
            }
            if (body.get("damageStatus") != null) {
                trip.setDamageStatus(body.get("damageStatus").toString());
            }
            if (body.get("driverNotes") != null) {
                trip.setDriverCompletionNotes(body.get("driverNotes").toString());
            } else if (body.get("notes") != null) {
                trip.setDriverCompletionNotes(body.get("notes").toString());
            }
            if (body.get("dischargeTerminal") != null && !body.get("dischargeTerminal").toString().isBlank()) {
                trip.setDestTerminal(body.get("dischargeTerminal").toString().trim());
            }
        }

        // Discharge all containers on trip
        trip.getContainers().forEach(c -> {
            c.setStatus(ContainerStatus.DISCHARGED);
            if (c.getUnloadedAt() == null) {
                c.setUnloadedAt(LocalDateTime.now().toString());
            }
            containerRepository.save(c);
        });

        Trip saved = tripRepository.save(trip);
        try {
            auditLogService.logAction(
                    trip.getDriverId(),
                    "DRIVER",
                    "TRIP_SUBMITTED",
                    "TRIP",
                    trip.getId().toString(),
                    "Driver submitted trip " + trip.getTripNumber() + " for supervisor/admin verification",
                    "IN_PROGRESS",
                    "PENDING_VERIFICATION",
                    null
            );
        } catch (Exception ignored) {}
        return mapToResponse(saved);
    }

    @Transactional
    public TripResponse updateTripStatus(String id, String newStatus, String supervisorId, String reason) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        TripStatus status;
        try {
            status = TripStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + newStatus);
        }

        if (status == TripStatus.APPROVED || status == TripStatus.SUPERVISOR_CONFIRMED) {
            trip.setStatus(TripStatus.SUPERVISOR_CONFIRMED);
            trip.setConfirmedAt(LocalDateTime.now());
            if (supervisorId != null && !supervisorId.isBlank()) {
                trip.setSupervisorId(resolveSupervisorUuid(supervisorId));
                trip.setSupervisorName(resolveSupervisorName(supervisorId));
            }
            if (trip.getEndTime() == null) {
                trip.setEndTime(LocalDateTime.now());
            }
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.DISCHARGED);
                if (c.getUnloadedAt() == null) {
                    c.setUnloadedAt(LocalDateTime.now().toString());
                }
                containerRepository.save(c);
            });
        } else if (status == TripStatus.REJECTED || status == TripStatus.SUPERVISOR_REJECTED) {
            if (reason == null || reason.trim().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mandatory rejection reason is required to reject a trip");
            }
            trip.setStatus(TripStatus.SUPERVISOR_REJECTED);
            trip.setRejectionReason(reason.trim());
            trip.setConfirmedAt(LocalDateTime.now());
            if (supervisorId != null && !supervisorId.isBlank()) {
                trip.setSupervisorId(resolveSupervisorUuid(supervisorId));
                trip.setSupervisorName(resolveSupervisorName(supervisorId));
            }
            if (trip.getEndTime() == null) {
                trip.setEndTime(LocalDateTime.now());
            }
        } else if (status == TripStatus.IN_PROGRESS) {
            trip.setStatus(TripStatus.IN_PROGRESS);
            if (trip.getStartTime() == null) {
                trip.setStartTime(LocalDateTime.now());
            }
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.IN_TRANSIT);
                containerRepository.save(c);
            });
        } else if (status == TripStatus.PENDING_APPROVAL || status == TripStatus.PENDING_SUPERVISOR_CONFIRMATION) {
            trip.setStatus(TripStatus.PENDING_SUPERVISOR_CONFIRMATION);
            if (trip.getEndTime() == null) {
                trip.setEndTime(LocalDateTime.now());
            }
            trip.getContainers().forEach(c -> {
                c.setStatus(ContainerStatus.DISCHARGED);
                if (c.getUnloadedAt() == null) {
                    c.setUnloadedAt(LocalDateTime.now().toString());
                }
                containerRepository.save(c);
            });
        } else if (status == TripStatus.COMPLETED) {
            trip.setStatus(TripStatus.PENDING_SUPERVISOR_CONFIRMATION);
            if (trip.getEndTime() == null) {
                trip.setEndTime(LocalDateTime.now());
            }
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

        if (trip.getStartTime() != null && trip.getEndTime() != null) {
            trip.setDurationMinutes(
                    Math.max(0L, java.time.Duration.between(trip.getStartTime(), trip.getEndTime()).toMinutes()));
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
            if (trip.getStartTime() != null) {
                trip.setDurationMinutes(
                        Math.max(0L, java.time.Duration.between(trip.getStartTime(), trip.getEndTime()).toMinutes()));
            }
            tripRepository.save(trip);
        }

        trip = tripRepository.findById(trip.getId()).orElseThrow();
        return mapToResponse(trip);
    }

    private String generateTripNumber() {
        long count = tripRepository.count() + 1;
        return String.format("ITT-%05d", count);
    }

    public String getDriverNameForTrip(Trip trip) {
        if (trip == null || trip.getDriverId() == null)
            return null;
        return userRepository.findById(trip.getDriverId())
                .map(User::getFullName)
                .orElseGet(() -> driverRepository.findById(trip.getDriverId())
                        .map(Driver::getFullName)
                        .orElse(null));
    }

    private TripResponse.ContainerResponse mapContainerToResponse(Container c, UUID tripId) {
        String photoUrl = null;
        String photoId = null;
        String photoStatus = "NONE";
        if (photoRepository != null && tripId != null) {
            String cleanNum = c.getContainerNumber() != null ? c.getContainerNumber().trim().toUpperCase() : "";
            Optional<ContainerPhoto> photoOpt = photoRepository.findFirstByTripIdAndContainerNumberAndDeletedFalseOrderByUploadedAtDesc(
                    tripId, cleanNum);
            if (photoOpt.isPresent()) {
                ContainerPhoto p = photoOpt.get();
                if (p.getId() != null) {
                    photoId = p.getId().toString();
                    photoUrl = "/api/v1/container-photos/" + photoId;
                }
                photoStatus = p.getVerificationStatus() != null ? p.getVerificationStatus() : "PENDING";
            }
        }
        if ("NONE".equals(photoStatus) && Boolean.TRUE.equals(c.getIsVerified())) {
            photoStatus = "VERIFIED";
        }

        return TripResponse.ContainerResponse.builder()
                .id(c.getId() != null ? c.getId().toString() : null)
                .containerNumber(c.getContainerNumber())
                .size(c.getSize() == ContainerSize.FT_20 ? "20FT" : "40FT")
                .sourceTerminal(c.getSourceTerminal())
                .destTerminal(c.getDestTerminal())
                .status(c.getStatus() != null ? c.getStatus().name() : "LOADED")
                .unloadedAt(c.getUnloadedAt())
                .isVerified(c.getIsVerified() != null ? c.getIsVerified() : true)
                .verifiedBy(c.getVerifiedBy())
                .verifiedAt(c.getVerifiedAt())
                .photoId(photoId)
                .photoUrl(photoUrl)
                .thumbnailUrl(photoId != null ? "/api/v1/container-photos/" + photoId + "/thumbnail" : null)
                .photoStatus(photoStatus)
                .build();
    }

        private Long calculateTripDuration(Trip trip) {
        if (trip == null) return null;
        if (trip.getDurationMinutes() != null) {
            return trip.getDurationMinutes();
        }
        if (trip.getStartTime() != null && trip.getEndTime() != null) {
            return Math.max(0L, java.time.Duration.between(trip.getStartTime(), trip.getEndTime()).toMinutes());
        }
        return null;
    }

    public TripResponse mapToResponse(Trip trip) {
        List<TripResponse.ContainerResponse> containers = trip.getContainers() != null
                ? trip.getContainers().stream()
                        .map(c -> mapContainerToResponse(c, trip.getId()))
                        .collect(Collectors.toList())
                : java.util.Collections.emptyList();

        String driverName = getDriverNameForTrip(trip);
        Long tripDuration = calculateTripDuration(trip);

        return TripResponse.builder()
                .id(trip.getId() != null ? trip.getId().toString() : null)
                .tripNumber(trip.getTripNumber())
                .driverId(trip.getDriverId() != null ? trip.getDriverId().toString() : null)
                .driverName(driverName)
                .vehicleNumber(trip.getVehicleNumber())
                .vesselName(trip.getVesselName())
                .chassisNumber(trip.getChassisNumber())
                .sourceTerminal(trip.getSourceTerminal())
                .destTerminal(trip.getDestTerminal())
                .status(trip.getStatus() != null ? trip.getStatus().name() : "IN_PROGRESS")
                .notes(trip.getNotes())
                .startTime(trip.getStartTime())
                .endTime(trip.getEndTime())
                .durationMinutes(tripDuration)
                .dischargeBay(trip.getDischargeBay())
                .sealStatus(trip.getSealStatus())
                .damageStatus(trip.getDamageStatus())
                .driverCompletionNotes(trip.getDriverCompletionNotes())
                .supervisorId(trip.getSupervisorId() != null ? trip.getSupervisorId().toString() : null)
                .supervisorName(trip.getSupervisorName())
                .confirmedAt(trip.getConfirmedAt())
                .rejectionReason(trip.getRejectionReason())
                .rejectReason(trip.getRejectReason() != null ? trip.getRejectReason() : trip.getRejectionReason())
                .verifiedBy(trip.getVerifiedBy())
                .verifiedByRole(trip.getVerifiedByRole())
                .verifiedAt(trip.getVerifiedAt())
                .evidenceVerified(Boolean.TRUE.equals(trip.getEvidenceVerified()))
                .verificationStatus(trip.getStatus() == TripStatus.SUPERVISOR_CONFIRMED ? "CONFIRMED" :
                        trip.getStatus() == TripStatus.SUPERVISOR_REJECTED ? "REJECTED" :
                        Boolean.TRUE.equals(trip.getEvidenceVerified()) ? "EVIDENCE_VERIFIED" : "PENDING_VERIFICATION")
                .createdAt(trip.getCreatedAt())
                .containers(containers)
                .build();
    }

    private UUID parseTripUuid(String id) {
        if (id == null || id.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trip ID cannot be blank");
        }
        try {
            return UUID.fromString(id.trim());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid trip UUID format: " + id);
        }
    }

    public boolean isTripEvidenceVerified(Trip trip) {
        if (Boolean.TRUE.equals(trip.getEvidenceVerified())) {
            return true;
        }
        return trip.getContainers() != null && !trip.getContainers().isEmpty()
                && trip.getContainers().stream().allMatch(c -> Boolean.TRUE.equals(c.getIsVerified()));
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // TWO-STAGE SUPERVISOR WORKFLOW
    // Stage A: verifyTripEvidence (Verify container photos / seals)
    // Stage B: confirmTrip (Approve & Confirm completed trip)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Stage A: Verify container photo evidence.
     * Validates trip exists, driver has completed it, and required container evidence exists.
     * Records evidence verification permanently in the database without prematurely confirming the trip.
     */
    @Transactional
    public TripResponse verifyTripEvidence(String id, String reviewerId, String reviewerRole) {
        UUID tripUuid = parseTripUuid(id);
        Trip trip = tripRepository.findById(tripUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found with ID: " + id));

        TripStatus current = trip.getStatus();
        if (current == TripStatus.SUPERVISOR_CONFIRMED || current == TripStatus.CONFIRMED || current == TripStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been confirmed and completed.");
        }
        if (current == TripStatus.SUPERVISOR_REJECTED || current == TripStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been rejected.");
        }
        if (current != TripStatus.PENDING_SUPERVISOR_CONFIRMATION
                && current != TripStatus.PENDING_VERIFICATION
                && current != TripStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Evidence verification is only allowed for trips completed by the driver awaiting verification. Current status: " + current);
        }

        // Validate that required container evidence exists
        List<com.smartitt.container.entity.Container> containers = trip.getContainers();
        boolean hasContainerEvidence = containers != null && !containers.isEmpty() && containers.stream().anyMatch(c ->
                Boolean.TRUE.equals(c.getIsVerified())
        );

        boolean hasPhotoRecords = false;
        try {
            hasPhotoRecords = !photoRepository.findByTripIdAndDeletedFalseOrderByUploadedAtDesc(trip.getId()).isEmpty();
        } catch (Exception ignored) {}

        if (!hasContainerEvidence && !hasPhotoRecords) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot verify evidence: required container photo evidence has not been submitted by the driver.");
        }

        UUID reviewerUuid = resolveSupervisorUuid(reviewerId);
        String resolvedName = resolveSupervisorName(reviewerId);
        String roleStr = (reviewerRole != null && !reviewerRole.isBlank()) ? reviewerRole.trim().toUpperCase() : "SUPERVISOR";
        LocalDateTime now = LocalDateTime.now();

        trip.setEvidenceVerified(true);
        trip.setVerifiedBy(resolvedName);
        trip.setVerifiedByRole(roleStr);
        trip.setVerifiedAt(now);

        if (containers != null) {
            containers.forEach(c -> {
                c.setIsVerified(true);
                c.setVerifiedBy(resolvedName);
                c.setVerifiedAt(now);
                containerRepository.save(c);
            });
        }

        try {
            var photos = photoRepository.findByTripIdAndDeletedFalseOrderByUploadedAtDesc(trip.getId());
            photos.forEach(p -> {
                p.setVerificationStatus("VERIFIED");
                p.setVerifiedBy(resolvedName);
                p.setVerifiedAt(now);
                photoRepository.save(p);
            });
        } catch (Exception ignored) {}

        Trip saved = tripRepository.save(trip);

        try {
            auditLogService.logAction(
                    reviewerUuid,
                    roleStr,
                    "TRIP_EVIDENCE_VERIFIED",
                    "TRIP",
                    trip.getId().toString(),
                    "Container evidence verified for trip " + trip.getTripNumber() + " by " + roleStr + " (" + resolvedName + ")",
                    current.name(),
                    "EVIDENCE_VERIFIED",
                    null
            );
        } catch (Exception ignored) {}

        return mapToResponse(saved);
    }

    /**
     * Stage B: Approve and confirm trip completion.
     * Enforces that container evidence has been verified first.
     */
    @Transactional
    public TripResponse confirmTrip(String id, String reviewerId, String reviewerRole) {
        UUID tripUuid = parseTripUuid(id);
        Trip trip = tripRepository.findById(tripUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found with ID: " + id));

        TripStatus current = trip.getStatus();
        if (current == TripStatus.SUPERVISOR_CONFIRMED || current == TripStatus.CONFIRMED || current == TripStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been confirmed.");
        }
        if (current == TripStatus.SUPERVISOR_REJECTED || current == TripStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been rejected.");
        }
        if (current != TripStatus.PENDING_SUPERVISOR_CONFIRMATION
                && current != TripStatus.PENDING_VERIFICATION
                && current != TripStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Trip cannot be confirmed until driver completes it. Current status: " + current);
        }

        // CRITICAL: Stage 2 requires evidence to be verified first!
        if (!isTripEvidenceVerified(trip)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot confirm trip: container photo evidence must be verified before final approval.");
        }

        UUID reviewerUuid = resolveSupervisorUuid(reviewerId);
        String resolvedName = resolveSupervisorName(reviewerId);
        String roleStr = (reviewerRole != null && !reviewerRole.isBlank()) ? reviewerRole.trim().toUpperCase() : "SUPERVISOR";
        LocalDateTime now = LocalDateTime.now();

        trip.setStatus(TripStatus.SUPERVISOR_CONFIRMED);
        trip.setConfirmedAt(now);
        trip.setSupervisorId(reviewerUuid);
        trip.setSupervisorName(resolvedName);
        trip.setRejectionReason(null);
        trip.setRejectReason(null);
        if (trip.getEndTime() == null) trip.setEndTime(now);

        if (trip.getContainers() != null) {
            trip.getContainers().forEach(c -> {
                c.setStatus(com.smartitt.container.entity.ContainerStatus.DISCHARGED);
                c.setIsVerified(true);
                if (c.getVerifiedBy() == null) c.setVerifiedBy(resolvedName);
                if (c.getVerifiedAt() == null) c.setVerifiedAt(now);
                if (c.getUnloadedAt() == null) c.setUnloadedAt(now.toString());
                containerRepository.save(c);
            });
        }

        if (trip.getStartTime() != null && trip.getEndTime() != null) {
            trip.setDurationMinutes(
                    Math.max(0L, java.time.Duration.between(trip.getStartTime(), trip.getEndTime()).toMinutes()));
        }

        Trip saved = tripRepository.save(trip);

        try {
            auditLogService.logAction(
                    reviewerUuid,
                    roleStr,
                    "TRIP_APPROVED",
                    "TRIP",
                    trip.getId().toString(),
                    "Trip " + trip.getTripNumber() + " approved and confirmed by " + roleStr + " (" + resolvedName + ")",
                    "PENDING_VERIFICATION",
                    "CONFIRMED",
                    null
            );
        } catch (Exception ignored) {}

        return mapToResponse(saved);
    }

    /**
     * Reject trip with mandatory rejection reason.
     */
    @Transactional
    public TripResponse rejectTrip(String id, String reviewerId, String reviewerRole, String rejectReason) {
        UUID tripUuid = parseTripUuid(id);
        Trip trip = tripRepository.findById(tripUuid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found with ID: " + id));

        TripStatus current = trip.getStatus();
        if (current == TripStatus.SUPERVISOR_CONFIRMED || current == TripStatus.CONFIRMED || current == TripStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been confirmed and cannot be rejected.");
        }
        if (current == TripStatus.SUPERVISOR_REJECTED || current == TripStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Trip has already been rejected.");
        }

        if (rejectReason == null || rejectReason.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A mandatory rejection reason is required to reject a trip.");
        }

        UUID reviewerUuid = resolveSupervisorUuid(reviewerId);
        String resolvedName = resolveSupervisorName(reviewerId);
        String roleStr = (reviewerRole != null && !reviewerRole.isBlank()) ? reviewerRole.trim().toUpperCase() : "SUPERVISOR";
        LocalDateTime now = LocalDateTime.now();

        String cleanReason = rejectReason.trim();
        trip.setStatus(TripStatus.SUPERVISOR_REJECTED);
        trip.setRejectionReason(cleanReason);
        trip.setRejectReason(cleanReason);
        trip.setConfirmedAt(now);
        trip.setVerifiedBy(resolvedName);
        trip.setVerifiedByRole(roleStr);
        trip.setVerifiedAt(now);
        trip.setSupervisorId(reviewerUuid);
        trip.setSupervisorName(resolvedName);

        Trip saved = tripRepository.save(trip);

        try {
            auditLogService.logAction(
                    reviewerUuid,
                    roleStr,
                    "TRIP_REJECTED",
                    "TRIP",
                    trip.getId().toString(),
                    "Trip " + trip.getTripNumber() + " rejected by " + roleStr + " (" + resolvedName + "). Reason: " + cleanReason,
                    current.name(),
                    "REJECTED",
                    null
            );
        } catch (Exception ignored) {}

        return mapToResponse(saved);
    }

    /**
     * Unified verify dispatcher supporting Stage A (Verify Evidence), Stage B (Confirm Trip), or Reject.
     */
    @Transactional
    public TripResponse verifyTrip(String id, String actionOrDecision, String reviewerId, String reviewerRole, String rejectReason) {
        if ("APPROVE".equalsIgnoreCase(actionOrDecision) || "CONFIRM".equalsIgnoreCase(actionOrDecision) || "SUPERVISOR_CONFIRMED".equalsIgnoreCase(actionOrDecision)) {
            return confirmTrip(id, reviewerId, reviewerRole);
        } else if ("REJECT".equalsIgnoreCase(actionOrDecision) || "SUPERVISOR_REJECTED".equalsIgnoreCase(actionOrDecision)) {
            return rejectTrip(id, reviewerId, reviewerRole, rejectReason);
        } else {
            // Default action: Verify container evidence
            return verifyTripEvidence(id, reviewerId, reviewerRole);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RESUBMIT â€“ Driver corrects and resubmits a rejected trip
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        @Transactional
    public TripResponse resubmitTrip(String id, java.util.Map<String, Object> body, String actorUsername) {
        Trip trip = tripRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found"));

        if (trip.getStatus() != TripStatus.SUPERVISOR_REJECTED
                && trip.getStatus() != TripStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only REJECTED trips can be resubmitted. Current status: " + trip.getStatus());
        }

        String oldContainer = !trip.getContainers().isEmpty() ? trip.getContainers().get(0).getContainerNumber() : "-";

        // Update container number if supplied
        if (body != null && body.get("containerNumber") != null) {
            String newNum = body.get("containerNumber").toString().trim().toUpperCase();
            if (!newNum.isBlank() && !trip.getContainers().isEmpty()) {
                Container c = trip.getContainers().get(0);
                c.setContainerNumber(newNum);
                c.setIsVerified(com.smartitt.container.service.Iso6346Validator.isValidCheckDigit(newNum));
                containerRepository.save(c);
            }
        }

        // Update driver notes if supplied
        if (body != null && body.get("notes") != null) {
            trip.setDriverCompletionNotes(body.get("notes").toString());
        }

        // Reset status back to pending verification
        trip.setStatus(TripStatus.PENDING_SUPERVISOR_CONFIRMATION);
        trip.setRejectionReason(null);
        trip.setRejectReason(null);
        trip.setSupervisorId(null);
        trip.setSupervisorName(null);
        trip.setVerifiedBy(null);
        trip.setVerifiedByRole(null);
        trip.setVerifiedAt(null);
        trip.setConfirmedAt(null);
        trip.getContainers().forEach(c -> {
            c.setStatus(com.smartitt.container.entity.ContainerStatus.DISCHARGED);
            containerRepository.save(c);
        });

        Trip saved = tripRepository.save(trip);

        try {
            auditLogService.logAction(
                    trip.getDriverId(),
                    "DRIVER",
                    "TRIP_RESUBMITTED",
                    "TRIP",
                    trip.getId().toString(),
                    "Driver corrected and resubmitted trip " + trip.getTripNumber() + " for verification (Container: " + oldContainer + " -> " + (!trip.getContainers().isEmpty() ? trip.getContainers().get(0).getContainerNumber() : "-") + ")",
                    "REJECTED",
                    "PENDING_VERIFICATION",
                    null
            );
        } catch (Exception ignored) {}

        return mapToResponse(saved);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // GET PENDING VERIFICATION â€“ for supervisor/admin queue
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        public List<TripResponse> getPendingVerificationTrips(
            String driverId, String vehicleNumber, String terminal, String startDate, String endDate, String search) {
        List<TripResponse> all = getAllTrips(driverId, "PENDING_VERIFICATION", vehicleNumber, terminal, startDate, endDate, search, null, null);
        return all;
    }


    private String resolveVerificationStatus(Trip trip) {
        if (trip.getStatus() == null) return null;
        switch (trip.getStatus()) {
            case PENDING_SUPERVISOR_CONFIRMATION:
            case PENDING_VERIFICATION:
            case PENDING_APPROVAL:
                return "PENDING_VERIFICATION";
            case SUPERVISOR_CONFIRMED:
            case CONFIRMED:
            case APPROVED:
            case COMPLETED:
                return "CONFIRMED";
            case SUPERVISOR_REJECTED:
            case REJECTED:
                return "REJECTED";
            default:
                return null;
        }
    }

    private String resolveVerifiedByRole(Trip trip) {
        if (trip.getSupervisorName() == null) return null;
        if (trip.getSupervisorName().contains("[ADMIN]")) return "ADMIN";
        if (trip.getSupervisorName().contains("[SUPERVISOR]")) return "SUPERVISOR";
        return "SUPERVISOR"; // default
    }

}
