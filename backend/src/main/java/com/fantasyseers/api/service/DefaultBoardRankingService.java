package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DefaultBoardRankingService {

    private static final int DEFAULT_RANKING_DEPTH = 300;

    private final NflPlayerRepository nflPlayerRepository;
    private final ConsensusRankingRepository consensusRankingRepository;

    @Transactional(readOnly = true)
    public List<DefaultRanking> getRankings() {
        List<NflPlayer> activePlayers = nflPlayerRepository
                .findAllByActiveTrueOrderByAdpAscFullNameAscSleeperIdAsc(
                        PageRequest.of(0, DEFAULT_RANKING_DEPTH)
                );
        if (activePlayers.isEmpty()) {
            return consensusRankingRepository.findAllByOrderByOverallRankAsc().stream()
                    .map(ranking -> new DefaultRanking(
                            ranking.getPlayer(),
                            ranking.getOverallRank(),
                            ranking.getPositionalRank()
                    ))
                    .toList();
        }

        Map<String, Integer> positionCounters = new HashMap<>();
        List<DefaultRanking> rankings = new ArrayList<>();
        for (int index = 0; index < activePlayers.size(); index++) {
            NflPlayer player = activePlayers.get(index);
            int positionalRank = positionCounters.merge(player.getPosition(), 1, Integer::sum);
            rankings.add(new DefaultRanking(player, index + 1, positionalRank));
        }
        return rankings;
    }

    public record DefaultRanking(
            NflPlayer player,
            Integer overallRank,
            Integer positionalRank
    ) {
    }
}
