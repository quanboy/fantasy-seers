package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.ConsensusRanking;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DefaultBoardRankingServiceTest {

    @Mock NflPlayerRepository nflPlayerRepository;
    @Mock ConsensusRankingRepository consensusRankingRepository;
    @InjectMocks DefaultBoardRankingService defaultBoardRankingService;

    @Test
    void activeSleeperOrderProducesOverallAndPositionalRanks() {
        NflPlayer qbOne = player(1L, "QB One", "QB");
        NflPlayer rbOne = player(2L, "RB One", "RB");
        NflPlayer qbTwo = player(3L, "QB Two", "QB");
        when(nflPlayerRepository.findAllByActiveTrueOrderByAdpAscFullNameAscSleeperIdAsc(
                any(Pageable.class)
        )).thenReturn(List.of(qbOne, rbOne, qbTwo));

        List<DefaultBoardRankingService.DefaultRanking> rankings =
                defaultBoardRankingService.getRankings();

        assertAll(
                () -> assertEquals(List.of(1, 2, 3),
                        rankings.stream().map(DefaultBoardRankingService.DefaultRanking::overallRank).toList()),
                () -> assertEquals(List.of(1, 1, 2),
                        rankings.stream().map(DefaultBoardRankingService.DefaultRanking::positionalRank).toList())
        );
        verifyNoInteractions(consensusRankingRepository);
    }

    @Test
    void consensusFallbackPreservesSeededRanks() {
        NflPlayer player = player(1L, "Fallback Player", "WR");
        ConsensusRanking consensus = ConsensusRanking.builder()
                .player(player)
                .overallRank(8)
                .positionalRank(3)
                .build();
        when(nflPlayerRepository.findAllByActiveTrueOrderByAdpAscFullNameAscSleeperIdAsc(
                any(Pageable.class)
        )).thenReturn(List.of());
        when(consensusRankingRepository.findAllByOrderByOverallRankAsc())
                .thenReturn(List.of(consensus));

        DefaultBoardRankingService.DefaultRanking ranking =
                defaultBoardRankingService.getRankings().getFirst();

        assertAll(
                () -> assertEquals(player, ranking.player()),
                () -> assertEquals(8, ranking.overallRank()),
                () -> assertEquals(3, ranking.positionalRank())
        );
    }

    private NflPlayer player(Long id, String name, String position) {
        return NflPlayer.builder()
                .id(id)
                .fullName(name)
                .position(position)
                .build();
    }
}
