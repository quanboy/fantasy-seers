package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.UserRanking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRankingRepository extends JpaRepository<UserRanking, Long> {

    List<UserRanking> findByUserIdOrderByOverallRankAsc(Long userId);

    @Modifying
    @Query("DELETE FROM UserRanking ur WHERE ur.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
