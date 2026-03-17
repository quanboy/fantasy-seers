package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.UserRanking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRankingRepository extends JpaRepository<UserRanking, Long> {

    List<UserRanking> findByUserIdOrderByOverallRankAsc(Long userId);

    void deleteAllByUserId(Long userId);
}
