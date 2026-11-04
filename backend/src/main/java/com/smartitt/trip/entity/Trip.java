package com.smartitt.trip.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String tripNumber;

    @Column(name = "driver_id")
    private UUID driverId;

    private String vehicleNumber;

    @Column(nullable = false)
    private String vesselName;

    private String chassisNumber;

    @Column(nullable = false, length = 10)
    private String sourceTerminal;

    @Column(nullable = false, length = 10)
    private String destTerminal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TripStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Column(name = "duration_minutes")
    private Long durationMinutes;

    @Column(name = "discharge_bay")
    private String dischargeBay;

    @Column(name = "seal_status")
    private String sealStatus;

    @Column(name = "damage_status")
    private String damageStatus;

    @Column(name = "driver_completion_notes", columnDefinition = "TEXT")
    private String driverCompletionNotes;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @Column(name = "supervisor_name")
    private String supervisorName;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    @Builder.Default
    private List<com.smartitt.container.entity.Container> containers = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (startTime == null) startTime = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
