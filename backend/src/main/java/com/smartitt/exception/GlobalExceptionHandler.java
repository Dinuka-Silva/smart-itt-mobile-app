package com.smartitt.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@lombok.extern.slf4j.Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        log.warn("ResponseStatusException: {}", ex.getMessage());
        return buildError(ex.getStatusCode().value(), ex.getReason());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors()
                .stream().map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("Validation error: {}", message);
        return buildError(HttpStatus.BAD_REQUEST.value(), message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled server exception:", ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR.value(), ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName());
    }

    private ResponseEntity<Map<String, Object>> buildError(int status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
