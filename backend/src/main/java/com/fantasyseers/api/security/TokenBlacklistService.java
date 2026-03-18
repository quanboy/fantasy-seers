package com.fantasyseers.api.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory token blacklist. Stores revoked JWT tokens until they naturally expire.
 * Expired entries are purged every 10 minutes to prevent unbounded growth.
 */
@Service
public class TokenBlacklistService {

    // token → expiry timestamp in millis
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    public void blacklist(String token, long expiryMillis) {
        blacklist.put(token, expiryMillis);
    }

    public boolean isBlacklisted(String token) {
        return blacklist.containsKey(token);
    }

    @Scheduled(fixedRate = 600_000) // every 10 minutes
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        blacklist.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}
