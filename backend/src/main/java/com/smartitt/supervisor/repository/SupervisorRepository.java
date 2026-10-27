package com.smartitt.supervisor.repository;

import com.smartitt.supervisor.entity.Supervisor;
import com.smartitt.user.entity.AccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupervisorRepository extends JpaRepository<Supervisor, UUID> {
    List<Supervisor> findByStatus(AccountStatus status);
    Optional<Supervisor> findByEmployeeId(String employeeId);
    Optional<Supervisor> findByEmail(String email);
    Optional<Supervisor> findByUsername(String username);
    boolean existsByEmployeeId(String employeeId);
}
