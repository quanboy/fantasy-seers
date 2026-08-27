package com.fantasyseers.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rejects oversized request bodies to /api/** before Spring deserializes them.
 * Without this, an attacker could POST a huge JSON payload that Jackson expands
 * into memory (and bean validation only fires after deserialization), OOMing the
 * process. Board saves and profile updates are all well under a few KB, so a small
 * cap is safe.
 */
@Component
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private static final long MAX_BODY_BYTES = 512 * 1024; // 512 KB

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (request.getRequestURI().startsWith("/api/")) {
            long declared = request.getContentLengthLong();
            if (declared > MAX_BODY_BYTES) {
                response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Request body too large.\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
