package com.smartitt.trip.repository;

import com.smartitt.trip.entity.Trip;
import com.smartitt.trip.entity.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID> {

    List<Trip> findByDriverIdOrderByCreatedAtDesc(UUID driverId);

    List<Trip> findByStatusOrderByCreatedAtDesc(TripStatus status);

    List<Trip> findByDriverIdAndStatusOrderByCreatedAtDesc(UUID driverId, TripStatus status);

    List<Trip> findAllByOrderByCreatedAtDesc();

    @Query("SELECT t FROM Trip t WHERE t.createdAt BETWEEN :start AND :end ORDER BY t.createdAt DESC")
    List<Trip> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByStatus(TripStatus status);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.createdAt BETWEEN :start AND :end")
    long countTodayTrips(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.sourceTerminal = :terminal AND t.createdAt BETWEEN :start AND :end")
    long countBySourceTerminalToday(@Param("terminal") String terminal, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByDriverIdAndStatus(UUID driverId, TripStatus status);

    @Query("SELECT COUNT(t) FROM Trip t WHERE t.driverId = :driverId AND (t.status = 'COMPLETED' OR t.status = 'APPROVED' OR t.status = 'SUPERVISOR_CONFIRMED') AND t.createdAt BETWEEN :start AND :end")
    long countCompletedTodayByDriver(@Param("driverId") UUID driverId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT t FROM Trip t WHERE t.driverId = :driverId AND (t.status = 'IN_PROGRESS' OR t.status = 'DRAFT' OR t.status = 'PENDING_APPROVAL' OR t.status = 'PENDING_SUPERVISOR_CONFIRMATION') ORDER BY t.createdAt DESC")
    List<Trip> findActiveTripsByDriver(@Param("driverId") UUID driverId);
}
