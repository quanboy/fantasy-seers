package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.BoardSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardSnapshotRepository extends JpaRepository<BoardSnapshot, Long> {

    Optional<BoardSnapshot> findByUserIdAndSeason(Long userId, Integer season);

    List<BoardSnapshot> findAllByUserId(Long userId);
}
