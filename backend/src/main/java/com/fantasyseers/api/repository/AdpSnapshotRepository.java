package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.AdpSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AdpSnapshotRepository extends JpaRepository<AdpSnapshot, Long> {

    boolean existsBySourceAndCapturedAt(String source, LocalDateTime capturedAt);

    List<AdpSnapshot> findAllBySourceAndCapturedAtAndPlayerIdIn(
            String source,
            LocalDateTime capturedAt,
            Collection<Long> playerIds
    );

    @Query("SELECT MAX(a.capturedAt) FROM AdpSnapshot a WHERE a.source = :source")
    Optional<LocalDateTime> findLatestCapturedAtBySource(@Param("source") String source);

    @Query("""
            SELECT a FROM AdpSnapshot a
            WHERE a.source = :source AND a.capturedAt = :capturedAt
            ORDER BY a.value ASC, a.player.fullName ASC, a.player.sleeperId ASC
            """)
    List<AdpSnapshot> findAllBySourceAndCapturedAtOrderByValueAsc(
            @Param("source") String source,
            @Param("capturedAt") LocalDateTime capturedAt
    );
}
