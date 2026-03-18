package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.ConsensusRanking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsensusRankingRepository extends JpaRepository<ConsensusRanking, Long> {

    List<ConsensusRanking> findAllByOrderByOverallRankAsc();
}
