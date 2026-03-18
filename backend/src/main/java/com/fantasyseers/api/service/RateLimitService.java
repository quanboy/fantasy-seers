package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.RateLimitEntry;
import com.fantasyseers.api.repository.RateLimitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitRepository rateLimitRepository;

    @Transactional(readOnly = true)
    public boolean isRateLimited(String username, String endpoint, int maxRequests, int windowHours) {
        LocalDateTime since = LocalDateTime.now().minusHours(windowHours);
        long count = rateLimitRepository.countRecentRequests(username, endpoint, since);
        return count >= maxRequests;
    }

    @Transactional
    public void recordRequest(String username, String endpoint) {
        RateLimitEntry entry = RateLimitEntry.builder()
                .username(username)
                .endpoint(endpoint)
                .build();
        rateLimitRepository.save(entry);
    }
}
