package com.smartitt.container.service;

import com.smartitt.container.dto.AddManualContainerRequest;
import com.smartitt.container.dto.ValidateContainerResponse;
import com.smartitt.container.entity.Container;
import com.smartitt.container.entity.ContainerSize;
import com.smartitt.container.entity.ContainerStatus;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.trip.service.TripService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContainerService {

    private final ContainerRepository containerRepository;
    private final TripRepository tripRepository;
    private final TripService tripService;

    public ValidateContainerResponse validateContainer(String containerNumber, String tripId) {
        String normalized = Iso6346Validator.normalize(containerNumber);

        if (normalized.isEmpty()) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .message("Container number cannot be empty")
                    .build();
        }

        boolean formatValid = Iso6346Validator.isValidFormat(normalized);
        int expectedCheckDigit = -1;
        int actualCheckDigit = -1;
        boolean checkDigitValid = false;

        if (formatValid) {
            expectedCheckDigit = Iso6346Validator.calculateCheckDigit(normalized);
            actualCheckDigit = Character.getNumericValue(normalized.charAt(10));
            checkDigitValid = (expectedCheckDigit == actualCheckDigit);
        }

        // STEP 1: Check if input contains symbols
        if (containerNumber != null && containerNumber.matches(".*[^a-zA-Z0-9].*")) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(false)
                    .checkDigitValid(false)
                    .duplicate(false)
                    .message("Symbols are not allowed. Please enter 7 numbers without symbols (e.g. MSCU7721892).")
                    .build();
        }

        // STEP 2: Check 4 uppercase letters followed by 7 numbers (Total 11 characters)
        if (!formatValid) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(false)
                    .checkDigitValid(false)
                    .duplicate(false)
                    .message("Invalid format: Container number must be 4 uppercase letters followed by 7 digits without symbols (e.g., MSCU1234567).")
                    .build();
        }

        // STEP 3: Check if it is correct according to ISO 6346 standard
        if (!checkDigitValid) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(true)
                    .checkDigitValid(false)
                    .expectedCheckDigit(expectedCheckDigit)
                    .actualCheckDigit(actualCheckDigit)
                    .duplicate(false)
                    .message("Format Valid (4 Letters + 7 Numbers). ISO 6346 Check Digit Mismatch: Expected " + expectedCheckDigit + ", but found " + actualCheckDigit + ".")
                    .build();
        }

        // STEP 4: Check duplicates in active trip or database
        UUID parsedTripId = null;
        if (tripId != null && !tripId.trim().isEmpty() && !tripId.equals("null") && !tripId.equals("undefined")) {
            try {
                parsedTripId = UUID.fromString(tripId.trim());
            } catch (Exception ignored) {}
        }

        if (parsedTripId != null && containerRepository.existsByContainerNumberAndTripId(normalized, parsedTripId)) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(true)
                    .checkDigitValid(true)
                    .expectedCheckDigit(expectedCheckDigit)
                    .actualCheckDigit(actualCheckDigit)
                    .duplicate(true)
                    .message("Duplicate: Container " + normalized + " is already added to this active trip.")
                    .build();
        }

        // Check if currently active on any other trip
        Optional<Container> existing = containerRepository.findFirstByContainerNumberOrderByCreatedAtDesc(normalized);
        if (existing.isPresent()) {
            Container c = existing.get();
            Trip t = c.getTrip();
            if (t != null && (t.getStatus() == TripStatus.IN_PROGRESS || t.getStatus() == TripStatus.DRAFT || t.getStatus() == TripStatus.PENDING_APPROVAL)) {
                return ValidateContainerResponse.builder()
                        .valid(false)
                        .normalizedNumber(normalized)
                        .isoFormatValid(true)
                        .checkDigitValid(true)
                        .expectedCheckDigit(expectedCheckDigit)
                        .actualCheckDigit(actualCheckDigit)
                        .duplicate(true)
                        .existingTripNumber(t.getTripNumber())
                        .existingTerminal(t.getSourceTerminal())
                        .existingStatus(c.getStatus().name())
                        .message("Duplicate: Container " + normalized + " is currently loaded on active Trip #" + t.getTripNumber() + " at " + t.getSourceTerminal() + ".")
                        .build();
            }
        }

        return ValidateContainerResponse.builder()
                .valid(true)
                .normalizedNumber(normalized)
                .isoFormatValid(true)
                .checkDigitValid(true)
                .expectedCheckDigit(expectedCheckDigit)
                .actualCheckDigit(actualCheckDigit)
                .duplicate(false)
                .message("Container " + normalized + " verified successfully (4 letters + 7 numbers without symbols).")
                .build();
    }

    @Transactional
    public TripResponse addManualContainer(AddManualContainerRequest req, String driverIdStr) {
        String normalized = Iso6346Validator.normalize(req.getContainerNumber());

        ValidateContainerResponse validation = validateContainer(normalized, req.getTripId());
        if (!validation.isValid()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, validation.getMessage());
        }

        Trip trip = null;
        if (req.getTripId() != null && !req.getTripId().trim().isEmpty() && !req.getTripId().equals("null") && !req.getTripId().equals("undefined")) {
            try {
                trip = tripRepository.findById(UUID.fromString(req.getTripId().trim())).orElse(null);
            } catch (Exception ignored) {}
        }

        UUID driverId = null;
        if (driverIdStr != null && !driverIdStr.trim().isEmpty()) {
            try { driverId = UUID.fromString(driverIdStr); } catch (Exception ignored) {}
        }

        // If no active trip specified, find or create one for this driver
        if (trip == null && driverId != null) {
            List<Trip> activeTrips = tripRepository.findActiveTripsByDriver(driverId);
            if (!activeTrips.isEmpty()) {
                trip = activeTrips.get(0);
            }
        }

        if (trip == null) {
            // Create a new DRAFT/IN_PROGRESS trip for this manual container
            String sourceTerm = req.getMainTerminal() != null ? req.getMainTerminal() : "CICT";
            String destTerm = req.getDestTerminal() != null ? req.getDestTerminal() : "JCT";
            String vessel = req.getVesselName() != null && !req.getVesselName().trim().isEmpty() ? req.getVesselName().trim() : "MV Colombo Express";

            trip = Trip.builder()
                    .tripNumber(String.format("ITT-%05d", tripRepository.count() + 1))
                    .driverId(driverId)
                    .vesselName(vessel)
                    .chassisNumber(req.getChaiNo() != null ? req.getChaiNo() : "CHAI-001")
                    .sourceTerminal(sourceTerm)
                    .destTerminal(destTerm)
                    .status(TripStatus.IN_PROGRESS)
                    .startTime(LocalDateTime.now())
                    .build();
            trip = tripRepository.save(trip);
        }

        ContainerSize size = (req.getSize() != null && req.getSize().toUpperCase().contains("20"))
                ? ContainerSize.FT_20
                : ContainerSize.FT_40;

        Container container = Container.builder()
                .containerNumber(normalized)
                .size(size)
                .trip(trip)
                .sourceTerminal(trip.getSourceTerminal())
                .destTerminal(req.getDestTerminal() != null ? req.getDestTerminal() : trip.getDestTerminal())
                .status(ContainerStatus.LOADED)
                .build();

        container = containerRepository.save(container);
        trip.getContainers().add(container);
        tripRepository.save(trip);

        log.info("Container {} successfully added to Trip {}", normalized, trip.getTripNumber());
        return tripService.mapToResponse(trip);
    }

    public List<Container> getAllContainers(String tripId, String status) {
        if (tripId != null && !tripId.trim().isEmpty()) {
            try {
                return containerRepository.findByTripId(UUID.fromString(tripId));
            } catch (Exception ignored) {}
        }
        if (status != null && !status.trim().isEmpty()) {
            try {
                return containerRepository.findByStatus(ContainerStatus.valueOf(status));
            } catch (Exception ignored) {}
        }
        return containerRepository.findAll();
    }
}
