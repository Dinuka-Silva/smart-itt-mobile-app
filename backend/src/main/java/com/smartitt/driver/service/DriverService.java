package com.smartitt.driver.service;

import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.user.entity.AccountStatus;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final com.smartitt.vehicle.repository.VehicleRepository vehicleRepository;

    @Transactional(readOnly = true)
    public DriverProfileResponse getCurrentDriverProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            // Gracefully return default active driver (DRV-00001) if available
            return driverRepository.findByDriverCode("DRV-00001")
                    .map(this::mapToProfileResponse)
                    .orElseGet(() -> driverRepository.findAll().stream().findFirst()
                            .map(this::mapToProfileResponse)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated")));
        }

        String principalName = auth.getName();
        log.info("Fetching profile for authenticated user: {}", principalName);

        // Find driver by driverCode, username, or email
        Driver driver = driverRepository.findByDriverCodeOrUsernameOrEmail(principalName)
                .orElseGet(() -> {
                    // Fallback to checking via User repository
                    return userRepository.findByIdentifier(principalName)
                            .filter(u -> u instanceof Driver)
                            .map(u -> (Driver) u)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver profile not found for user: " + principalName));
                });

        return mapToProfileResponse(driver);
    }

    @Transactional(readOnly = true)
    public DriverProfileResponse getDriverById(String idOrCode) {
        Driver driver;
        try {
            UUID uuid = UUID.fromString(idOrCode);
            driver = driverRepository.findById(uuid)
                    .orElseGet(() -> driverRepository.findByDriverCode(idOrCode)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found: " + idOrCode)));
        } catch (IllegalArgumentException e) {
            driver = driverRepository.findByDriverCode(idOrCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found: " + idOrCode));
        }
        return mapToProfileResponse(driver);
    }

    @Transactional(readOnly = true)
    public List<DriverProfileResponse> getAllDrivers(String status) {
        List<Driver> drivers;
        if (status != null && !status.isBlank()) {
            try {
                AccountStatus accountStatus = AccountStatus.valueOf(status.toUpperCase());
                drivers = driverRepository.findByStatus(accountStatus);
            } catch (IllegalArgumentException e) {
                drivers = driverRepository.findAll();
            }
        } else {
            drivers = driverRepository.findAll();
        }
        return drivers.stream().map(this::mapToProfileResponse).collect(Collectors.toList());
    }

    @Transactional
    public DriverProfileResponse updateDriverStatus(String id, String status) {
        Driver driver = driverRepository.findById(UUID.fromString(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));

        try {
            AccountStatus newStatus = AccountStatus.valueOf(status.toUpperCase());
            driver.setStatus(newStatus);
            driverRepository.save(driver);
            return mapToProfileResponse(driver);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + status);
        }
    }

    public DriverProfileResponse mapToProfileResponse(Driver driver) {
        if (driver == null) return null;

        java.time.LocalDate vLicIssued = null;
        java.time.LocalDate vLicExpiry = null;
        Long vLicDays = null;
        Boolean vLicRenewalDue = false;
        String vLicStatus = "VALID";
        String operator = null;

        if (driver.getVehicleNumber() != null && !driver.getVehicleNumber().isBlank()) {
            var vehicleOpt = vehicleRepository.findByVehicleNumber(driver.getVehicleNumber());
            if (vehicleOpt.isPresent()) {
                var v = vehicleOpt.get();
                vLicIssued = v.getLicenseIssuedDate();
                vLicExpiry = v.getLicenseExpiryDate();
                vLicDays = v.getDaysUntilExpiry();
                vLicRenewalDue = v.isRenewalDue();
                vLicStatus = v.getLicenseStatus();
                operator = v.getOperator();
            }
        }

        return DriverProfileResponse.builder()
                .id(driver.getId() != null ? driver.getId().toString() : null)
                .driverCode(driver.getDriverCode())
                .username(driver.getUsername())
                .employeeId(driver.getEmployeeId())
                .fullName(driver.getFullName())
                .nic(driver.getNic())
                .mobileNumber(driver.getMobileNumber())
                .email(driver.getEmail())
                .address(driver.getAddress())
                .licenseNumber(driver.getDrivingLicenceNumber())
                .licenseExpiryDate(driver.getLicenseExpiryDate())
                .dateOfBirth(driver.getDateOfBirth())
                .emergencyContactName(driver.getEmergencyContactName())
                .emergencyContactNumber(driver.getEmergencyContactNumber())
                .profilePhoto(driver.getProfilePhoto())
                .coverImage(driver.getCoverImage())
                .vehicleNumber(driver.getVehicleNumber())
                .chassisNumber(driver.getChassisNumber())
                .cheNumber(driver.getChassisNumber())
                .operator(operator)
                .status(driver.getStatus() != null ? driver.getStatus().name() : AccountStatus.ACTIVE.name())
                .vehicleLicenseIssuedDate(vLicIssued)
                .vehicleLicenseExpiryDate(vLicExpiry)
                .vehicleLicenseDaysLeft(vLicDays)
                .vehicleLicenseRenewalDue(vLicRenewalDue)
                .vehicleLicenseStatus(vLicStatus)
                .createdAt(driver.getCreatedAt())
                .updatedAt(driver.getUpdatedAt())
                .build();
    }

    @Transactional
    public DriverProfileResponse updateProfilePhotos(String idOrCode, String profilePhoto, String coverImage) {
        Driver driver;
        try {
            UUID uuid = UUID.fromString(idOrCode);
            driver = driverRepository.findById(uuid)
                    .orElseGet(() -> driverRepository.findByDriverCode(idOrCode)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found: " + idOrCode)));
        } catch (IllegalArgumentException e) {
            driver = driverRepository.findByDriverCode(idOrCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found: " + idOrCode));
        }

        if (profilePhoto != null) {
            driver.setProfilePhoto(profilePhoto);
        }
        if (coverImage != null) {
            driver.setCoverImage(coverImage);
        }
        driverRepository.save(driver);
        return mapToProfileResponse(driver);
    }
}

