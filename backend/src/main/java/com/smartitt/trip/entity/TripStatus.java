package com.smartitt.trip.entity;

public enum TripStatus {
    // Active workflow statuses
    DRAFT,
    IN_PROGRESS,
    PENDING_SUPERVISOR_CONFIRMATION, // driver submitted – awaiting review
    SUPERVISOR_CONFIRMED,            // reviewer approved
    SUPERVISOR_REJECTED,             // reviewer rejected

    // Semantic aliases (kept for backward compatibility)
    PENDING_VERIFICATION,            // alias for PENDING_SUPERVISOR_CONFIRMATION
    CONFIRMED,                       // alias for SUPERVISOR_CONFIRMED

    // Legacy/broader aliases
    PENDING_APPROVAL,
    APPROVED,
    COMPLETED,
    REJECTED
}
