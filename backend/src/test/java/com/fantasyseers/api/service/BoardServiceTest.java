package com.fantasyseers.api.service;

import com.fantasyseers.api.config.LeagueFormat;
import com.fantasyseers.api.dto.BoardDto;
import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import com.fantasyseers.api.repository.SnapshotEntryRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceTest {

    @Mock BoardSnapshotRepository boardSnapshotRepository;
    @Mock SnapshotEntryRepository snapshotEntryRepository;
    @Mock UserRepository userRepository;
    @Mock NflPlayerRepository nflPlayerRepository;
    @Mock LeagueFormat leagueFormat;
    @Mock DefaultBoardRankingService defaultBoardRankingService;
    @InjectMocks BoardService boardService;

    @BeforeEach
    void setUpLeagueFormat() {
        lenient().when(leagueFormat.getScoringFormat())
                .thenReturn(LeagueFormat.DEFAULT_SCORING_FORMAT);
        lenient().when(leagueFormat.isSuperflex())
                .thenReturn(LeagueFormat.DEFAULT_SUPERFLEX);
    }

    @Test
    void newBoardFallsBackToConsensusRankings() {
        User user = User.builder().id(7L).username("seer").build();
        BoardSnapshot board = BoardSnapshot.builder()
                .id(11L).user(user).season(2026).build();
        NflPlayer player = NflPlayer.builder()
                .id(21L).fullName("Player One").position("WR")
                .nflTeam("TEST").adp(17).build();

        when(boardSnapshotRepository.findByUserIdAndSeasonAndSnapshotType(7L, 2026, "PRESEASON"))
                .thenReturn(Optional.empty());
        when(boardSnapshotRepository.findByUserIdAndSeasonAndSnapshotType(7L, 2026, "SEASON_START"))
                .thenReturn(Optional.empty());
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(boardSnapshotRepository.save(any(BoardSnapshot.class))).thenReturn(board);
        when(snapshotEntryRepository.findAllBySnapshotIdOrderByUserRankAsc(11L))
                .thenReturn(List.of());
        when(defaultBoardRankingService.getRankings()).thenReturn(List.of(
                new DefaultBoardRankingService.DefaultRanking(player, 8, 3)
        ));

        BoardSheetResponse response = boardService.getMySheet(7L, 2026);

        assertAll(
                () -> assertEquals(11L, response.boardId()),
                () -> assertEquals(LeagueFormat.DEFAULT_SCORING_FORMAT, response.scoringFormat()),
                () -> assertEquals(LeagueFormat.DEFAULT_SUPERFLEX, response.superflex()),
                () -> assertTrue(response.isDefault()),
                () -> assertEquals(8, response.rankings().getFirst().overallRank()),
                () -> assertEquals(3, response.rankings().getFirst().positionalRank())
        );
    }

    @Test
    void createBoardStampsProvisionalAppWideFormat() {
        User user = User.builder().id(7L).username("seer").build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(boardSnapshotRepository.existsByUserIdAndSeason(7L, 2026)).thenReturn(false);
        when(boardSnapshotRepository.save(any(BoardSnapshot.class)))
                .thenAnswer(invocation -> {
                    BoardSnapshot board = invocation.getArgument(0);
                    board.setId(11L);
                    return board;
                });

        BoardDto.BoardResponse response = boardService.createBoard(7L, 2026);

        ArgumentCaptor<BoardSnapshot> boardCaptor = ArgumentCaptor.forClass(BoardSnapshot.class);
        verify(boardSnapshotRepository).save(boardCaptor.capture());
        assertAll(
                () -> assertEquals(LeagueFormat.DEFAULT_SCORING_FORMAT, boardCaptor.getValue().getScoringFormat()),
                () -> assertEquals(LeagueFormat.DEFAULT_SUPERFLEX, boardCaptor.getValue().getSuperflex()),
                () -> assertEquals(LeagueFormat.DEFAULT_SCORING_FORMAT, response.scoringFormat()),
                () -> assertEquals(LeagueFormat.DEFAULT_SUPERFLEX, response.superflex())
        );
    }

    @Test
    void savingExistingBoardRestampsCurrentAppWideFormat() {
        User user = User.builder().id(7L).username("seer").build();
        BoardSnapshot board = BoardSnapshot.builder()
                .id(11L)
                .user(user)
                .season(2026)
                .scoringFormat("STANDARD")
                .superflex(true)
                .build();
        when(boardSnapshotRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(board));
        when(boardSnapshotRepository.save(any(BoardSnapshot.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        BoardDto.BoardResponse response = boardService.upsertEntries(11L, 7L, List.of());

        assertAll(
                () -> assertEquals(LeagueFormat.DEFAULT_SCORING_FORMAT, board.getScoringFormat()),
                () -> assertEquals(LeagueFormat.DEFAULT_SUPERFLEX, board.getSuperflex()),
                () -> assertEquals(LeagueFormat.DEFAULT_SCORING_FORMAT, response.scoringFormat()),
                () -> assertEquals(LeagueFormat.DEFAULT_SUPERFLEX, response.superflex())
        );
    }

    @Test
    void lockedBoardRejectsRankingWrites() {
        User user = User.builder().id(7L).username("seer").build();
        BoardSnapshot board = BoardSnapshot.builder()
                .id(11L)
                .user(user)
                .season(2026)
                .lockedAt(LocalDateTime.now())
                .build();
        when(boardSnapshotRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(board));

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> boardService.upsertEntries(11L, 7L, List.of())
        );

        assertEquals("This board is locked and cannot be edited", error.getMessage());
        verify(boardSnapshotRepository, never()).save(any(BoardSnapshot.class));
    }
}
