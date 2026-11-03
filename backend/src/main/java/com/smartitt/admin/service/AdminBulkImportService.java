package com.smartitt.admin.service;

import com.smartitt.admin.dto.BulkImportResult;
import com.smartitt.audit.service.AuditLogService;
import com.smartitt.common.util.PasswordGenerator;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.supervisor.repository.SupervisorRepository;
import com.smartitt.terminal.repository.TerminalRepository;
import com.smartitt.user.entity.AccountStatus;
import com.smartitt.user.entity.Role;
import com.smartitt.user.entity.User;
import com.smartitt.user.repository.UserRepository;
import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminBulkImportService {

    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final SupervisorRepository supervisorRepository;
    private final VehicleRepository vehicleRepository;
    private final TerminalRepository terminalRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private static final Pattern NIC_PATTERN = Pattern.compile("^([0-9]{9}[vVxX]|[0-9]{12})$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^(\\+94|0)[0-9]{9}$");

    private UUID getCurrentActorId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u.getId();
            }
        } catch (Exception ignored) {}
        return UUID.fromString("00000000-0000-0000-0000-000000000000");
    }

    private String getCurrentActorUsername() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User u) {
                return u.getUsername() != null ? u.getUsername() : u.getFullName();
            }
        } catch (Exception ignored) {}
        return "admin";
    }

    // ─────────────────────────────────────────────────────────────
    // 1. DRIVERS IMPORT
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public BulkImportResult importDrivers(MultipartFile file) {
        List<Map<String, String>> rows = parseFile(file);
        BulkImportResult result = BulkImportResult.builder()
                .totalRows(rows.size())
                .errors(new ArrayList<>())
                .credentials(new ArrayList<>())
                .build();

        Set<String> seenEmpIds = new HashSet<>();
        Set<String> seenNics = new HashSet<>();
        Set<String> seenMobiles = new HashSet<>();
        Set<String> seenLicenses = new HashSet<>();

        int importedCount = 0;
        int failedCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            int rowNum = i + 2; // Row 1 is header
            Map<String, String> row = rows.get(i);

            String fullName = getVal(row, "fullname", "name");
            String employeeId = getVal(row, "employeeid", "empid");
            String nic = getVal(row, "nic", "nicnumber");
            String mobileNumber = getVal(row, "mobilenumber", "mobile", "phone");
            String licenseNumber = getVal(row, "drivinglicencenumber", "licensenumber", "licenseno");
            String vehicleNumber = getVal(row, "vehiclenumber", "vehicle");
            String chassisNumber = getVal(row, "chassisNumber", "chassis");
            String address = getVal(row, "address");
            String licenseExpiryStr = getVal(row, "licenseexpirydate", "licenseexpiry");

            List<BulkImportResult.RowError> rowErrors = new ArrayList<>();

            if (fullName.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "fullName", fullName, "Full Name is required"));
            }
            if (employeeId.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "employeeId", employeeId, "Employee ID is required"));
            } else if (seenEmpIds.contains(employeeId.toUpperCase()) || userRepository.existsByEmployeeId(employeeId.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "employeeId", employeeId, "Duplicate Employee ID"));
            }

            if (nic.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "NIC is required"));
            } else if (!NIC_PATTERN.matcher(nic).matches()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "Invalid NIC format (requires 9 digits + V/X or 12 digits)"));
            } else if (seenNics.contains(nic.toUpperCase()) || userRepository.existsByNic(nic.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "Duplicate NIC"));
            }

            if (mobileNumber.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Mobile number is required"));
            } else if (!PHONE_PATTERN.matcher(mobileNumber.replace(" ", "")).matches()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Invalid mobile format (e.g. 0771234567 or +94771234567)"));
            } else if (seenMobiles.contains(mobileNumber) || userRepository.existsByMobileNumber(mobileNumber)) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Duplicate mobile number"));
            }

            if (licenseNumber.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "drivingLicenceNumber", licenseNumber, "License number is required"));
            } else if (seenLicenses.contains(licenseNumber.toUpperCase()) || driverRepository.existsByDrivingLicenceNumber(licenseNumber.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "drivingLicenceNumber", licenseNumber, "Duplicate license number"));
            }

            LocalDate licenseExpiry = null;
            if (!licenseExpiryStr.isBlank()) {
                try {
                    licenseExpiry = LocalDate.parse(licenseExpiryStr);
                } catch (DateTimeParseException e) {
                    rowErrors.add(new BulkImportResult.RowError(rowNum, "licenseExpiryDate", licenseExpiryStr, "Invalid date format (must be YYYY-MM-DD)"));
                }
            }

            if (!rowErrors.isEmpty()) {
                result.getErrors().addAll(rowErrors);
                failedCount++;
                continue;
            }

            // Valid row: create driver
            seenEmpIds.add(employeeId.toUpperCase());
            seenNics.add(nic.toUpperCase());
            seenMobiles.add(mobileNumber);
            seenLicenses.add(licenseNumber.toUpperCase());

            String driverCode = generateNextDriverCode();
            String rawPassword = PasswordGenerator.generateTemporaryPassword();

            Driver driver = new Driver();
            driver.setFullName(fullName);
            driver.setEmployeeId(employeeId.toUpperCase());
            driver.setDriverCode(driverCode);
            driver.setUsername(driverCode);
            driver.setNic(nic.toUpperCase());
            driver.setMobileNumber(mobileNumber);
            driver.setEmail(driverCode.toLowerCase() + "@smartitt.lk");
            driver.setPassword(passwordEncoder.encode(rawPassword));
            driver.setMustChangePassword(true);
            driver.setCreatedBy(getCurrentActorUsername());
            driver.setRole(Role.DRIVER);
            driver.setStatus(AccountStatus.ACTIVE);
            driver.setDrivingLicenceNumber(licenseNumber.toUpperCase());
            driver.setVehicleNumber(!vehicleNumber.isBlank() ? vehicleNumber.toUpperCase() : null);
            driver.setChassisNumber(!chassisNumber.isBlank() ? chassisNumber.toUpperCase() : null);
            driver.setAddress(!address.isBlank() ? address : null);
            driver.setLicenseExpiryDate(licenseExpiry != null ? licenseExpiry : LocalDate.now().plusYears(1));

            Driver saved = driverRepository.save(driver);

            if (!vehicleNumber.isBlank()) {
                vehicleRepository.findByVehicleNumber(vehicleNumber.toUpperCase()).ifPresent(v -> {
                    v.setAssignedDriverId(saved.getId());
                    vehicleRepository.save(v);
                });
            }

            result.getCredentials().add(BulkImportResult.ImportedCredential.builder()
                    .username(driverCode)
                    .temporaryPassword(rawPassword)
                    .role("DRIVER")
                    .employeeId(employeeId.toUpperCase())
                    .fullName(fullName)
                    .build());

            importedCount++;
        }

        result.setImportedCount(importedCount);
        result.setFailedCount(failedCount);

        auditLogService.log(getCurrentActorId(), "ADMIN", "BULK_IMPORT_DRIVERS", "DRIVER", "BULK",
                "Bulk imported drivers: " + importedCount + " successful, " + failedCount + " failed");

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SUPERVISORS IMPORT
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public BulkImportResult importSupervisors(MultipartFile file) {
        List<Map<String, String>> rows = parseFile(file);
        BulkImportResult result = BulkImportResult.builder()
                .totalRows(rows.size())
                .errors(new ArrayList<>())
                .credentials(new ArrayList<>())
                .build();

        Set<String> seenEmpIds = new HashSet<>();
        Set<String> seenNics = new HashSet<>();
        Set<String> seenMobiles = new HashSet<>();

        int importedCount = 0;
        int failedCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            int rowNum = i + 2;
            Map<String, String> row = rows.get(i);

            String fullName = getVal(row, "fullname", "name");
            String employeeId = getVal(row, "employeeid", "empid");
            String nic = getVal(row, "nic", "nicnumber");
            String mobileNumber = getVal(row, "mobilenumber", "mobile", "phone");
            String terminalCode = getVal(row, "terminalcode", "terminal");
            String address = getVal(row, "address");

            List<BulkImportResult.RowError> rowErrors = new ArrayList<>();

            if (fullName.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "fullName", fullName, "Full Name is required"));
            }
            if (employeeId.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "employeeId", employeeId, "Employee ID is required"));
            } else if (seenEmpIds.contains(employeeId.toUpperCase()) || userRepository.existsByEmployeeId(employeeId.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "employeeId", employeeId, "Duplicate Employee ID"));
            }

            if (nic.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "NIC is required"));
            } else if (!NIC_PATTERN.matcher(nic).matches()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "Invalid NIC format (requires 9 digits + V/X or 12 digits)"));
            } else if (seenNics.contains(nic.toUpperCase()) || userRepository.existsByNic(nic.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "nic", nic, "Duplicate NIC"));
            }

            if (mobileNumber.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Mobile number is required"));
            } else if (!PHONE_PATTERN.matcher(mobileNumber.replace(" ", "")).matches()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Invalid mobile format (e.g. 0771234567 or +94771234567)"));
            } else if (seenMobiles.contains(mobileNumber) || userRepository.existsByMobileNumber(mobileNumber)) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "mobileNumber", mobileNumber, "Duplicate mobile number"));
            }

            if (!rowErrors.isEmpty()) {
                result.getErrors().addAll(rowErrors);
                failedCount++;
                continue;
            }

            seenEmpIds.add(employeeId.toUpperCase());
            seenNics.add(nic.toUpperCase());
            seenMobiles.add(mobileNumber);

            String rawPassword = PasswordGenerator.generateTemporaryPassword();
            Supervisor sup = new Supervisor();
            sup.setFullName(fullName);
            sup.setEmployeeId(employeeId.toUpperCase());
            sup.setUsername(employeeId.toUpperCase());
            sup.setNic(nic.toUpperCase());
            sup.setMobileNumber(mobileNumber);
            sup.setEmail(employeeId.toLowerCase() + "@smartitt.lk");
            sup.setPassword(passwordEncoder.encode(rawPassword));
            sup.setMustChangePassword(true);
            sup.setCreatedBy(getCurrentActorUsername());
            sup.setRole(Role.SUPERVISOR);
            sup.setStatus(AccountStatus.ACTIVE);
            sup.setAddress(!address.isBlank() ? address : null);

            if (!terminalCode.isBlank()) {
                terminalRepository.findByCode(terminalCode.toUpperCase()).ifPresent(sup::setAssignedTerminal);
            }

            supervisorRepository.save(sup);

            result.getCredentials().add(BulkImportResult.ImportedCredential.builder()
                    .username(employeeId.toUpperCase())
                    .temporaryPassword(rawPassword)
                    .role("SUPERVISOR")
                    .employeeId(employeeId.toUpperCase())
                    .fullName(fullName)
                    .build());

            importedCount++;
        }

        result.setImportedCount(importedCount);
        result.setFailedCount(failedCount);

        auditLogService.log(getCurrentActorId(), "ADMIN", "BULK_IMPORT_SUPERVISORS", "SUPERVISOR", "BULK",
                "Bulk imported supervisors: " + importedCount + " successful, " + failedCount + " failed");

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. VEHICLES IMPORT
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public BulkImportResult importVehicles(MultipartFile file) {
        List<Map<String, String>> rows = parseFile(file);
        BulkImportResult result = BulkImportResult.builder()
                .totalRows(rows.size())
                .errors(new ArrayList<>())
                .credentials(new ArrayList<>())
                .build();

        Set<String> seenVehicles = new HashSet<>();
        int importedCount = 0;
        int failedCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            int rowNum = i + 2;
            Map<String, String> row = rows.get(i);

            String vehicleNumber = getVal(row, "vehiclenumber", "vehicle", "platenumber");
            String chassisNumber = getVal(row, "chassisnumber", "chassis", "chenumber");
            String operator = getVal(row, "operator");
            String trailerSize = getVal(row, "trailersize", "size");
            String portPassNumber = getVal(row, "portpassnumber", "portpass");
            String portPassExpStr = getVal(row, "portpassexpirydate", "portpassexpiry");
            String licenseExpStr = getVal(row, "licenseexpirydate", "licenseexpiry");

            List<BulkImportResult.RowError> rowErrors = new ArrayList<>();

            if (vehicleNumber.isBlank()) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "vehicleNumber", vehicleNumber, "Vehicle number is required"));
            } else if (seenVehicles.contains(vehicleNumber.toUpperCase()) || vehicleRepository.existsByVehicleNumber(vehicleNumber.toUpperCase())) {
                rowErrors.add(new BulkImportResult.RowError(rowNum, "vehicleNumber", vehicleNumber, "Duplicate vehicle number"));
            }

            LocalDate portPassExp = null;
            if (!portPassExpStr.isBlank()) {
                try {
                    portPassExp = LocalDate.parse(portPassExpStr);
                } catch (DateTimeParseException e) {
                    rowErrors.add(new BulkImportResult.RowError(rowNum, "portPassExpiryDate", portPassExpStr, "Invalid date format (must be YYYY-MM-DD)"));
                }
            }

            LocalDate licenseExp = null;
            if (!licenseExpStr.isBlank()) {
                try {
                    licenseExp = LocalDate.parse(licenseExpStr);
                } catch (DateTimeParseException e) {
                    rowErrors.add(new BulkImportResult.RowError(rowNum, "licenseExpiryDate", licenseExpStr, "Invalid date format (must be YYYY-MM-DD)"));
                }
            }

            if (!rowErrors.isEmpty()) {
                result.getErrors().addAll(rowErrors);
                failedCount++;
                continue;
            }

            seenVehicles.add(vehicleNumber.toUpperCase());

            Vehicle v = Vehicle.builder()
                    .vehicleNumber(vehicleNumber.toUpperCase())
                    .chassisNumber(!chassisNumber.isBlank() ? chassisNumber.toUpperCase() : null)
                    .operator(!operator.isBlank() ? operator : "SCK Logistics")
                    .trailerSize(!trailerSize.isBlank() ? trailerSize.toUpperCase() : "40FT")
                    .status("ACTIVE")
                    .licenseIssuedDate(LocalDate.now().minusMonths(1))
                    .licenseExpiryDate(licenseExp != null ? licenseExp : LocalDate.now().plusYears(1))
                    .portPassIssuedDate(LocalDate.now().minusMonths(1))
                    .portPassExpiryDate(portPassExp != null ? portPassExp : LocalDate.now().plusYears(1))
                    .portPassNumber(!portPassNumber.isBlank() ? portPassNumber : null)
                    .build();

            vehicleRepository.save(v);
            importedCount++;
        }

        result.setImportedCount(importedCount);
        result.setFailedCount(failedCount);

        auditLogService.log(getCurrentActorId(), "ADMIN", "BULK_IMPORT_VEHICLES", "VEHICLE", "BULK",
                "Bulk imported vehicles: " + importedCount + " successful, " + failedCount + " failed");

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. TEMPLATES
    // ─────────────────────────────────────────────────────────────
    public String getTemplateCsv(String type) {
        String cleanType = type != null ? type.trim().toLowerCase() : "drivers";
        return switch (cleanType) {
            case "supervisors" ->
                "fullName,employeeId,nic,mobileNumber,terminalCode,address\n" +
                "Nimal Perera,SUP-00100,198512345678,0771234567,CICT,Colombo Port Yard 1\n" +
                "# Description: fullName(Required), employeeId(Required unique), nic(Required 9+V/12 digits), mobileNumber(Required 10 digits), terminalCode(Optional: CICT/CWIT/ECT/JCT/SAGT/UCT), address(Optional)";
            case "vehicles" ->
                "vehicleNumber,chassisNumber,operator,trailerSize,portPassNumber,portPassExpiryDate,licenseExpiryDate\n" +
                "WP-LY-5544,SCK 201,SCK Logistics,40FT,SLPA-VPP-201,2027-10-31,2027-10-31\n" +
                "# Description: vehicleNumber(Required unique), chassisNumber(Optional), operator(Optional SCK Logistics/SDR LINK), trailerSize(Optional 20FT/40FT), portPassNumber(Optional), dates(YYYY-MM-DD)";
            default ->
                "fullName,employeeId,nic,mobileNumber,drivingLicenceNumber,vehicleNumber,chassisNumber,address,licenseExpiryDate\n" +
                "Kasun Silva,EMP-00101,199012345678,0779876543,B1234567,WP-LY-5544,SCK 201,123 Port Access Road Colombo 13,2028-12-31\n" +
                "# Description: fullName(Required), employeeId(Required unique), nic(Required 9+V/12 digits), mobileNumber(Required 10 digits), drivingLicenceNumber(Required unique), vehicleNumber(Optional), chassisNumber(Optional), address(Optional), licenseExpiryDate(YYYY-MM-DD)";
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 5. PARSING HELPER (CSV + XLSX)
    // ─────────────────────────────────────────────────────────────
    private List<Map<String, String>> parseFile(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return parseExcel(file);
        } else {
            return parseCsv(file);
        }
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            String[] headers = null;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                for (int i = 0; i < parts.length; i++) {
                    parts[i] = parts[i].trim().replaceAll("^\"|\"$", "");
                }

                if (headers == null) {
                    headers = new String[parts.length];
                    for (int i = 0; i < parts.length; i++) {
                        headers[i] = parts[i].toLowerCase().replaceAll("[^a-z0-9]", "");
                    }
                } else {
                    Map<String, String> row = new HashMap<>();
                    for (int i = 0; i < headers.length && i < parts.length; i++) {
                        row.put(headers[i], parts[i]);
                    }
                    rows.add(row);
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse CSV file: {}", e.getMessage());
        }
        return rows;
    }

    private List<Map<String, String>> parseExcel(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            List<String> headers = new ArrayList<>();

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (row == null) continue;

                if (headers.isEmpty()) {
                    for (Cell cell : row) {
                        headers.add(getCellValue(cell).toLowerCase().replaceAll("[^a-z0-9]", ""));
                    }
                } else {
                    Map<String, String> rowMap = new HashMap<>();
                    boolean allEmpty = true;
                    for (int i = 0; i < headers.size(); i++) {
                        Cell cell = row.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                        String val = cell != null ? getCellValue(cell) : "";
                        if (!val.isBlank()) allEmpty = false;
                        rowMap.put(headers.get(i), val);
                    }
                    if (!allEmpty && !rowMap.values().stream().allMatch(String::isBlank)) {
                        rows.add(rowMap);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Excel file: {}", e.getMessage());
        }
        return rows;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                } else {
                    double num = cell.getNumericCellValue();
                    if (num == Math.floor(num)) {
                        yield String.valueOf((long) num);
                    } else {
                        yield String.valueOf(num);
                    }
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private String getVal(Map<String, String> row, String... keys) {
        for (String k : keys) {
            String clean = k.toLowerCase().replaceAll("[^a-z0-9]", "");
            if (row.containsKey(clean) && row.get(clean) != null) {
                return row.get(clean).trim();
            }
        }
        return "";
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
}
