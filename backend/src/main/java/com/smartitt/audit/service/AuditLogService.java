package com.smartitt.audit.service;

import com.smartitt.audit.entity.AuditLog;
import com.smartitt.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public AuditLog logAction(UUID actorId, String actorRole, String action,
                              String entityType, String entityId, String description,
                              String oldValue, String newValue, String ipAddress) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .actorId(actorId != null ? actorId : UUID.fromString("00000000-0000-0000-0000-000000000000"))
                    .actorRole(actorRole != null ? actorRole : "SYSTEM")
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .description(description)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .ipAddress(ipAddress)
                    .build();
            return auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage(), e);
            return null;
        }
    }

    @Transactional
    public AuditLog log(UUID actorId, String actorRole, String action,
                        String entityType, String entityId, String description) {
        return logAction(actorId, actorRole, action, entityType, entityId, description, null, null, null);
    }

    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    public Page<AuditLog> getLogs(int page, int size, String entityType, String action) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findFiltered(entityType, action, pageRequest);
    }
}
