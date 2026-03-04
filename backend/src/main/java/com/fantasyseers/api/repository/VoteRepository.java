package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findByPropIdAndUserId(Long propId, Long userId);

    List<Vote> findByPropId(Long propId);

    boolean existsByPropIdAndUserId(Long propId, Long userId);

    @Query("SELECT COUNT(v) FROM Vote v WHERE v.prop.id = :propId AND v.choice = :choice")
    long countByPropIdAndChoice(@Param("propId") Long propId, @Param("choice") Vote.Choice choice);

    @Query("SELECT COALESCE(SUM(v.wagerAmount), 0) FROM Vote v WHERE v.prop.id = :propId AND v.choice = :choice")
    long sumWagerByPropIdAndChoice(@Param("propId") Long propId, @Param("choice") Vote.Choice choice);
}
