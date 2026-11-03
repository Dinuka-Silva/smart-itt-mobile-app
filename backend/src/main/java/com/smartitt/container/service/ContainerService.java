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

        // Typo guard check (letters O or I inside the 6-digit sequence)
        if (Iso6346Validator.hasTypoInDigits(containerNumber)) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(false)
                    .checkDigitValid(false)
                    .isVerified(false)
                    .typoWarning("Letter 'O' or 'I' found in numeric sequence. Use 0 / 1 instead.")
                    .message("Typo guard: Serial digits contain letters 'O' or 'I'. Please use 0 / 1 instead.")
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

        // Check if input contains invalid symbols
        if (containerNumber != null && containerNumber.matches(".*[^a-zA-Z0-9].*")) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(false)
                    .checkDigitValid(false)
                    .duplicate(false)
                    .message("Symbols are not allowed. Please enter 4 letters followed by 7 digits (e.g. MSCU7721892).")
                    .build();
        }

        // Check ISO format (3 owner letters + U/J/Z + 6 digits + 1 check digit)
        if (!formatValid) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .isoFormatValid(false)
                    .checkDigitValid(false)
                    .duplicate(false)
                    .message("Invalid format: Container number must be 3 owner letters + U/J/Z category letter + 7 digits (e.g., CSQU3054383).")
                    .build();
        }

        // Check check digit
        String suggestion = Iso6346Validator.suggestValidContainerNumber(normalized);
        if (!checkDigitValid) {
            return ValidateContainerResponse.builder()
                    .valid(false)
                    .normalizedNumber(normalized)
                    .suggestedNumber(suggestion)
                    .isoFormatValid(true)
                    .checkDigitValid(false)
                    .isVerified(false)
                    .expectedCheckDigit(expectedCheckDigit)
                    .actualCheckDigit(actualCheckDigit)
                    .duplicate(false)
                    .message("Check digit mismatch: expected " + expectedCheckDigit + ", but found " + actualCheckDigit +
                            (suggestion != null ? ". Did you mean " + suggestion + "?" : "") +
                            ". Driver may confirm and save as Unverified.")
                    .build();
        }

        // Check duplicates in active trip or database
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
                        .message("Duplicate warning: Container " + normalized + " is currently active on Trip #" + t.getTripNumber() + " at " + t.getSourceTerminal() + ".")
                        .build();
            }
        }

        return ValidateContainerResponse.builder()
                .valid(true)
                .normalizedNumber(normalized)
                .isoFormatValid(true)
                .checkDigitValid(true)
                .isVerified(true)
                .expectedCheckDigit(expectedCheckDigit)
                .actualCheckDigit(actualCheckDigit)
                .duplicate(false)
                .message("Container " + normalized + " verified successfully (ISO 6346 match).")
                .build();
    }

    @Transactional
    public Container markVerified(String id, String verifiedBy) {
        Container container = containerRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Container not found"));
        container.setIsVerified(true);
        container.setVerifiedBy(verifiedBy != null ? verifiedBy : "SUPERVISOR");
        container.setVerifiedAt(LocalDateTime.now());
        return containerRepository.save(container);
    }

    @Transactional
    public TripResponse addManualContainer(AddManualContainerRequest req, String driverIdStr) {
        String normalized = Iso6346Validator.normalize(req.getContainerNumber());

        ValidateContainerResponse validation = validateContainer(normalized, req.getTripId());
        // If not valid and not unverified confirmation
        if (!validation.isIsoFormatValid()) {
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

        if (trip == null && driverId != null) {
            List<Trip> activeTrips = tripRepository.findActiveTripsByDriver(driverId);
            if (!activeTrips.isEmpty()) {
                trip = activeTrips.get(0);
            }
        }

        if (trip == null) {
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

        boolean verified = validation.isCheckDigitValid();

        Container container = Container.builder()
                .containerNumber(normalized)
                .size(size)
                .trip(trip)
                .sourceTerminal(trip.getSourceTerminal())
                .destTerminal(req.getDestTerminal() != null ? req.getDestTerminal() : trip.getDestTerminal())
                .status(ContainerStatus.LOADED)
                .isVerified(verified)
                .build();

        container = containerRepository.save(container);
        trip.getContainers().add(container);
        tripRepository.save(trip);

        log.info("Container {} (verified: {}) successfully added to Trip {}", normalized, verified, trip.getTripNumber());
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
