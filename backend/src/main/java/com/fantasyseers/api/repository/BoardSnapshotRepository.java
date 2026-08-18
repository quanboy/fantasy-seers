package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.BoardSnapshot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BoardSnapshotRepository extends JpaRepository<BoardSnapshot, Long> {

    boolean existsByUserIdAndSeason(Long userId, Integer season);

    Optional<BoardSnapshot> findByUserIdAndSeasonAndSnapshotType(
            Long userId,
            Integer season,
            String snapshotType
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT board FROM BoardSnapshot board WHERE board.id = :id")
    Optional<BoardSnapshot> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<BoardSnapshot> findAllBySeasonAndSnapshotType(Integer season, String snapshotType);

    List<BoardSnapshot> findAllByUserId(Long userId);
}
