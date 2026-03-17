package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.Prop;
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

    @Query("""
        SELECT v.user.username,
               COUNT(v),
               SUM(CASE WHEN (v.choice = :choiceYes AND v.prop.result = :resultYes)
                          OR (v.choice = :choiceNo AND v.prop.result = :resultNo)
                        THEN 1L ELSE 0L END)
        FROM Vote v
        WHERE v.prop.status = :resolvedStatus
        GROUP BY v.user.username
        """)
    List<Object[]> getGlobalLeaderboard(
            @Param("resolvedStatus") Prop.Status resolvedStatus,
            @Param("choiceYes") Vote.Choice choiceYes,
            @Param("choiceNo") Vote.Choice choiceNo,
            @Param("resultYes") Prop.Result resultYes,
            @Param("resultNo") Prop.Result resultNo
    );

    @Query("""
        SELECT v.user.username,
               COUNT(v),
               SUM(CASE WHEN (v.choice = :choiceYes AND v.prop.result = :resultYes)
                          OR (v.choice = :choiceNo AND v.prop.result = :resultNo)
                        THEN 1L ELSE 0L END)
        FROM Vote v
        JOIN v.prop p
        JOIN p.groups g
        WHERE p.status = :resolvedStatus AND g.id = :groupId
        GROUP BY v.user.username
        """)
    List<Object[]> getGroupLeaderboard(
            @Param("resolvedStatus") Prop.Status resolvedStatus,
            @Param("groupId") Long groupId,
            @Param("choiceYes") Vote.Choice choiceYes,
            @Param("choiceNo") Vote.Choice choiceNo,
            @Param("resultYes") Prop.Result resultYes,
            @Param("resultNo") Prop.Result resultNo
    );
}
