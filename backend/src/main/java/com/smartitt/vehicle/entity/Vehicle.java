package com.smartitt.vehicle.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(
            name = "UUID",
            strategy = "org.hibernate.id.UUIDGenerator"
    )
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "vehicle_number", nullable = false, unique = true, length = 50)
    private String vehicleNumber; // LY number (e.g., "LY 5234")

    @Column(name = "chassis_number", nullable = false, unique = true, length = 100)
    private String chassisNumber; // SCK number / CHE number (e.g., "SCK 100")

    @Column(name = "operator", length = 100)
    @Builder.Default
    private String operator = "SCK Logistics"; // "SCK Logistics", "SDR LINK"

    @Column(name = "trailer_size", length = 20)
    @Builder.Default
    private String trailerSize = "40FT"; // "40FT"

    @Column(name = "assigned_driver_id")
    private UUID assignedDriverId;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE, IN_TRANSIT, INACTIVE

    @Column(name = "license_issued_date")
    private java.time.LocalDate licenseIssuedDate;

    @Column(name = "license_expiry_date")
    private java.time.LocalDate licenseExpiryDate;

    @Column(name = "port_pass_number", length = 50)
    private String portPassNumber;

    @Column(name = "port_pass_issued_date")
    private java.time.LocalDate portPassIssuedDate;

    @Column(name = "port_pass_expiry_date")
    private java.time.LocalDate portPassExpiryDate; // Vehicle Port Pass Renewal Date

    public Long getDaysUntilExpiry() {
        if (licenseExpiryDate == null) return null;
        return java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), licenseExpiryDate);
    }

    public boolean isRenewalDue() {
        Long days = getDaysUntilExpiry();
        return days != null && days <= 30; // within 1 month
    }

    public String getLicenseStatus() {
        Long days = getDaysUntilExpiry();
        if (days == null) return "UNKNOWN";
        if (days < 0) return "EXPIRED";
        if (days <= 30) return "RENEWAL_DUE";
        return "VALID";
    }

    public Long getPortPassDaysUntilExpiry() {
        if (portPassExpiryDate == null) return null;
        return java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.now(), portPassExpiryDate);
    }

    public boolean isPortPassRenewalDue() {
        Long days = getPortPassDaysUntilExpiry();
        return days != null && days <= 30; // within 1 month
    }

    public String getPortPassStatus() {
        Long days = getPortPassDaysUntilExpiry();
        if (days == null) return "UNKNOWN";
        if (days < 0) return "EXPIRED";
        if (days <= 30) return "RENEWAL_DUE";
        return "VALID";
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
