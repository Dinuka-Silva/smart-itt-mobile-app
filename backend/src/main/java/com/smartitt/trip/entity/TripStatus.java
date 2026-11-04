package com.smartitt.trip.entity;

public enum TripStatus {
    DRAFT,
    IN_PROGRESS,
    PENDING_SUPERVISOR_CONFIRMATION,
    SUPERVISOR_CONFIRMED,
    SUPERVISOR_REJECTED,
    // Backward compatibility aliases
    PENDING_APPROVAL,
    APPROVED,
    COMPLETED,
    REJECTED
}
