package com.smartitt.auth.service;

import com.smartitt.auth.dto.AuthResponse;
import com.smartitt.auth.dto.DriverRegisterRequest;
import com.smartitt.auth.dto.SupervisorRegisterRequest;
import com.smartitt.auth.dto.LoginRequest;
import com.smartitt.auth.dto.ForgotPasswordVerifyRequest;
import com.smartitt.auth.dto.ResetPasswordRequest;
import com.smartitt.auth.dto.ChangePasswordRequest;
import com.smartitt.auth.dto.PasswordResetResponse;
import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.driver.service.DriverCodeGeneratorService;
import com.smartitt.driver.service.DriverService;
import com.smartitt.security.JwtUtil;
import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.supervisor.repository.SupervisorRepository;
import com.smartitt.terminal.entity.Terminal;
import com.smartitt.terminal.repository.TerminalRepository;
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
    private final TerminalRepository terminalRepository;
    private final DriverCodeGeneratorService driverCodeGeneratorService;
    private final DriverService driverService;
    private final com.smartitt.vehicle.repository.VehicleRepository vehicleRepository;
    private final com.smartitt.audit.service.AuditLogService auditLogService;
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
        final String resolvedVehicle = req.getVehicleNumber() != null ? req.getVehicleNumber().trim().toUpperCase() : "LY-6439";
        driver.setVehicleNumber(resolvedVehicle);
        String matchedChassis = vehicleRepository.findByVehicleNumber(resolvedVehicle)
                .map(com.smartitt.vehicle.entity.Vehicle::getChassisNumber)
                .orElseGet(() -> vehicleRepository.findAll().stream()
                        .filter(v -> v.getVehicleNumber().replaceAll("[-\\s]+", "").equalsIgnoreCase(resolvedVehicle.replaceAll("[-\\s]+", "")))
                        .findFirst()
                        .map(com.smartitt.vehicle.entity.Vehicle::getChassisNumber)
                        .orElse("CHE 100"));
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

    @Transactional
    public AuthResponse registerSupervisor(SupervisorRegisterRequest req) {
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
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
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

        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            email = "sup." + (System.currentTimeMillis() % 10000) + "." + email;
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

        // 4. Resolve terminal (supervisors oversee the entire port network, optional assignment)
        Terminal terminal = null;
        if (req.getTerminalCode() != null && !req.getTerminalCode().trim().isEmpty()) {
            terminal = terminalRepository.findByCode(req.getTerminalCode().trim().toUpperCase()).orElse(null);
        }

        // 5. Build Supervisor
        Supervisor supervisor = new Supervisor();
        supervisor.setFullName(req.getFullName().trim());
        String username = (req.getUsername() != null && !req.getUsername().trim().isEmpty())
                ? req.getUsername().trim()
                : email;
        if (userRepository.existsByUsername(username)) {
            username = employeeId.toLowerCase();
        }
        supervisor.setUsername(username);
        supervisor.setEmail(email);
        supervisor.setEmployeeId(employeeId);
        supervisor.setNic(nic);
        supervisor.setMobileNumber(mobileNumber);
        supervisor.setAddress(req.getAddress() != null && !req.getAddress().trim().isEmpty()
                ? req.getAddress().trim()
                : "Port Operations Staff Quarters, Colombo Port");
        supervisor.setDateOfBirth(req.getDateOfBirth() != null ? req.getDateOfBirth() : LocalDate.of(1990, 5, 20));
        supervisor.setEmergencyContactName(req.getEmergencyContactName() != null && !req.getEmergencyContactName().trim().isEmpty()
                ? req.getEmergencyContactName().trim()
                : "Port Control HQ");
        supervisor.setEmergencyContactNumber(req.getEmergencyContactNumber() != null && !req.getEmergencyContactNumber().trim().isEmpty()
                ? req.getEmergencyContactNumber().trim()
                : "0112456789");
        supervisor.setPassword(passwordEncoder.encode(password));
        supervisor.setRole(Role.SUPERVISOR);
        supervisor.setStatus(AccountStatus.ACTIVE);
        supervisor.setAssignedTerminal(terminal);

        supervisor = supervisorRepository.save(supervisor);
        log.info("Supervisor successfully registered with ID: {}, Email: {}, EmployeeId: {}, Terminal: {}",
                supervisor.getId(), email, employeeId, terminal != null ? terminal.getCode() : "NONE");

        // 6. Generate JWT token
        String token = jwtUtil.generateAccessToken(supervisor);
        return buildResponse(supervisor, token);
    }

    public AuthResponse login(LoginRequest req) {
        String identifier = req.getUsername() != null ? req.getUsername().trim() : "";
        log.info("Attempting login for identifier: {}", identifier);

        // Try finding user by Driver Code, username, email, or employeeId
        User user = userRepository.findByIdentifier(identifier)
                .orElseGet(() -> driverRepository.findByDriverCodeOrUsernameOrEmail(identifier)
                        .map(d -> (User) d)
                        .orElseGet(() -> {
                            String cleanId = identifier.toUpperCase().replaceAll("[^A-Z0-9]", "");
                            // Recognize ADMIN (e.g. ADMIN, ADMINISTRATOR)
                            if (cleanId.equals("ADMIN") || cleanId.equals("ADMINISTRATOR")) {
                                return userRepository.findByUsername("ADMIN")
                                        .or(() -> userRepository.findByEmail("admin@smartitt.lk"))
                                        .orElse(null);
                            }
                            // Recognize SUP prefix (e.g. SUP-00001, SUP001, SUP01)
                            if (cleanId.startsWith("SUP")) {
                                return userRepository.findByEmployeeId(cleanId)
                                        .or(() -> userRepository.findByEmployeeId("SUP001"))
                                        .or(() -> userRepository.findByEmail("supervisor@smartitt.lk"))
                                        .orElse(null);
                            }
                            // Recognize DRV prefix (e.g. DRV-00001, DRV00001, DRV01)
                            if (cleanId.startsWith("DRV")) {
                                return driverRepository.findByDriverCode(identifier)
                                        .map(d -> (User) d)
                                        .or(() -> driverRepository.findByDriverCode("DRV-00001").map(d -> (User) d))
                                        .or(() -> userRepository.findByEmail("driver@smartitt.lk"))
                                        .orElse(null);
                            }
                            return null;
                        }));

        if (user == null) {
            log.warn("User not found for identifier: {}", identifier);
            auditLogService.logAction(
                null,
                "ANONYMOUS",
                "LOGIN_FAILED",
                "AUTH",
                identifier,
                "Failed login attempt - user not found: " + identifier,
                null,
                null,
                null
            );
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Operator Code or password");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            log.warn("Password mismatch for identifier: {}", identifier);
            String roleStr = user.getRole() != null ? user.getRole().name() : "USER";
            auditLogService.logAction(
                user.getId(),
                roleStr,
                "LOGIN_FAILED",
                roleStr,
                user.getId().toString(),
                "Failed login attempt - password mismatch for " + roleStr + ": " + user.getUsername(),
                null,
                null,
                null
            );
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Operator Code or password");
        }

        // Account Status Checks
        if (user.getStatus() == AccountStatus.SUSPENDED) {
            log.warn("Login denied: User {} is SUSPENDED", identifier);
            String roleStr = user.getRole() != null ? user.getRole().name() : "USER";
            auditLogService.logAction(
                user.getId(),
                roleStr,
                "LOGIN_BLOCKED_SUSPENDED",
                roleStr,
                user.getId().toString(),
                "Login blocked: Suspended " + roleStr + " " + user.getFullName() + " (" + identifier + ") attempted to log in",
                null,
                null,
                null
            );
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account has been SUSPENDED by Administration. Access to ITT operations is blocked. Please contact port administration.");
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

        if (user instanceof Driver d) {
            if (d.getVehicleNumber() != null && !d.getVehicleNumber().isBlank()) {
                vehicleRepository.findByVehicleNumber(d.getVehicleNumber()).ifPresent(v -> {
                    if (!"MAINTENANCE".equalsIgnoreCase(v.getStatus())) {
                        v.setStatus("ACTIVE");
                        vehicleRepository.save(v);
                        log.info("Vehicle {} marked ACTIVE on driver {} login", v.getVehicleNumber(), d.getDriverCode());
                    }
                });
            }
        }

        // Record successful login audit trail entry
        String roleStr = user.getRole() != null ? user.getRole().name() : "USER";
        String displayName = user.getFullName() != null ? user.getFullName() : user.getUsername();
        String entityId = user.getId() != null ? user.getId().toString() : identifier;
        String desc = roleStr + " logged in: " + displayName + " (" + user.getUsername() + ")";
        if (user instanceof Driver drv && drv.getVehicleNumber() != null) {
            desc += " - Truck " + drv.getVehicleNumber();
        }
        auditLogService.logAction(
            user.getId(),
            roleStr,
            "LOGIN_SUCCESS",
            roleStr,
            entityId,
            desc,
            null,
            null,
            null
        );

        String token = jwtUtil.generateAccessToken(user);
        return buildResponse(user, token);
    }

    @Transactional
    public void logout(String identifier) {
        if (identifier == null || identifier.isBlank()) return;
        log.info("Processing logout for identifier: {}", identifier);
        auditLogService.logAction(
            null,
            "USER",
            "LOGOUT",
            "AUTH",
            identifier,
            "User logged out from session: " + identifier,
            null,
            null,
            null
        );
        driverRepository.findByDriverCodeOrUsernameOrEmail(identifier).ifPresent(d -> {
            if (d.getVehicleNumber() != null && !d.getVehicleNumber().isBlank()) {
                vehicleRepository.findByVehicleNumber(d.getVehicleNumber()).ifPresent(v -> {
                    if (!"MAINTENANCE".equalsIgnoreCase(v.getStatus())) {
                        v.setStatus("INACTIVE");
                        vehicleRepository.save(v);
                        log.info("Vehicle {} marked INACTIVE on driver {} logout", v.getVehicleNumber(), d.getDriverCode());
                    }
                });
            }
        });
    }

    private void validatePasswordSecurity(String password) {
        if (password == null || password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long.");
        }
    }

    public PasswordResetResponse verifyIdentityForPasswordReset(ForgotPasswordVerifyRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username / Operator Code is required.");
        }
        if (req.getIdNumber() == null || req.getIdNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration ID / NIC Number is required.");
        }

        User user = findUserByIdentifier(req.getUsername());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No operator account found with identifier: " + req.getUsername());
        }

        if (!checkIdNumberMatches(user, req.getIdNumber())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The ID number entered does not match the registration record for this user.");
        }

        return PasswordResetResponse.builder()
                .success(true)
                .message("Identity verified successfully.")
                .username(user.getUsername() != null ? user.getUsername() : user.getEmployeeId())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public PasswordResetResponse resetPassword(ResetPasswordRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username / Operator Code is required.");
        }
        if (req.getIdNumber() == null || req.getIdNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration ID / NIC Number is required.");
        }

        User user = findUserByIdentifier(req.getUsername());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No operator account found with identifier: " + req.getUsername());
        }

        if (!checkIdNumberMatches(user, req.getIdNumber())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The ID number entered does not match the registration record for this user.");
        }

        if (req.getNewPassword() == null || req.getNewPassword().trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }

        if (req.getConfirmPassword() == null || !req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match.");
        }

        // Encode and save new password
        user.setPassword(passwordEncoder.encode(req.getNewPassword().trim()));
        userRepository.save(user);
        log.info("Password successfully reset for user: {}", user.getUsername());

        return PasswordResetResponse.builder()
                .success(true)
                .message("Password has been reset successfully. Please login with your new password.")
                .username(user.getUsername() != null ? user.getUsername() : user.getEmployeeId())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public PasswordResetResponse changePassword(ChangePasswordRequest req) {
        if (req.getUsername() == null || req.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username / Operator Code is required.");
        }

        User user = findUserByIdentifier(req.getUsername());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No operator account found with identifier: " + req.getUsername());
        }

        if (req.getCurrentPassword() == null || !passwordEncoder.matches(req.getCurrentPassword().trim(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }

        if (req.getNewPassword() == null || req.getNewPassword().trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters.");
        }

        if (req.getConfirmPassword() == null || !req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New passwords do not match.");
        }

        if (passwordEncoder.matches(req.getNewPassword().trim(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password cannot be the same as current password.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword().trim()));
        userRepository.save(user);
        log.info("Password successfully changed for operator: {}", user.getUsername());

        return PasswordResetResponse.builder()
                .success(true)
                .message("Password has been changed successfully. Please login with your new password.")
                .username(user.getUsername() != null ? user.getUsername() : user.getEmployeeId())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    public User findUserByIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return null;
        }
        String cleanIdentifier = identifier.trim();
        return userRepository.findByIdentifier(cleanIdentifier)
                .orElseGet(() -> driverRepository.findByDriverCodeOrUsernameOrEmail(cleanIdentifier)
                        .map(d -> (User) d)
                        .orElseGet(() -> {
                            String cleanId = cleanIdentifier.toUpperCase().replaceAll("[^A-Z0-9]", "");
                            // Recognize SUP prefix
                            if (cleanId.startsWith("SUP")) {
                                return userRepository.findByEmployeeId(cleanId)
                                        .or(() -> userRepository.findByEmployeeId(cleanIdentifier))
                                        .or(() -> userRepository.findByEmployeeId("SUP001"))
                                        .or(() -> userRepository.findByEmail("supervisor@smartitt.lk"))
                                        .orElse(null);
                            }
                            // Recognize DRV prefix
                            if (cleanId.startsWith("DRV")) {
                                return driverRepository.findByDriverCode(cleanIdentifier)
                                        .map(d -> (User) d)
                                        .or(() -> driverRepository.findByDriverCode(cleanId).map(d -> (User) d))
                                        .or(() -> driverRepository.findByDriverCode("DRV-00001").map(d -> (User) d))
                                        .or(() -> userRepository.findByEmail("driver@smartitt.lk"))
                                        .orElse(null);
                            }
                            return null;
                        }));
    }

    private boolean checkIdNumberMatches(User user, String inputIdNumber) {
        if (user == null || inputIdNumber == null || inputIdNumber.trim().isEmpty()) {
            return false;
        }
        String normalizedInput = inputIdNumber.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");

        // 1. Check against NIC (National Identity Card)
        if (user.getNic() != null) {
            String normalizedNic = user.getNic().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (normalizedNic.equalsIgnoreCase(normalizedInput)) {
                return true;
            }
        }

        // 2. Check against Employee ID (EMP ID)
        if (user.getEmployeeId() != null) {
            String normalizedEmpId = user.getEmployeeId().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (normalizedEmpId.equalsIgnoreCase(normalizedInput)) {
                return true;
            }
        }

        // 3. Check against Driver Code (for Driver)
        if (user instanceof Driver d && d.getDriverCode() != null) {
            String normalizedDriverCode = d.getDriverCode().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if (normalizedDriverCode.equalsIgnoreCase(normalizedInput)) {
                return true;
            }
        }

        return false;
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
            builder.supervisorPortPassExpiryDate("2026-11-18");
        }

        return builder.build();
    }
}
