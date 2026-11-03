package com.smartitt.container.photo.repository;

import com.smartitt.container.photo.entity.ContainerPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContainerPhotoRepository extends JpaRepository<ContainerPhoto, UUID> {

    List<ContainerPhoto> findByTripIdAndDeletedFalseOrderByUploadedAtDesc(UUID tripId);

    List<ContainerPhoto> findByContainerIdAndDeletedFalseOrderByUploadedAtDesc(UUID containerId);

    Optional<ContainerPhoto> findFirstByTripIdAndContainerNumberAndDeletedFalseOrderByUploadedAtDesc(UUID tripId, String containerNumber);

    List<ContainerPhoto> findByDeletedFalseOrderByUploadedAtDesc();

    long countByDeletedFalse();

    @Query("SELECT COALESCE(SUM(p.sizeBytes), 0) FROM ContainerPhoto p WHERE p.deleted = false")
    Long sumSizeBytesWhereDeletedFalse();
}
