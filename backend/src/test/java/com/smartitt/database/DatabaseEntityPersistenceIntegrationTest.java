package com.smartitt.database;

import com.smartitt.BaseIntegrationTest;
import com.smartitt.container.entity.Container;
import com.smartitt.container.entity.ContainerSize;
import com.smartitt.container.entity.ContainerStatus;
import com.smartitt.container.repository.ContainerRepository;
import com.smartitt.driver.entity.Driver;
import com.smartitt.driver.repository.DriverRepository;
import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import com.smartitt.trip.repository.TripRepository;
import com.smartitt.vehicle.entity.Vehicle;
import com.smartitt.vehicle.repository.VehicleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Database Entity Persistence & JPA Integration Tests")
@Transactional
class DatabaseEntityPersistenceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private ContainerRepository containerRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Test
    @DisplayName("Trip and Container entities should persist with correct relational associations and defaults")
    void testTripAndContainerPersistence() {
        // Find existing seeded driver
        Optional<Driver> driverOpt = driverRepository.findByDriverCode("DRV-00001");
        assertTrue(driverOpt.isPresent(), "Seeded driver DRV-00001 should exist");
        Driver driver = driverOpt.get();

        // Create and persist a Trip
        Trip trip = Trip.builder()
                .tripNumber("ITT-TEST-9001")
                .driverId(driver.getId())
                .vehicleNumber("LY-6439")
                .chassisNumber("SCK 100")
                .vesselName("MV Colombo Express")
                .sourceTerminal("CICT")
                .destTerminal("JCT")
                .status(TripStatus.PENDING_APPROVAL)
                .startTime(LocalDateTime.now())
                .build();

        Trip savedTrip = tripRepository.save(trip);
        assertNotNull(savedTrip.getId(), "Persisted trip must have a generated UUID");
        assertEquals("ITT-TEST-9001", savedTrip.getTripNumber());

        // Create and persist associated Container
        Container container = Container.builder()
                .trip(savedTrip)
                .containerNumber("MSCU9988776")
                .size(ContainerSize.FT_40)
                .status(ContainerStatus.LOADED)
                .sourceTerminal("CICT")
                .destTerminal("JCT")
                .isVerified(true)
                .build();

        Container savedContainer = containerRepository.save(container);
        assertNotNull(savedContainer.getId(), "Persisted container must have a generated UUID");
        assertEquals("MSCU9988776", savedContainer.getContainerNumber());

        // Verify repository query methods
        Optional<Trip> fetchedTrip = tripRepository.findById(savedTrip.getId());
        assertTrue(fetchedTrip.isPresent());
        assertEquals(TripStatus.PENDING_APPROVAL, fetchedTrip.get().getStatus());

        boolean existsOnTrip = containerRepository.existsByContainerNumberAndTripId("MSCU9988776", savedTrip.getId());
        assertTrue(existsOnTrip, "Container should be recognized as associated with the saved trip");
    }

    @Test
    @DisplayName("Vehicle persistence and status updates should reflect in database repository queries")
    void testVehiclePersistenceAndQuery() {
        String testPlate = "TEST-PLATE-99";
        Vehicle vehicle = Vehicle.builder()
                .vehicleNumber(testPlate)
                .chassisNumber("SCK-TEST-99")
                .status("ACTIVE")
                .operator("SCK Logistics")
                .build();

        Vehicle saved = vehicleRepository.save(vehicle);
        assertNotNull(saved.getId());

        Optional<Vehicle> found = vehicleRepository.findByVehicleNumber(testPlate);
        assertTrue(found.isPresent());
        assertEquals("SCK-TEST-99", found.get().getChassisNumber());
        assertEquals("ACTIVE", found.get().getStatus());

        // Update status to MAINTENANCE
        found.get().setStatus("MAINTENANCE");
        vehicleRepository.save(found.get());

        Vehicle updated = vehicleRepository.findByVehicleNumber(testPlate).orElseThrow();
        assertEquals("MAINTENANCE", updated.getStatus());
    }

    @Test
    @DisplayName("Driver repository should retrieve active drivers and resolve by driver code")
    void testDriverRepositoryQueries() {
        Optional<Driver> driver = driverRepository.findByDriverCode("DRV-00001");
        assertTrue(driver.isPresent());
        assertNotNull(driver.get().getMobileNumber());
        assertNotNull(driver.get().getDrivingLicenceNumber());

        List<Driver> activeDrivers = driverRepository.findByStatus(com.smartitt.user.entity.AccountStatus.ACTIVE);
        assertFalse(activeDrivers.isEmpty(), "Active driver roster should have seeded records");
    }
}
