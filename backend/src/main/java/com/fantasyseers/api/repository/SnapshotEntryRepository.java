package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.SnapshotEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SnapshotEntryRepository extends JpaRepository<SnapshotEntry, Long> {

    List<SnapshotEntry> findAllBySnapshotIdOrderByUserRankAsc(Long snapshotId);

    Optional<SnapshotEntry> findBySnapshotIdAndPlayerId(Long snapshotId, Long playerId);
}
