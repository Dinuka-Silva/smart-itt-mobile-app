package com.smartitt.vehicle.service;

import com.smartitt.vehicle.dto.VehicleResponse;
import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;
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

    private VehicleResponse mapToResponse(Vehicle v) {
        return VehicleResponse.builder()
                .id(v.getId())
                .vehicleNumber(v.getVehicleNumber())
                .chassisNumber(v.getChassisNumber())
                .cheNumber(v.getChassisNumber())
                .operator(v.getOperator())
                .trailerSize(v.getTrailerSize())
                .status(v.getStatus())
                .assignedDriverId(v.getAssignedDriverId())
                .build();
    }
}
