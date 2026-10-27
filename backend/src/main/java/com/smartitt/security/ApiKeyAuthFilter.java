package com.smartitt.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter that verifies the X-API-KEY header for capable API security.
 * Can be strictly enforced in production by setting security.require-api-key=true.
 */
@Slf4j
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    @Value("${security.api-key:smart-itt-sec-key-prod-2026}")
    private String expectedApiKey;

    @Value("${security.require-api-key:false}")
    private boolean requireApiKey;

    public static final String API_KEY_HEADER = "X-API-KEY";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Bypass documentation and diagnostic endpoints
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || path.startsWith("/api-docs") || path.startsWith("/h2-console")) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader(API_KEY_HEADER);
        if (!StringUtils.hasText(providedKey)) {
            providedKey = request.getParameter("api_key");
        }

        if (requireApiKey) {
            if (!StringUtils.hasText(providedKey) || !expectedApiKey.equals(providedKey)) {
                log.warn("Blocked request to {} with invalid or missing API key", path);
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-API-KEY header\"}");
                return;
            }
        } else if (StringUtils.hasText(providedKey) && expectedApiKey.equals(providedKey)) {
            request.setAttribute("apiKeyAuthenticated", Boolean.TRUE);
            if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() == null) {
                var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                    "apiKeySystemUser",
                    null,
                    java.util.List.of(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"),
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SUPERVISOR"),
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_DRIVER")
                    )
                );
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
