package com.smartitt.config;

import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.supervisor.repository.SupervisorRepository;
import com.smartitt.terminal.entity.Terminal;
import com.smartitt.terminal.repository.TerminalRepository;
import com.smartitt.user.entity.AccountStatus;
import com.smartitt.user.entity.Role;
import com.smartitt.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final TerminalRepository terminalRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final SupervisorRepository supervisorRepository;
    private final VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.email:admin@smartitt.lk}")
    private String adminBootstrapEmail;

    @Value("${admin.bootstrap.password:AdminSecure@2026}")
    private String adminBootstrapPassword;

    @Value("${admin.bootstrap.name:System Administrator}")
    private String adminBootstrapName;

    @Override
    @Transactional
    public void run(String... args) {
        seedTerminals();
        seedVehicles();
        seedDemoUsers();
        bootstrapAdminAccount();
    }

    private void seedTerminals() {
        if (terminalRepository.count() == 0) {
            log.info("Seeding the 6 Sri Lankan Port Terminals...");
            List<Terminal> terminals = List.of(
                Terminal.builder().code("CICT").name("Colombo International Container Terminals").active(true).build(),
                Terminal.builder().code("CWIT").name("Colombo West International Terminal").active(true).build(),
                Terminal.builder().code("ECT").name("East Container Terminal").active(true).build(),
                Terminal.builder().code("JCT").name("Jaya Container Terminal").active(true).build(),
                Terminal.builder().code("UCT").name("Unity Container Terminal").active(true).build(),
                Terminal.builder().code("SAGT").name("South Asia Gateway Terminals").active(true).build()
            );
            terminalRepository.saveAll(terminals);
            log.info("Successfully seeded 6 terminals.");
        }
    }

    private void seedVehicles() {
        List<Vehicle> authoritativeFleet = List.of(
            // SCK Logistics Fleet (SCK 100 - 114, 125, 126, 127)
            Vehicle.builder().chassisNumber("SCK 100").vehicleNumber("LY-6439").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 101").vehicleNumber("LY-6434").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 102").vehicleNumber("LY-6435").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 103").vehicleNumber("LY-6431").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 104").vehicleNumber("LY-6427").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 105").vehicleNumber("LY-5665").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 106").vehicleNumber("LY-5708").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 107").vehicleNumber("LY-5711").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 108").vehicleNumber("LY-5717").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 109").vehicleNumber("LY-5721").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 110").vehicleNumber("LY-6426").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 111").vehicleNumber("LY-6428").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 112").vehicleNumber("LY-6438").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 113").vehicleNumber("LY-6429").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 114").vehicleNumber("LY-6433").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 125").vehicleNumber("LY-5650").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 126").vehicleNumber("LY-5654").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 127").vehicleNumber("LY-2147").operator("SCK Logistics").trailerSize("40FT").status("ACTIVE").build(),

            // SDR LINK Fleet (SCK 115, 117, 119, 120, 121)
            Vehicle.builder().chassisNumber("SCK 115").vehicleNumber("LY-6528").operator("SDR LINK").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 117").vehicleNumber("LY-6529").operator("SDR LINK").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 119").vehicleNumber("LY-6530").operator("SDR LINK").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 120").vehicleNumber("LY-6531").operator("SDR LINK").trailerSize("40FT").status("ACTIVE").build(),
            Vehicle.builder().chassisNumber("SCK 121").vehicleNumber("LY-6532").operator("SDR LINK").trailerSize("40FT").status("ACTIVE").build()
        );

        LocalDate today = LocalDate.now();

        for (Vehicle v : authoritativeFleet) {
            String pureNum = v.getChassisNumber().replace("SCK ", "").replace("CHE ", "");
            v.setPortPassNumber("SLPA-VPP-" + pureNum);
            v.setPortPassIssuedDate(today.minusMonths(5));

            // Revenue license
            if ("LY-6439".equals(v.getVehicleNumber()) || "LY-6528".equals(v.getVehicleNumber())) {
                v.setLicenseIssuedDate(today.minusYears(1).plusDays(18));
                v.setLicenseExpiryDate(v.getLicenseIssuedDate().plusYears(1));
            } else {
                v.setLicenseIssuedDate(today.minusMonths(2));
                v.setLicenseExpiryDate(v.getLicenseIssuedDate().plusYears(1));
            }

            // Port Pass Renewal Date
            if ("LY-5650".equals(v.getVehicleNumber()) || "LY-6439".equals(v.getVehicleNumber())) {
                // Due for port pass renewal in 14 days
                v.setPortPassExpiryDate(today.plusDays(14));
            } else {
                v.setPortPassExpiryDate(today.plusMonths(7));
            }

            var existingOpt = vehicleRepository.findByVehicleNumber(v.getVehicleNumber());
            if (existingOpt.isPresent()) {
                Vehicle existing = existingOpt.get();
                existing.setChassisNumber(v.getChassisNumber());
                existing.setOperator(v.getOperator());
                existing.setTrailerSize(v.getTrailerSize());
                if (existing.getStatus() == null) existing.setStatus("ACTIVE");
                existing.setPortPassNumber(v.getPortPassNumber());
                existing.setPortPassIssuedDate(v.getPortPassIssuedDate());
                existing.setPortPassExpiryDate(v.getPortPassExpiryDate());
                if (existing.getLicenseExpiryDate() == null) {
                    existing.setLicenseIssuedDate(v.getLicenseIssuedDate());
                    existing.setLicenseExpiryDate(v.getLicenseExpiryDate());
                }
                vehicleRepository.save(existing);
            } else {
                vehicleRepository.save(v);
            }
        }
        log.info("Successfully seeded and synchronized all 23 fleet vehicles with Port Pass renewal dates.");
    }


    private void seedDemoUsers() {
        // 1. Seed Supervisors for each of the 6 Port Terminals
        String[][] supData = {
            {"SUP001", "Nimal Silva", "supervisor@smartitt.lk", "0711234567", "CICT", "199012345678"},
            {"SUP002", "Bandara Weerasinghe", "bandara.cwit@smartitt.lk", "0712345678", "CWIT", "198823456789"},
            {"SUP003", "Kasun Jayawardena", "kasun.ect@smartitt.lk", "0713456789", "ECT", "199134567890"},
            {"SUP004", "Prasanna Gunasekara", "prasanna.jct@smartitt.lk", "0714567890", "JCT", "198745678901"},
            {"SUP005", "Ruwan Fernando", "ruwan.sagt@smartitt.lk", "0715678901", "SAGT", "199256789012"},
            {"SUP006", "Dinesh Perera", "dinesh.uct@smartitt.lk", "0716789012", "UCT", "198967890123"}
        };

        for (String[] s : supData) {
            String empId = s[0];
            String name = s[1];
            String email = s[2];
            String phone = s[3];
            String termCode = s[4];
            String nic = s[5];

            if (!userRepository.existsByEmail(email)) {
                Terminal term = terminalRepository.findByCode(termCode).orElse(null);
                Supervisor sup = new Supervisor();
                sup.setFullName(name);
                sup.setUsername(email);
                sup.setEmployeeId(empId);
                sup.setNic(nic);
                sup.setMobileNumber(phone);
                sup.setEmail(email);
                sup.setAddress("Port Operations Complex, " + termCode + " Terminal, Colombo");
                sup.setDateOfBirth(LocalDate.of(1990, 5, 20));
                sup.setEmergencyContactName("Port Dispatch Operations");
                sup.setEmergencyContactNumber("0112456789");
                sup.setPassword(passwordEncoder.encode("supervisor"));
                sup.setRole(Role.SUPERVISOR);
                sup.setStatus(AccountStatus.ACTIVE);
                sup.setAssignedTerminal(term);
                supervisorRepository.save(sup);
                log.info("Seeded supervisor: {} ({}) for {}", name, empId, termCode);
            }
        }

        // 2. Seed All Fleet Drivers (23 units: 18 SCK Logistics + 5 SDR LINK)
        String[][] fleetDrivers = {
            {"DRV-00001", "Kamal Perera", "driver@smartitt.lk", "DRV001", "198512345678", "0779876543", "LY-6439", "SCK 100", "LIC-001234"},
            {"DRV-00002", "Sunil Shantha", "sunil.drv@smartitt.lk", "DRV002", "198612345679", "0779876544", "LY-6434", "SCK 101", "LIC-001235"},
            {"DRV-00003", "Anura Kumara", "anura.drv@smartitt.lk", "DRV003", "198712345680", "0779876545", "LY-6435", "SCK 102", "LIC-001236"},
            {"DRV-00004", "Chaminda Vass", "chaminda.drv@smartitt.lk", "DRV004", "198812345681", "0779876546", "LY-6431", "SCK 103", "LIC-001237"},
            {"DRV-00005", "Roshan Mahanama", "roshan.drv@smartitt.lk", "DRV005", "198912345682", "0779876547", "LY-6427", "SCK 104", "LIC-001238"},
            {"DRV-00006", "Sanath Jayasuriya", "sanath.drv@smartitt.lk", "DRV006", "198412345683", "0779876548", "LY-5665", "SCK 105", "LIC-001239"},
            {"DRV-00007", "Mahela Jayawardene", "mahela.drv@smartitt.lk", "DRV007", "198512345684", "0779876549", "LY-5708", "SCK 106", "LIC-001240"},
            {"DRV-00008", "Kumar Sangakkara", "kumar.drv@smartitt.lk", "DRV008", "198612345685", "0779876550", "LY-5711", "SCK 107", "LIC-001241"},
            {"DRV-00009", "Lasith Malinga", "lasith.drv@smartitt.lk", "DRV009", "198712345686", "0779876551", "LY-5717", "SCK 108", "LIC-001242"},
            {"DRV-00010", "Muttiah Muralitharan", "murali.drv@smartitt.lk", "DRV010", "198312345687", "0779876552", "LY-5721", "SCK 109", "LIC-001243"},
            {"DRV-00011", "Nuwan Kulasekara", "nuwan.drv@smartitt.lk", "DRV011", "198612345688", "0779876553", "LY-6426", "SCK 110", "LIC-001244"},
            {"DRV-00012", "Rangana Herath", "rangana.drv@smartitt.lk", "DRV012", "198512345689", "0779876554", "LY-6428", "SCK 111", "LIC-001245"},
            {"DRV-00013", "Tillakaratne Dilshan", "dilshan.drv@smartitt.lk", "DRV013", "198412345690", "0779876555", "LY-6438", "SCK 112", "LIC-001246"},
            {"DRV-00014", "Aravinda de Silva", "aravinda.drv@smartitt.lk", "DRV014", "198212345691", "0779876556", "LY-6429", "SCK 113", "LIC-001247"},
            {"DRV-00015", "Arjuna Ranatunga", "arjuna.drv@smartitt.lk", "DRV015", "198112345692", "0779876557", "LY-6433", "SCK 114", "LIC-001248"},
            {"DRV-00016", "Upul Tharanga", "upul.drv@smartitt.lk", "DRV016", "198712345693", "0779876558", "LY-5654", "SCK 126", "LIC-001249"},
            {"DRV-00017", "Marvan Atapattu", "marvan.drv@smartitt.lk", "DRV017", "198312345694", "0779876559", "LY-2147", "SCK 127", "LIC-001250"},
            {"DRV-00018", "Angelo Mathews", "angelo.drv@smartitt.lk", "DRV018", "198712345695", "0779876560", "LY-6528", "SCK 115", "LIC-001251"},
            {"DRV-00019", "Dinesh Chandimal", "chandimal.drv@smartitt.lk", "DRV019", "198912345696", "0779876561", "LY-6529", "SCK 117", "LIC-001252"},
            {"DRV-00020", "Kusal Perera", "kusal.drv@smartitt.lk", "DRV020", "199012345697", "0779876562", "LY-6530", "SCK 119", "LIC-001253"},
            {"DRV-00021", "Wanindu Hasaranga", "wanindu.drv@smartitt.lk", "DRV021", "199712345698", "0779876563", "LY-6531", "SCK 120", "LIC-001254"},
            {"DRV-00022", "Dasun Shanaka", "dasun.drv@smartitt.lk", "DRV022", "199112345699", "0779876564", "LY-6532", "SCK 121", "LIC-001255"},
            {"DRV-00023", "Kusal Mendis", "kusal.mendis@smartitt.lk", "DRV023", "199312345677", "0779876565", "LY-5650", "SCK 125", "LIC-001256"}
        };

        LocalDate today = LocalDate.now();

        for (String[] d : fleetDrivers) {
            String code = d[0];
            String name = d[1];
            String email = d[2];
            String empId = d[3];
            String nic = d[4];
            String mobile = d[5];
            String veh = d[6];
            String che = d[7];
            String lic = d[8];

            var existingDriverOpt = driverRepository.findByDriverCode(code);
            Driver driver;
            if (existingDriverOpt.isPresent()) {
                driver = existingDriverOpt.get();
            } else {
                driver = new Driver();
                driver.setDriverCode(code);
                driver.setUsername(code);
                driver.setPassword(passwordEncoder.encode("driver"));
                driver.setRole(Role.DRIVER);
            }

            driver.setFullName(name);
            driver.setEmployeeId(empId);
            driver.setNic(nic);
            driver.setMobileNumber(mobile);
            driver.setEmail(email);
            driver.setAddress("No. " + (Integer.parseInt(empId.replace("DRV", "")) * 3) + ", Port Access Highway, Colombo");
            driver.setDateOfBirth(LocalDate.of(1985, 4, 12));
            driver.setDrivingLicenceNumber(lic);
            driver.setLicenseExpiryDate(LocalDate.of(2028, 12, 31));
            driver.setEmergencyContactName("Fleet Operations Office");
            driver.setEmergencyContactNumber("0771122334");
            driver.setStatus(AccountStatus.ACTIVE);
            driver.setVehicleNumber(veh);
            driver.setChassisNumber(che);

            // Driver Port Pass Renewal Date
            driver.setPortPassNumber("SLPA-DPP-" + empId.replace("DRV", ""));
            if ("DRV-00001".equals(code) || "DRV-00023".equals(code)) {
                // Port pass due for renewal in 10 days
                driver.setPortPassExpiryDate(today.plusDays(10));
            } else {
                driver.setPortPassExpiryDate(today.plusMonths(7));
            }

            Driver savedDriver = driverRepository.save(driver);

            // Link to Vehicle entity
            vehicleRepository.findByVehicleNumber(veh).ifPresent(v -> {
                v.setAssignedDriverId(savedDriver.getId());
                vehicleRepository.save(v);
            });
            log.info("Seeded/Synchronized driver {} ({}) with vehicle {} and Port Pass {}", name, code, veh, driver.getPortPassNumber());
        }
    }

    private void bootstrapAdminAccount() {
        if (!userRepository.existsByEmail(adminBootstrapEmail)) {
            log.info("Bootstrapping Admin account: {}", adminBootstrapEmail);
            com.smartitt.user.entity.User admin = new com.smartitt.user.entity.User();
            admin.setFullName(adminBootstrapName);
            admin.setEmail(adminBootstrapEmail);
            admin.setUsername(adminBootstrapEmail);
            admin.setEmployeeId("ADMIN001");
            admin.setNic("000000000000");
            admin.setMobileNumber("0700000000");
            admin.setPassword(passwordEncoder.encode(adminBootstrapPassword));
            admin.setRole(com.smartitt.user.entity.Role.ADMIN);
            admin.setStatus(com.smartitt.user.entity.AccountStatus.ACTIVE);
            userRepository.save(admin);
            log.info("Admin account bootstrapped: {} — CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION", adminBootstrapEmail);
        } else {
            log.debug("Admin account already exists: {}", adminBootstrapEmail);
        }
    }
}

