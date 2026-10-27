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
                .portPassNumber(driver.getPortPassNumber())
                .portPassExpiryDate(driver.getPortPassExpiryDate())
                .portPassDaysLeft(driver.getPortPassDaysUntilExpiry())
                .portPassRenewalDue(driver.isPortPassRenewalDue())
                .portPassStatus(driver.getPortPassStatus())
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

    @Transactional
    public DriverProfileResponse updateDriverDetails(String idOrCode, java.util.Map<String, Object> body) {
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

        if (body.containsKey("fullName") && body.get("fullName") != null) {
            driver.setFullName(String.valueOf(body.get("fullName")));
        }
        if (body.containsKey("name") && body.get("name") != null) {
            driver.setFullName(String.valueOf(body.get("name")));
        }
        if (body.containsKey("mobileNumber") && body.get("mobileNumber") != null) {
            driver.setMobileNumber(String.valueOf(body.get("mobileNumber")));
        }
        if (body.containsKey("contact") && body.get("contact") != null) {
            driver.setMobileNumber(String.valueOf(body.get("contact")));
        }
        if (body.containsKey("email") && body.get("email") != null) {
            driver.setEmail(String.valueOf(body.get("email")));
        }
        if (body.containsKey("address") && body.get("address") != null) {
            driver.setAddress(String.valueOf(body.get("address")));
        }
        if (body.containsKey("nic") && body.get("nic") != null) {
            driver.setNic(String.valueOf(body.get("nic")));
        }
        if (body.containsKey("licenseNumber") && body.get("licenseNumber") != null) {
            driver.setDrivingLicenceNumber(String.valueOf(body.get("licenseNumber")));
        }
        if (body.containsKey("drivingLicenceNumber") && body.get("drivingLicenceNumber") != null) {
            driver.setDrivingLicenceNumber(String.valueOf(body.get("drivingLicenceNumber")));
        }
        if (body.containsKey("licenseExpiryDate") && body.get("licenseExpiryDate") != null) {
            try {
                driver.setLicenseExpiryDate(java.time.LocalDate.parse(String.valueOf(body.get("licenseExpiryDate"))));
            } catch (Exception ignored) {}
        }
        if (body.containsKey("dateOfBirth") && body.get("dateOfBirth") != null) {
            try {
                driver.setDateOfBirth(java.time.LocalDate.parse(String.valueOf(body.get("dateOfBirth"))));
            } catch (Exception ignored) {}
        }
        if (body.containsKey("emergencyContactName") && body.get("emergencyContactName") != null) {
            driver.setEmergencyContactName(String.valueOf(body.get("emergencyContactName")));
        }
        if (body.containsKey("emergencyContactNumber") && body.get("emergencyContactNumber") != null) {
            driver.setEmergencyContactNumber(String.valueOf(body.get("emergencyContactNumber")));
        }
        if (body.containsKey("vehicleNumber") && body.get("vehicleNumber") != null) {
            driver.setVehicleNumber(String.valueOf(body.get("vehicleNumber")));
        }
        if (body.containsKey("truckNumber") && body.get("truckNumber") != null) {
            driver.setVehicleNumber(String.valueOf(body.get("truckNumber")));
        }
        if (body.containsKey("chassisNumber") && body.get("chassisNumber") != null) {
            driver.setChassisNumber(String.valueOf(body.get("chassisNumber")));
        }
        if (body.containsKey("cheNumber") && body.get("cheNumber") != null) {
            driver.setChassisNumber(String.valueOf(body.get("cheNumber")));
        }

        driverRepository.save(driver);
        return mapToProfileResponse(driver);
    }
}

