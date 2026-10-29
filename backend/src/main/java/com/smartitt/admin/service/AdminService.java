package com.smartitt.admin.service;

import com.smartitt.admin.dto.AdminDashboardResponse;
import com.smartitt.audit.entity.AuditLog;
import com.smartitt.audit.service.AuditLogService;
import com.smartitt.container.entity.Container;
import com.smartitt.container.entity.ContainerSize;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.driver.dto.DriverProfileResponse;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.supervisor.repository.SupervisorRepository;
import com.smartitt.terminal.entity.Terminal;
import com.smartitt.terminal.repository.TerminalRepository;
import com.smartitt.trip.dto.TripResponse;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.trip.service.TripService;
import com.smartitt.user.entity.AccountStatus;
import com.smartitt.user.entity.Role;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import com.smartitt.vehicle.dto.VehicleResponse;
import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final SupervisorRepository supervisorRepository;
    private final VehicleRepository vehicleRepository;
    private final TripRepository tripRepository;
    private final ContainerRepository containerRepository;
    private final TerminalRepository terminalRepository;
    private final TripService tripService;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;

    private UUID getCurrentActorId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u.getId();
            }
        } catch (Exception ignored) {}
        return UUID.fromString("00000000-0000-0000-0000-000000000000");
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DASHBOARD
    // ─────────────────────────────────────────────────────────────
    public AdminDashboardResponse getDashboardStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<Driver> allDrivers = driverRepository.findAll();
        long activeDrivers = allDrivers.stream().filter(d -> d.getStatus() == AccountStatus.ACTIVE).count();
        long suspendedDrivers = allDrivers.stream().filter(d -> d.getStatus() == AccountStatus.SUSPENDED).count();
        long deactivatedDrivers = allDrivers.stream().filter(d -> d.getStatus() == AccountStatus.DEACTIVATED).count();

        List<Supervisor> allSupervisors = supervisorRepository.findAll();
        long activeSupervisors = allSupervisors.stream().filter(s -> s.getStatus() == AccountStatus.ACTIVE).count();

        List<Vehicle> allVehicles = vehicleRepository.findAll();
        long activeVehicles = allVehicles.stream().filter(v -> "ACTIVE".equalsIgnoreCase(v.getStatus())).count();
        long maintenanceVehicles = allVehicles.stream().filter(v -> "MAINTENANCE".equalsIgnoreCase(v.getStatus())).count();
        long assignedVehicles = allVehicles.stream().filter(v -> v.getAssignedDriverId() != null).count();
        long sckVehicles = allVehicles.stream().filter(v -> "SCK Logistics".equalsIgnoreCase(v.getOperator())).count();
        long sdrVehicles = allVehicles.stream().filter(v -> "SDR LINK".equalsIgnoreCase(v.getOperator())).count();

        long todayTrips = tripRepository.countTodayTrips(startOfDay, endOfDay);
        long inProgress = tripRepository.countByStatus(TripStatus.IN_PROGRESS);
        long pending = tripRepository.countByStatus(TripStatus.PENDING_APPROVAL);
        long completed = tripRepository.countByStatus(TripStatus.COMPLETED);
        long approved = tripRepository.countByStatus(TripStatus.APPROVED);
        long rejected = tripRepository.countByStatus(TripStatus.REJECTED);
        long totalTrips = tripRepository.count();

        List<Container> allContainers = containerRepository.findAll();
        long totalContainers = allContainers.size();
        long twentyFt = allContainers.stream().filter(c -> c.getSize() == ContainerSize.FT_20).count();
        long fortyFt = allContainers.stream().filter(c -> c.getSize() == ContainerSize.FT_40).count();

        Map<String, Long> terminalStats = new LinkedHashMap<>();
        for (String t : new String[]{"CICT", "CWIT", "ECT", "JCT", "UCT", "SAGT"}) {
            terminalStats.put(t, tripRepository.countBySourceTerminalToday(t, startOfDay, endOfDay));
        }

        List<TripResponse> recentTrips = tripRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .limit(10)
                .map(tripService::mapToResponse)
                .collect(Collectors.toList());

        List<AuditLog> recentLogs = auditLogService.getRecentLogs();

        return AdminDashboardResponse.builder()
                .totalDrivers(allDrivers.size())
                .activeDrivers(activeDrivers)
                .suspendedDrivers(suspendedDrivers)
                .deactivatedDrivers(deactivatedDrivers)
                .totalSupervisors(allSupervisors.size())
                .activeSupervisors(activeSupervisors)
                .totalVehicles(allVehicles.size())
                .activeVehicles(activeVehicles)
                .maintenanceVehicles(maintenanceVehicles)
                .assignedVehicles(assignedVehicles)
                .sckVehicles(sckVehicles)
                .sdrVehicles(sdrVehicles)
                .todayTrips(todayTrips)
                .tripsInProgress(inProgress)
                .tripsPendingApproval(pending)
                .tripsCompleted(completed)
                .tripsApproved(approved)
                .tripsRejected(rejected)
                .totalTripsAllTime(totalTrips)
                .totalContainers(totalContainers)
                .twentyFtContainers(twentyFt)
                .fortyFtContainers(fortyFt)
                .terminalWiseTrips(terminalStats)
                .recentTrips(recentTrips)
                .recentAuditLogs(recentLogs)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DRIVER MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    public List<DriverProfileResponse> getAllDrivers(String search, String status) {
        List<Driver> drivers = driverRepository.findAll();

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                AccountStatus st = AccountStatus.valueOf(status.toUpperCase());
                drivers = drivers.stream().filter(d -> d.getStatus() == st).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            drivers = drivers.stream().filter(d ->
                    (d.getFullName() != null && d.getFullName().toLowerCase().contains(q)) ||
                    (d.getDriverCode() != null && d.getDriverCode().toLowerCase().contains(q)) ||
                    (d.getEmployeeId() != null && d.getEmployeeId().toLowerCase().contains(q)) ||
                    (d.getVehicleNumber() != null && d.getVehicleNumber().toLowerCase().contains(q)) ||
                    (d.getMobileNumber() != null && d.getMobileNumber().contains(q))
            ).collect(Collectors.toList());
        }

        return drivers.stream().map(this::mapDriverToProfile).collect(Collectors.toList());
    }

    public DriverProfileResponse getDriverById(String id) {
        Driver d = findDriver(id);
        return mapDriverToProfile(d);
    }

    @Transactional
    public DriverProfileResponse createDriver(Map<String, Object> req) {
        String fullName = (String) req.get("fullName");
        String employeeId = (String) req.get("employeeId");
        String nic = (String) req.get("nic");
        String mobileNumber = (String) req.get("mobileNumber");
        String email = (String) req.get("email");
        String password = (String) req.get("password");
        String drivingLicenceNumber = (String) req.get("drivingLicenceNumber");
        String vehicleNumber = (String) req.get("vehicleNumber");
        String chassisNumber = (String) req.get("chassisNumber");
        String address = (String) req.get("address");

        if (fullName == null || fullName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full Name is required");
        if (employeeId == null || employeeId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee ID is required");
        if (nic == null || nic.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NIC is required");
        if (mobileNumber == null || mobileNumber.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number is required");
        if (drivingLicenceNumber == null || drivingLicenceNumber.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "License number is required");

        if (userRepository.existsByEmployeeId(employeeId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee ID already registered");
        if (userRepository.existsByNic(nic)) throw new ResponseStatusException(HttpStatus.CONFLICT, "NIC already registered");
        if (userRepository.existsByMobileNumber(mobileNumber)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Mobile number already registered");
        if (email != null && !email.isBlank() && userRepository.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        if (driverRepository.existsByDrivingLicenceNumber(drivingLicenceNumber)) throw new ResponseStatusException(HttpStatus.CONFLICT, "License number already registered");

        String driverCode = (String) req.get("driverCode");
        if (driverCode == null || driverCode.isBlank()) {
            driverCode = generateNextDriverCode();
        }

        Driver driver = new Driver();
        driver.setFullName(fullName);
        driver.setEmployeeId(employeeId);
        driver.setDriverCode(driverCode);
        driver.setUsername(driverCode);
        driver.setNic(nic);
        driver.setMobileNumber(mobileNumber);
        driver.setEmail(email != null && !email.isBlank() ? email : driverCode.toLowerCase() + "@smartitt.lk");
        driver.setPassword(passwordEncoder.encode(password != null && !password.isBlank() ? password : "driver"));
        driver.setRole(Role.DRIVER);
        driver.setStatus(AccountStatus.ACTIVE);
        driver.setDrivingLicenceNumber(drivingLicenceNumber);
        driver.setVehicleNumber(vehicleNumber);
        driver.setChassisNumber(chassisNumber);
        driver.setAddress(address);

        if (req.containsKey("licenseExpiryDate") && req.get("licenseExpiryDate") != null) {
            try {
                driver.setLicenseExpiryDate(LocalDate.parse((String) req.get("licenseExpiryDate")));
            } catch (Exception ignored) {}
        }

        Driver saved = driverRepository.save(driver);

        // Link vehicle to driver if vehicleNumber provided
        if (vehicleNumber != null && !vehicleNumber.isBlank()) {
            vehicleRepository.findByVehicleNumber(vehicleNumber).ifPresent(v -> {
                v.setAssignedDriverId(saved.getId());
                vehicleRepository.save(v);
            });
        }

        auditLogService.log(getCurrentActorId(), "ADMIN", "CREATE_DRIVER", "DRIVER", saved.getId().toString(),
                "Created driver: " + saved.getFullName() + " (" + saved.getDriverCode() + ")");

        return mapDriverToProfile(saved);
    }

    @Transactional
    public DriverProfileResponse updateDriver(String id, Map<String, Object> req) {
        Driver driver = findDriver(id);
        String oldSnapshot = driver.getFullName() + " | " + driver.getStatus() + " | " + driver.getVehicleNumber();

        if (req.containsKey("fullName")) driver.setFullName((String) req.get("fullName"));
        if (req.containsKey("mobileNumber")) driver.setMobileNumber((String) req.get("mobileNumber"));
        if (req.containsKey("email")) driver.setEmail((String) req.get("email"));
        if (req.containsKey("address")) driver.setAddress((String) req.get("address"));
        if (req.containsKey("vehicleNumber")) driver.setVehicleNumber((String) req.get("vehicleNumber"));
        if (req.containsKey("chassisNumber")) driver.setChassisNumber((String) req.get("chassisNumber"));
        if (req.containsKey("drivingLicenceNumber")) driver.setDrivingLicenceNumber((String) req.get("drivingLicenceNumber"));

        if (req.containsKey("licenseExpiryDate") && req.get("licenseExpiryDate") != null) {
            try {
                driver.setLicenseExpiryDate(LocalDate.parse((String) req.get("licenseExpiryDate")));
            } catch (Exception ignored) {}
        }

        if (req.containsKey("status") && req.get("status") != null) {
            try {
                driver.setStatus(AccountStatus.valueOf(((String) req.get("status")).toUpperCase()));
            } catch (Exception ignored) {}
        }

        if (req.containsKey("portPassNumber")) driver.setPortPassNumber((String) req.get("portPassNumber"));
        if (req.containsKey("portPassExpiryDate") && req.get("portPassExpiryDate") != null) {
            try {
                driver.setPortPassExpiryDate(LocalDate.parse((String) req.get("portPassExpiryDate")));
            } catch (Exception ignored) {}
        }

        Driver updated = driverRepository.save(driver);
        String newSnapshot = updated.getFullName() + " | " + updated.getStatus() + " | " + updated.getVehicleNumber();

        auditLogService.logAction(getCurrentActorId(), "ADMIN", "UPDATE_DRIVER", "DRIVER", updated.getId().toString(),
                "Updated driver details for " + updated.getDriverCode(), oldSnapshot, newSnapshot, null);

        return mapDriverToProfile(updated);
    }

    @Transactional
    public DriverProfileResponse updateDriverStatus(String id, String newStatus, String reason) {
        Driver driver = findDriver(id);
        AccountStatus oldStatus = driver.getStatus();
        AccountStatus statusEnum = AccountStatus.valueOf(newStatus.toUpperCase());
        driver.setStatus(statusEnum);
        Driver saved = driverRepository.save(driver);

        auditLogService.logAction(getCurrentActorId(), "ADMIN", "UPDATE_DRIVER_STATUS", "DRIVER", saved.getId().toString(),
                "Changed status from " + oldStatus + " to " + statusEnum + (reason != null ? " Reason: " + reason : ""),
                oldStatus.name(), statusEnum.name(), null);

        return mapDriverToProfile(saved);
    }

    @Transactional
    public void resetDriverPassword(String id, String newPassword) {
        String pwd = (newPassword != null && !newPassword.isBlank()) ? newPassword : "driver";
        Driver driver = findDriver(id);
        driver.setPassword(passwordEncoder.encode(pwd));
        driverRepository.save(driver);

        auditLogService.log(getCurrentActorId(), "ADMIN", "RESET_DRIVER_PASSWORD", "DRIVER", driver.getId().toString(),
                "Password reset by Admin for " + driver.getDriverCode() + " (" + driver.getFullName() + ") to default: '" + pwd + "'");
    }

    private String generateNextDriverCode() {
        Optional<String> maxCodeOpt = driverRepository.findMaxDriverCode();
        int nextNum = 1;
        if (maxCodeOpt.isPresent()) {
            String maxCode = maxCodeOpt.get();
            try {
                String numPart = maxCode.replace("DRV-", "").trim();
                nextNum = Integer.parseInt(numPart) + 1;
            } catch (Exception ignored) {}
        }
        return String.format("DRV-%05d", nextNum);
    }

    private Driver findDriver(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return driverRepository.findById(uuid)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found"));
        } catch (IllegalArgumentException e) {
            return driverRepository.findByDriverCode(id)
                    .or(() -> driverRepository.findByUsername(id))
                    .or(() -> driverRepository.findByEmployeeId(id))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver not found: " + id));
        }
    }

    private DriverProfileResponse mapDriverToProfile(Driver d) {
        return DriverProfileResponse.builder()
                .id(d.getId().toString())
                .driverCode(d.getDriverCode())
                .fullName(d.getFullName())
                .employeeId(d.getEmployeeId())
                .nic(d.getNic())
                .mobileNumber(d.getMobileNumber())
                .email(d.getEmail())
                .username(d.getUsername())
                .status(d.getStatus().name())
                .vehicleNumber(d.getVehicleNumber())
                .chassisNumber(d.getChassisNumber())
                .cheNumber(d.getChassisNumber())
                .licenseNumber(d.getDrivingLicenceNumber())
                .licenseExpiryDate(d.getLicenseExpiryDate())
                .portPassNumber(d.getPortPassNumber())
                .portPassExpiryDate(d.getPortPassExpiryDate())
                .portPassDaysLeft(d.getPortPassDaysUntilExpiry())
                .portPassRenewalDue(d.isPortPassRenewalDue())
                .portPassStatus(d.getPortPassStatus())
                .address(d.getAddress())
                .profilePhoto(d.getProfilePhoto())
                .coverImage(d.getCoverImage())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SUPERVISOR MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    public List<Map<String, Object>> getAllSupervisors(String search, String status) {
        List<Supervisor> supervisors = supervisorRepository.findAll();

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                AccountStatus st = AccountStatus.valueOf(status.toUpperCase());
                supervisors = supervisors.stream().filter(s -> s.getStatus() == st).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            supervisors = supervisors.stream().filter(s ->
                    (s.getFullName() != null && s.getFullName().toLowerCase().contains(q)) ||
                    (s.getEmployeeId() != null && s.getEmployeeId().toLowerCase().contains(q)) ||
                    (s.getEmail() != null && s.getEmail().toLowerCase().contains(q)) ||
                    (s.getMobileNumber() != null && s.getMobileNumber().contains(q))
            ).collect(Collectors.toList());
        }

        return supervisors.stream().map(this::mapSupervisorToDto).collect(Collectors.toList());
    }

    public Map<String, Object> getSupervisorById(String id) {
        Supervisor s = findSupervisor(id);
        return mapSupervisorToDto(s);
    }

    @Transactional
    public Map<String, Object> createSupervisor(Map<String, Object> req) {
        String fullName = (String) req.get("fullName");
        String employeeId = (String) req.get("employeeId");
        String nic = (String) req.get("nic");
        String mobileNumber = (String) req.get("mobileNumber");
        String email = (String) req.get("email");
        String password = (String) req.get("password");
        String terminalCode = (String) req.get("terminalCode");

        if (fullName == null || fullName.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full Name is required");
        if (employeeId == null || employeeId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee ID is required");
        if (nic == null || nic.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NIC is required");
        if (mobileNumber == null || mobileNumber.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number is required");

        if (userRepository.existsByEmployeeId(employeeId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee ID already exists");
        if (userRepository.existsByNic(nic)) throw new ResponseStatusException(HttpStatus.CONFLICT, "NIC already registered");
        if (userRepository.existsByMobileNumber(mobileNumber)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Mobile number already exists");
        if (email != null && !email.isBlank() && userRepository.existsByEmail(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");

        Supervisor sup = new Supervisor();
        sup.setFullName(fullName);
        sup.setEmployeeId(employeeId);
        sup.setUsername(employeeId);
        sup.setNic(nic);
        sup.setMobileNumber(mobileNumber);
        sup.setEmail(email != null && !email.isBlank() ? email : employeeId.toLowerCase() + "@smartitt.lk");
        sup.setPassword(passwordEncoder.encode(password != null && !password.isBlank() ? password : "supervisor"));
        sup.setRole(Role.SUPERVISOR);
        sup.setStatus(AccountStatus.ACTIVE);

        if (terminalCode != null && !terminalCode.isBlank()) {
            terminalRepository.findByCode(terminalCode.toUpperCase()).ifPresent(sup::setAssignedTerminal);
        }

        Supervisor saved = supervisorRepository.save(sup);

        auditLogService.log(getCurrentActorId(), "ADMIN", "CREATE_SUPERVISOR", "SUPERVISOR", saved.getId().toString(),
                "Created supervisor: " + saved.getFullName() + " (" + saved.getEmployeeId() + ")");

        return mapSupervisorToDto(saved);
    }

    @Transactional
    public Map<String, Object> updateSupervisor(String id, Map<String, Object> req) {
        Supervisor sup = findSupervisor(id);

        if (req.containsKey("fullName")) sup.setFullName((String) req.get("fullName"));
        if (req.containsKey("mobileNumber")) sup.setMobileNumber((String) req.get("mobileNumber"));
        if (req.containsKey("email")) sup.setEmail((String) req.get("email"));
        if (req.containsKey("address")) sup.setAddress((String) req.get("address"));

        if (req.containsKey("terminalCode")) {
            String termCode = (String) req.get("terminalCode");
            if (termCode != null && !termCode.isBlank()) {
                terminalRepository.findByCode(termCode.toUpperCase()).ifPresent(sup::setAssignedTerminal);
            } else {
                sup.setAssignedTerminal(null);
            }
        }

        if (req.containsKey("status") && req.get("status") != null) {
            try {
                sup.setStatus(AccountStatus.valueOf(((String) req.get("status")).toUpperCase()));
            } catch (Exception ignored) {}
        }

        Supervisor updated = supervisorRepository.save(sup);

        auditLogService.log(getCurrentActorId(), "ADMIN", "UPDATE_SUPERVISOR", "SUPERVISOR", updated.getId().toString(),
                "Updated supervisor details for " + updated.getEmployeeId());

        return mapSupervisorToDto(updated);
    }

    @Transactional
    public Map<String, Object> updateSupervisorStatus(String id, String newStatus, String reason) {
        Supervisor sup = findSupervisor(id);
        AccountStatus oldStatus = sup.getStatus();
        AccountStatus st = AccountStatus.valueOf(newStatus.toUpperCase());
        sup.setStatus(st);
        Supervisor saved = supervisorRepository.save(sup);

        auditLogService.logAction(getCurrentActorId(), "ADMIN", "UPDATE_SUPERVISOR_STATUS", "SUPERVISOR", saved.getId().toString(),
                "Changed supervisor status from " + oldStatus + " to " + st + (reason != null ? " Reason: " + reason : ""),
                oldStatus.name(), st.name(), null);

        return mapSupervisorToDto(saved);
    }

    @Transactional
    public void resetSupervisorPassword(String id, String newPassword) {
        Supervisor sup = findSupervisor(id);
        sup.setPassword(passwordEncoder.encode(newPassword));
        supervisorRepository.save(sup);

        auditLogService.log(getCurrentActorId(), "ADMIN", "RESET_SUPERVISOR_PASSWORD", "SUPERVISOR", sup.getId().toString(),
                "Password reset by Admin for supervisor " + sup.getEmployeeId());
    }

    private Supervisor findSupervisor(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return supervisorRepository.findById(uuid)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supervisor not found"));
        } catch (IllegalArgumentException e) {
            return supervisorRepository.findByEmployeeId(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supervisor not found: " + id));
        }
    }

    private Map<String, Object> mapSupervisorToDto(Supervisor s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId().toString());
        map.put("fullName", s.getFullName());
        map.put("employeeId", s.getEmployeeId());
        map.put("nic", s.getNic());
        map.put("mobileNumber", s.getMobileNumber());
        map.put("email", s.getEmail());
        map.put("username", s.getUsername());
        map.put("status", s.getStatus().name());
        map.put("assignedTerminal", s.getAssignedTerminal() != null ? s.getAssignedTerminal().getCode() : null);
        map.put("assignedTerminalName", s.getAssignedTerminal() != null ? s.getAssignedTerminal().getName() : null);
        map.put("address", s.getAddress());
        map.put("createdAt", s.getCreatedAt());
        return map;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. VEHICLE & FLEET MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    public List<VehicleResponse> getAllVehicles(String search, String operator, String status) {
        List<Vehicle> list = vehicleRepository.findAllByOrderByChassisNumberAsc();

        if (operator != null && !operator.isBlank() && !"ALL".equalsIgnoreCase(operator)) {
            list = list.stream().filter(v -> operator.equalsIgnoreCase(v.getOperator())).collect(Collectors.toList());
        }

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = list.stream().filter(v -> status.equalsIgnoreCase(v.getStatus())).collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(v ->
                    (v.getVehicleNumber() != null && v.getVehicleNumber().toLowerCase().contains(q)) ||
                    (v.getChassisNumber() != null && v.getChassisNumber().toLowerCase().contains(q)) ||
                    (v.getOperator() != null && v.getOperator().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }

        return list.stream().map(this::mapVehicleToResponse).collect(Collectors.toList());
    }

    @Transactional
    public VehicleResponse createVehicle(Map<String, Object> req) {
        String vehicleNumber = (String) req.get("vehicleNumber");
        String chassisNumber = (String) req.get("chassisNumber");
        String operator = (String) req.get("operator");
        String trailerSize = (String) req.get("trailerSize");
        String status = (String) req.get("status");

        if (vehicleNumber == null || vehicleNumber.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vehicle number required");
        if (vehicleRepository.existsByVehicleNumber(vehicleNumber)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Vehicle number already exists");

        Vehicle v = Vehicle.builder()
                .vehicleNumber(vehicleNumber.trim().toUpperCase())
                .chassisNumber(chassisNumber != null ? chassisNumber.trim().toUpperCase() : null)
                .operator(operator != null && !operator.isBlank() ? operator.trim() : "SCK Logistics")
                .trailerSize(trailerSize != null && !trailerSize.isBlank() ? trailerSize.trim().toUpperCase() : "40FT")
                .status(status != null && !status.isBlank() ? status.trim().toUpperCase() : "ACTIVE")
                .licenseIssuedDate(LocalDate.now().minusMonths(1))
                .licenseExpiryDate(LocalDate.now().plusMonths(11))
                .portPassIssuedDate(LocalDate.now().minusMonths(1))
                .portPassExpiryDate(LocalDate.now().plusMonths(11))
                .portPassNumber((String) req.get("portPassNumber"))
                .build();

        if (req.containsKey("portPassExpiryDate") && req.get("portPassExpiryDate") != null) {
            try {
                v.setPortPassExpiryDate(LocalDate.parse((String) req.get("portPassExpiryDate")));
            } catch (Exception ignored) {}
        }

        if (req.containsKey("assignedDriverId") && req.get("assignedDriverId") != null) {
            String dId = (String) req.get("assignedDriverId");
            try {
                v.setAssignedDriverId(UUID.fromString(dId));
            } catch (Exception ignored) {}
        }

        Vehicle saved = vehicleRepository.save(v);

        auditLogService.log(getCurrentActorId(), "ADMIN", "CREATE_VEHICLE", "VEHICLE", saved.getId().toString(),
                "Added vehicle " + saved.getVehicleNumber() + " (" + saved.getChassisNumber() + ")");

        return mapVehicleToResponse(saved);
    }

    @Transactional
    public VehicleResponse updateVehicle(UUID id, Map<String, Object> req) {
        Vehicle v = vehicleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found"));

        if (req.containsKey("status")) v.setStatus(((String) req.get("status")).toUpperCase());
        if (req.containsKey("operator")) v.setOperator((String) req.get("operator"));
        if (req.containsKey("trailerSize")) v.setTrailerSize(((String) req.get("trailerSize")).toUpperCase());
        if (req.containsKey("chassisNumber")) v.setChassisNumber((String) req.get("chassisNumber"));
        if (req.containsKey("portPassNumber")) v.setPortPassNumber((String) req.get("portPassNumber"));

        if (req.containsKey("assignedDriverId")) {
            String dId = (String) req.get("assignedDriverId");
            if (dId != null && !dId.isBlank()) {
                try {
                    v.setAssignedDriverId(UUID.fromString(dId));
                } catch (Exception ignored) {}
            } else {
                v.setAssignedDriverId(null);
            }
        }

        if (req.containsKey("licenseExpiryDate") && req.get("licenseExpiryDate") != null) {
            try {
                v.setLicenseExpiryDate(LocalDate.parse((String) req.get("licenseExpiryDate")));
            } catch (Exception ignored) {}
        }

        if (req.containsKey("portPassExpiryDate") && req.get("portPassExpiryDate") != null) {
            try {
                v.setPortPassExpiryDate(LocalDate.parse((String) req.get("portPassExpiryDate")));
            } catch (Exception ignored) {}
        }

        Vehicle updated = vehicleRepository.save(v);

        auditLogService.log(getCurrentActorId(), "ADMIN", "UPDATE_VEHICLE", "VEHICLE", updated.getId().toString(),
                "Updated vehicle " + updated.getVehicleNumber());

        return mapVehicleToResponse(updated);
    }

    private VehicleResponse mapVehicleToResponse(Vehicle v) {
        String driverName = null;
        String driverCode = null;
        String driverMobile = null;

        if (v.getAssignedDriverId() != null) {
            Optional<Driver> dOpt = driverRepository.findById(v.getAssignedDriverId());
            if (dOpt.isPresent()) {
                driverName = dOpt.get().getFullName();
                driverCode = dOpt.get().getDriverCode();
                driverMobile = dOpt.get().getMobileNumber();
            }
        } else if (v.getVehicleNumber() != null) {
            Optional<Driver> dOpt = driverRepository.findByVehicleNumber(v.getVehicleNumber());
            if (dOpt.isPresent()) {
                driverName = dOpt.get().getFullName();
                driverCode = dOpt.get().getDriverCode();
                driverMobile = dOpt.get().getMobileNumber();
            }
        }

        return VehicleResponse.builder()
                .id(v.getId())
                .vehicleNumber(v.getVehicleNumber())
                .chassisNumber(v.getChassisNumber())
                .cheNumber(v.getChassisNumber())
                .operator(v.getOperator())
                .trailerSize(v.getTrailerSize())
                .status(v.getStatus())
                .assignedDriverId(v.getAssignedDriverId())
                .driverName(driverName)
                .driverCode(driverCode)
                .driverMobile(driverMobile)
                .licenseIssuedDate(v.getLicenseIssuedDate())
                .licenseExpiryDate(v.getLicenseExpiryDate())
                .daysUntilExpiry(v.getDaysUntilExpiry())
                .renewalDue(v.isRenewalDue())
                .licenseStatus(v.getLicenseStatus())
                .portPassNumber(v.getPortPassNumber())
                .portPassIssuedDate(v.getPortPassIssuedDate())
                .portPassExpiryDate(v.getPortPassExpiryDate())
                .portPassDaysUntilExpiry(v.getPortPassDaysUntilExpiry())
                .portPassRenewalDue(v.isPortPassRenewalDue())
                .portPassStatus(v.getPortPassStatus())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 5. TRIPS & ITT OPERATIONS
    // ─────────────────────────────────────────────────────────────
    public List<TripResponse> getAllTrips(String search, String status, String terminal, String startDate, String endDate) {
        List<Trip> trips = tripRepository.findAllByOrderByCreatedAtDesc();

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                TripStatus st = TripStatus.valueOf(status.toUpperCase());
                trips = trips.stream().filter(t -> t.getStatus() == st).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        if (terminal != null && !terminal.isBlank() && !"ALL".equalsIgnoreCase(terminal)) {
            String termUpper = terminal.trim().toUpperCase();
            trips = trips.stream().filter(t ->
                    termUpper.equalsIgnoreCase(t.getSourceTerminal()) ||
                    termUpper.equalsIgnoreCase(t.getDestTerminal())
            ).collect(Collectors.toList());
        }

        if (startDate != null && !startDate.isBlank()) {
            try {
                LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
                trips = trips.stream().filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(start)).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        if (endDate != null && !endDate.isBlank()) {
            try {
                LocalDateTime end = LocalDate.parse(endDate).plusDays(1).atStartOfDay();
                trips = trips.stream().filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isBefore(end)).collect(Collectors.toList());
            } catch (Exception ignored) {}
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            trips = trips.stream().filter(t ->
                    (t.getTripNumber() != null && t.getTripNumber().toLowerCase().contains(q)) ||
                    (t.getVehicleNumber() != null && t.getVehicleNumber().toLowerCase().contains(q)) ||
                    (t.getVesselName() != null && t.getVesselName().toLowerCase().contains(q)) ||
                    (t.getContainers() != null && t.getContainers().stream().anyMatch(c -> c.getContainerNumber() != null && c.getContainerNumber().toLowerCase().contains(q)))
            ).collect(Collectors.toList());
        }

        return trips.stream().map(tripService::mapToResponse).collect(Collectors.toList());
    }

    public TripResponse getTripById(String id) {
        return tripService.getTripById(id);
    }

    @Transactional
    public TripResponse actionTrip(String id, String status, String reason) {
        TripResponse res = tripService.updateTripStatus(id, status, null, reason);

        auditLogService.log(getCurrentActorId(), "ADMIN", "ADMIN_TRIP_ACTION", "TRIP", id,
                "Admin actioned trip to status: " + status + (reason != null ? " Reason: " + reason : ""));

        return res;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. CONTAINERS
    // ─────────────────────────────────────────────────────────────
    public List<Map<String, Object>> searchContainers(String containerNumber, String size, String terminal) {
        List<Container> list = containerRepository.findAll();

        if (containerNumber != null && !containerNumber.isBlank()) {
            String q = containerNumber.trim().toLowerCase();
            list = list.stream().filter(c -> c.getContainerNumber() != null && c.getContainerNumber().toLowerCase().contains(q)).collect(Collectors.toList());
        }

        if (size != null && !size.isBlank() && !"ALL".equalsIgnoreCase(size)) {
            list = list.stream().filter(c -> {
                if (c.getSize() == null) return false;
                if ("20FT".equalsIgnoreCase(size) || "20".equals(size)) return c.getSize() == ContainerSize.FT_20;
                if ("40FT".equalsIgnoreCase(size) || "40".equals(size)) return c.getSize() == ContainerSize.FT_40;
                return c.getSize().name().equalsIgnoreCase(size);
            }).collect(Collectors.toList());
        }

        if (terminal != null && !terminal.isBlank() && !"ALL".equalsIgnoreCase(terminal)) {
            String t = terminal.trim().toUpperCase();
            list = list.stream().filter(c -> t.equalsIgnoreCase(c.getSourceTerminal()) || t.equalsIgnoreCase(c.getDestTerminal()) || t.equalsIgnoreCase(c.getUnloadedAt())).collect(Collectors.toList());
        }

        return list.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId().toString());
            map.put("containerNumber", c.getContainerNumber());
            map.put("size", c.getSize() == ContainerSize.FT_20 ? "20FT" : "40FT");
            map.put("status", c.getStatus() != null ? c.getStatus().name() : null);
            map.put("sourceTerminal", c.getSourceTerminal());
            map.put("destTerminal", c.getDestTerminal());
            map.put("unloadedAt", c.getUnloadedAt());
            map.put("tripId", c.getTrip() != null ? c.getTrip().getId().toString() : null);
            map.put("tripNumber", c.getTrip() != null ? c.getTrip().getTripNumber() : null);
            map.put("vehicleNumber", c.getTrip() != null ? c.getTrip().getVehicleNumber() : null);
            map.put("vesselName", c.getTrip() != null ? c.getTrip().getVesselName() : null);
            map.put("createdAt", c.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // 7. AUDIT LOGS
    // ─────────────────────────────────────────────────────────────
    public Page<AuditLog> getAuditLogs(int page, int size, String entityType, String action) {
        return auditLogService.getLogs(page, size, entityType, action);
    }
}
