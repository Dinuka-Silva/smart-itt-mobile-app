package com.smartitt.auth.service;

import com.smartitt.auth.dto.AuthResponse;
import com.smartitt.auth.dto.DriverRegisterRequest;
import com.smartitt.auth.dto.LoginRequest;
import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.driver.service.DriverCodeGeneratorService;
import com.smartitt.driver.service.DriverService;
import com.smartitt.security.JwtUtil;
import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.supervisor.repository.SupervisorRepository;
import com.smartitt.user.entity.AccountStatus;
import com.smartitt.user.entity.Role;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final SupervisorRepository supervisorRepository;
    private final DriverCodeGeneratorService driverCodeGeneratorService;
    private final DriverService driverService;
    private final com.smartitt.vehicle.repository.VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    private static final Pattern UPPER_CASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWER_CASE = Pattern.compile("[a-z]");
    private static final Pattern NUMBER = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL_CHAR = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]");

    @Transactional
    public AuthResponse registerDriver(DriverRegisterRequest req) {
        // 1. Validate required fields
        if (req.getFullName() == null || req.getFullName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full name is required");
        }
        if (req.getNic() == null || req.getNic().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NIC number is required");
        }
        if (req.getEmployeeId() == null || req.getEmployeeId().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee ID is required");
        }
        if (req.getMobileNumber() == null || req.getMobileNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number is required");
        }
        if (req.getAddress() == null || req.getAddress().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Address is required");
        }
        if (req.getDrivingLicenceNumber() == null || req.getDrivingLicenceNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Driving license number is required");
        }

        // 2. Resolve field uniqueness gracefully
        String nic = req.getNic().trim();
        if (userRepository.existsByNic(nic)) {
            nic = nic + "-" + (System.currentTimeMillis() % 10000);
        }

        String employeeId = req.getEmployeeId().trim();
        if (userRepository.existsByEmployeeId(employeeId)) {
            employeeId = employeeId + "-" + (System.currentTimeMillis() % 10000);
        }

        String mobileNumber = req.getMobileNumber().trim();
        if (userRepository.existsByMobileNumber(mobileNumber)) {
            mobileNumber = mobileNumber + (System.currentTimeMillis() % 1000);
        }

        String licenseNumber = req.getDrivingLicenceNumber().trim();
        if (driverRepository.existsByDrivingLicenceNumber(licenseNumber)) {
            licenseNumber = licenseNumber + "-" + (System.currentTimeMillis() % 10000);
        }

        // 3. Validate password
        String password = req.getPassword();
        if (password == null || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (req.getConfirmPassword() != null && !req.getConfirmPassword().isEmpty() && !password.equals(req.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        validatePasswordSecurity(password);

        // 4. Automatic Driver Code Generation (Format: DRV-00001, DRV-00002... guaranteed unique)
        String driverCode = driverCodeGeneratorService.generateNextDriverCode();
        log.info("Assigning automatically generated Driver Code: {} for driver {}", driverCode, req.getFullName());

        // 5. Build Driver Entity
        Driver driver = new Driver();
        driver.setDriverCode(driverCode);
        driver.setUsername(driverCode); // Driver Code IS the login username
        driver.setFullName(req.getFullName().trim());
        driver.setEmployeeId(employeeId);
        driver.setNic(nic);
        driver.setMobileNumber(mobileNumber);
        driver.setAddress(req.getAddress().trim());
        driver.setDrivingLicenceNumber(licenseNumber);
        driver.setLicenseExpiryDate(req.getLicenseExpiryDate());
        driver.setDateOfBirth(req.getDateOfBirth());
        driver.setEmergencyContactName(req.getEmergencyContactName() != null ? req.getEmergencyContactName().trim() : "Port Dispatch Operations");
        driver.setEmergencyContactNumber(req.getEmergencyContactNumber() != null ? req.getEmergencyContactNumber().trim() : "0112456789");
        driver.setProfilePhoto(req.getProfilePhoto());
        final String resolvedVehicle = req.getVehicleNumber() != null ? req.getVehicleNumber().trim().toUpperCase() : "LY 5234";
        driver.setVehicleNumber(resolvedVehicle);
        String matchedChassis = vehicleRepository.findByVehicleNumber(resolvedVehicle)
                .map(com.smartitt.vehicle.entity.Vehicle::getChassisNumber)
                .orElseGet(() -> vehicleRepository.findAll().stream()
                        .filter(v -> v.getVehicleNumber().replaceAll("\\s+", "").equalsIgnoreCase(resolvedVehicle.replaceAll("\\s+", "")))
                        .findFirst()
                        .map(com.smartitt.vehicle.entity.Vehicle::getChassisNumber)
                        .orElse("SCK 100"));
        driver.setChassisNumber(matchedChassis);

        // Email: use provided or format driverCode@smartitt.lk
        String resolvedEmail = (req.getEmail() != null && !req.getEmail().trim().isEmpty())
                ? req.getEmail().trim()
                : (driverCode.toLowerCase() + "@smartitt.lk");
        if (userRepository.existsByEmail(resolvedEmail)) {
            resolvedEmail = driverCode.toLowerCase() + "." + (System.currentTimeMillis() % 1000) + "@smartitt.lk";
        }
        driver.setEmail(resolvedEmail);

        // Store hashed password
        driver.setPassword(passwordEncoder.encode(password));
        driver.setRole(Role.DRIVER);
        driver.setStatus(AccountStatus.ACTIVE);

        driver = driverRepository.save(driver);
        log.info("Driver successfully registered with ID: {}, Code: {}", driver.getId(), driverCode);

        // 6. Generate JWT token
        String token = jwtUtil.generateAccessToken(driver);
        return buildResponse(driver, token);
    }

    public AuthResponse login(LoginRequest req) {
        String identifier = req.getUsername() != null ? req.getUsername().trim() : "";
        log.info("Attempting login for identifier: {}", identifier);

        // Try finding user by Driver Code, username, email, or employeeId
        User user = userRepository.findByIdentifier(identifier)
                .orElseGet(() -> driverRepository.findByDriverCodeOrUsernameOrEmail(identifier)
                        .map(d -> (User) d)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Driver Code or password")));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            log.warn("Password mismatch for identifier: {}", identifier);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Driver Code or password");
        }

        // Account Status Checks
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            log.warn("Login denied: User {} is SUSPENDED", identifier);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is SUSPENDED. Please contact port administration.");
        }
        if (user.getStatus() == AccountStatus.DEACTIVATED) {
            log.warn("Login denied: User {} is DEACTIVATED", identifier);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is DEACTIVATED.");
        }
        if (user.getStatus() == AccountStatus.REJECTED) {
            log.warn("Login denied: User {} was REJECTED", identifier);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account registration was rejected.");
        }
        if (user.getStatus() == AccountStatus.PENDING_APPROVAL) {
            log.warn("Login denied: User {} is PENDING_APPROVAL", identifier);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is awaiting supervisor approval.");
        }

        String token = jwtUtil.generateAccessToken(user);
        return buildResponse(user, token);
    }

    private void validatePasswordSecurity(String password) {
        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long.");
        }
    }

    private AuthResponse buildResponse(User user, String token) {
        String username = user.getUsername();
        String driverCode = null;
        DriverProfileResponse driverProfile = null;

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .id(user.getId().toString())
                .name(user.getFullName())
                .username(username)
                .role(user.getRole().name())
                .token(token)
                .status(user.getStatus() != null ? user.getStatus().name() : AccountStatus.ACTIVE.name())
                .employeeId(user.getEmployeeId());

        if (user instanceof Driver d) {
            driverCode = d.getDriverCode();
            driverProfile = driverService.mapToProfileResponse(d);
            builder.driverId(d.getId().toString())
                   .driverCode(driverCode)
                   .vehicleNumber(d.getVehicleNumber())
                   .driver(driverProfile);
        } else if (user instanceof Supervisor s) {
            builder.supervisorId(s.getId().toString());
        }

        return builder.build();
    }
}
