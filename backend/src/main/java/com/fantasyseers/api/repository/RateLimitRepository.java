package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.RateLimitEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface RateLimitRepository extends JpaRepository<RateLimitEntry, Long> {

    @Query("SELECT COUNT(r) FROM RateLimitEntry r WHERE r.username = :username AND r.endpoint = :endpoint AND r.createdAt > :since")
    long countRecentRequests(@Param("username") String username, @Param("endpoint") String endpoint, @Param("since") LocalDateTime since);
}
