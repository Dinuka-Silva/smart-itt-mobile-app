package com.smartitt.driver.repository;

import com.smartitt.driver.entity.Driver;
import com.smartitt.user.entity.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverRepository extends JpaRepository<Driver, UUID> {
    Optional<Driver> findByDriverCode(String driverCode);

    @Query("SELECT d FROM Driver d WHERE LOWER(d.driverCode) = LOWER(:codeOrUser) OR LOWER(d.username) = LOWER(:codeOrUser) OR LOWER(d.email) = LOWER(:codeOrUser)")
    Optional<Driver> findByDriverCodeOrUsernameOrEmail(@Param("codeOrUser") String codeOrUser);

    List<Driver> findByStatus(AccountStatus status);

    boolean existsByDriverCode(String driverCode);
    boolean existsByVehicleNumber(String vehicleNumber);
    Optional<Driver> findByVehicleNumber(String vehicleNumber);
    boolean existsByDrivingLicenceNumber(String licenceNumber);

    @Query("SELECT MAX(d.driverCode) FROM Driver d WHERE d.driverCode LIKE 'DRV-%'")
    Optional<String> findMaxDriverCode();
}
