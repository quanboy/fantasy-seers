package com.fantasyseers.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * In-memory rate limiter for auth endpoints (login/register).
 * Limits each IP to a fixed number of requests per time window.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

    /**
     * Hard cap on the number of distinct client IPs tracked at once. Prevents an
     * attacker who rotates source IPs (or spoofs X-Forwarded-For) from growing the
     * map without bound. When exceeded, expired windows are purged first.
     */
    private static final int MAX_TRACKED_IPS = 10_000;

    /**
     * Whether to derive the client IP from the X-Forwarded-For header. Only enable
     * this when the app sits behind a trusted reverse proxy that appends the real
     * client IP (e.g. Railway, nginx). When false, the direct socket address is used
     * so a client cannot forge its identity to escape the limit.
     */
    private final boolean trustForwardedFor;

    public RateLimitFilter(@Value("${security.trust-forwarded-for:false}") boolean trustForwardedFor) {
        this.trustForwardedFor = trustForwardedFor;
    }

    private final ConcurrentMap<String, RateWindow> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        long now = System.currentTimeMillis();

        if (requestCounts.size() >= MAX_TRACKED_IPS) {
            purgeExpired(now);
            if (requestCounts.size() >= MAX_TRACKED_IPS && !requestCounts.containsKey(clientIp)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
                return;
            }
        }

        RateWindow window = requestCounts.compute(clientIp, (key, existing) -> {
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RateWindow(now, 1);
            }
            existing.count++;
            return existing;
        });

        if (window.count > MAX_REQUESTS) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please try again later.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void purgeExpired(long now) {
        requestCounts.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS);
    }

    private String getClientIp(HttpServletRequest request) {
        if (trustForwardedFor) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                // Take the right-most entry: the address observed and appended by the
                // trusted proxy. Left-most entries are client-supplied and spoofable.
                String[] parts = xForwardedFor.split(",");
                String candidate = parts[parts.length - 1].trim();
                if (!candidate.isEmpty()) {
                    return candidate;
                }
            }
        }
        return request.getRemoteAddr();
    }

    private static class RateWindow {
        long windowStart;
        int count;

        RateWindow(long windowStart, int count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
