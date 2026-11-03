package com.smartitt.user.repository;

import com.smartitt.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeId(String employeeId);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(u.email) = LOWER(:identifier) OR LOWER(u.employeeId) = LOWER(:identifier)")
    Optional<User> findByIdentifier(@Param("identifier") String identifier);

    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    boolean existsByEmail(String email);
    boolean existsByEmployeeId(String employeeId);
    boolean existsByNic(String nic);
    boolean existsByMobileNumber(String mobileNumber);
}
