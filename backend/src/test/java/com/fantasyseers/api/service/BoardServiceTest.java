package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.ConsensusRanking;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import com.fantasyseers.api.repository.SnapshotEntryRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock BoardSnapshotRepository boardSnapshotRepository;
    @Mock SnapshotEntryRepository snapshotEntryRepository;
    @Mock ConsensusRankingRepository consensusRankingRepository;
    @Mock UserRepository userRepository;
    @Mock NflPlayerRepository nflPlayerRepository;
    @InjectMocks BoardService boardService;

    @Test
    void newBoardFallsBackToConsensusRankings() {
        User user = User.builder().id(7L).username("seer").build();
        BoardSnapshot board = BoardSnapshot.builder()
                .id(11L).user(user).season(2026).build();
        NflPlayer player = NflPlayer.builder()
                .id(21L).fullName("Player One").position("WR")
                .nflTeam("TEST").adp(17).build();
        ConsensusRanking consensus = ConsensusRanking.builder()
                .player(player).overallRank(8).positionalRank(3).build();

        when(boardSnapshotRepository.findByUserIdAndSeason(7L, 2026))
                .thenReturn(Optional.empty());
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(boardSnapshotRepository.save(any(BoardSnapshot.class))).thenReturn(board);
        when(snapshotEntryRepository.findAllBySnapshotIdOrderByUserRankAsc(11L))
                .thenReturn(List.of());
        when(consensusRankingRepository.findAllByOrderByOverallRankAsc())
                .thenReturn(List.of(consensus));

        BoardSheetResponse response = boardService.getMySheet(7L, 2026);

        assertAll(
                () -> assertEquals(11L, response.boardId()),
                () -> assertTrue(response.isDefault()),
                () -> assertEquals(8, response.rankings().getFirst().overallRank()),
                () -> assertEquals(3, response.rankings().getFirst().positionalRank())
        );
    }
}
