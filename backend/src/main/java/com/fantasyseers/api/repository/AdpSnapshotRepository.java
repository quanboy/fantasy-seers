package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.AdpSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AdpSnapshotRepository extends JpaRepository<AdpSnapshot, Long> {

    boolean existsBySourceAndCapturedAt(String source, LocalDateTime capturedAt);

    List<AdpSnapshot> findAllBySourceAndCapturedAtAndPlayerIdIn(
            String source,
            LocalDateTime capturedAt,
            Collection<Long> playerIds
    );
}
