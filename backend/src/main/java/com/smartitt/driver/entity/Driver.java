package com.smartitt.driver.entity;

import com.smartitt.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "drivers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Driver extends User {

    @Column(unique = true, length = 30)
    private String driverCode;

    @Column(nullable = false, unique = true, length = 50)
    private String drivingLicenceNumber;

    private LocalDate licenseExpiryDate;

    @Column(length = 50)
    private String vehicleNumber;

    @Column(name = "chassis_number", length = 50)
    private String chassisNumber; // SCK number / CHE number (e.g., "SCK 100")

    @Column(name = "port_pass_number", length = 50)
    private String portPassNumber;

    @Column(name = "port_pass_expiry_date")
    private LocalDate portPassExpiryDate; // Driver Port Pass Renewal Date

    public Long getPortPassDaysUntilExpiry() {
        if (portPassExpiryDate == null) return null;
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), portPassExpiryDate);
    }

    public boolean isPortPassRenewalDue() {
        Long days = getPortPassDaysUntilExpiry();
        return days != null && days <= 30;
    }

    public String getPortPassStatus() {
        Long days = getPortPassDaysUntilExpiry();
        if (days == null) return "UNKNOWN";
        if (days < 0) return "EXPIRED";
        if (days <= 30) return "RENEWAL_DUE";
        return "VALID";
    }
}

