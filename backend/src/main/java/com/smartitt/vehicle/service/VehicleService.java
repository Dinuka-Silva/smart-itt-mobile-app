package com.smartitt.vehicle.service;

import com.smartitt.vehicle.dto.VehicleResponse;
import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;

    @Transactional(readOnly = true)
    public List<VehicleResponse> getAllVehicles() {
        return vehicleRepository.findAllByOrderByChassisNumberAsc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<VehicleResponse> getVehicleById(UUID id) {
        return vehicleRepository.findById(id).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Optional<VehicleResponse> getVehicleByNumber(String vehicleNumber) {
        return vehicleRepository.findByVehicleNumber(vehicleNumber).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Optional<VehicleResponse> getVehicleByChassisNumber(String chassisNumber) {
        return vehicleRepository.findByChassisNumber(chassisNumber).map(this::mapToResponse);
    }

    @Transactional
    public VehicleResponse updateVehicleStatus(UUID id, String status) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found with id: " + id));
        vehicle.setStatus(status.toUpperCase());
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle {} status updated to {}", vehicle.getVehicleNumber(), vehicle.getStatus());
        return mapToResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicleStatusByNumber(String vehicleNumber, String status) {
        Vehicle vehicle = vehicleRepository.findByVehicleNumber(vehicleNumber)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found with number: " + vehicleNumber));
        vehicle.setStatus(status.toUpperCase());
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle {} status updated to {}", vehicleNumber, vehicle.getStatus());
        return mapToResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicleStatusByChassis(String chassisNumber, String status) {
        Vehicle vehicle = vehicleRepository.findByChassisNumber(chassisNumber)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found with chassis: " + chassisNumber));
        vehicle.setStatus(status.toUpperCase());
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle {} (chassis {}) status updated to {}", vehicle.getVehicleNumber(), chassisNumber, vehicle.getStatus());
        return mapToResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicleLicense(UUID id, java.time.LocalDate issuedDate) {
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found with id: " + id));
        java.time.LocalDate issued = issuedDate != null ? issuedDate : java.time.LocalDate.now();
        vehicle.setLicenseIssuedDate(issued);
        vehicle.setLicenseExpiryDate(issued.plusYears(1)); // Valid for 1 year!
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle {} license updated: issued {}, expires {}", 
                vehicle.getVehicleNumber(), vehicle.getLicenseIssuedDate(), vehicle.getLicenseExpiryDate());
        return mapToResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicleLicenseByNumber(String vehicleNumber, java.time.LocalDate issuedDate) {
        Vehicle vehicle = vehicleRepository.findByVehicleNumber(vehicleNumber)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found with number: " + vehicleNumber));
        java.time.LocalDate issued = issuedDate != null ? issuedDate : java.time.LocalDate.now();
        vehicle.setLicenseIssuedDate(issued);
        vehicle.setLicenseExpiryDate(issued.plusYears(1)); // Valid for 1 year!
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle {} license updated: issued {}, expires {}", 
                vehicleNumber, vehicle.getLicenseIssuedDate(), vehicle.getLicenseExpiryDate());
        return mapToResponse(vehicle);
    }

    private VehicleResponse mapToResponse(Vehicle v) {
        String driverCode = null;
        String driverName = null;
        String driverMobile = null;

        if (v.getAssignedDriverId() != null) {
            Optional<Driver> driverOpt = driverRepository.findById(v.getAssignedDriverId());
            if (driverOpt.isPresent()) {
                Driver d = driverOpt.get();
                driverCode = d.getDriverCode();
                driverName = d.getFullName();
                driverMobile = d.getMobileNumber();
            }
        }

        if (driverCode == null && v.getVehicleNumber() != null) {
            Optional<Driver> driverOpt = driverRepository.findByVehicleNumber(v.getVehicleNumber());
            if (driverOpt.isPresent()) {
                Driver d = driverOpt.get();
                driverCode = d.getDriverCode();
                driverName = d.getFullName();
                driverMobile = d.getMobileNumber();
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
                .driverCode(driverCode)
                .driverName(driverName)
                .driverMobile(driverMobile)
                .licenseIssuedDate(v.getLicenseIssuedDate())
                .licenseExpiryDate(v.getLicenseExpiryDate())
                .daysUntilExpiry(v.getDaysUntilExpiry())
                .renewalDue(v.isRenewalDue())
                .licenseStatus(v.getLicenseStatus())
                .build();
    }
}
