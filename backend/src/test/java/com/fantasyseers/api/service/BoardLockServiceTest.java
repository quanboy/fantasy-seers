package com.fantasyseers.api.service;

import com.fantasyseers.api.config.LeagueFormat;
import com.fantasyseers.api.dto.BoardLockResponse;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.SnapshotEntry;
import com.fantasyseers.api.entity.SnapshotType;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardLockServiceTest {

    @Mock BoardSnapshotRepository boardSnapshotRepository;
    @Mock UserRepository userRepository;
    @Mock DefaultBoardRankingService defaultBoardRankingService;
    @Mock LeagueFormat leagueFormat;
    @InjectMocks BoardLockService boardLockService;

    @Test
    void provisionalFormatRefusesGlobalLock() {
        when(leagueFormat.isConfirmed()).thenReturn(false);

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> boardLockService.lockSeason(2026)
        );

        assertTrue(error.getMessage().contains("still provisional"));
        verify(boardSnapshotRepository, never()).saveAllAndFlush(anyList());
    }

    @Test
    void globalLockFreezesSavedAndUntouchedBoards() {
        User rankedUser = User.builder().id(1L).username("ranked").build();
        User untouchedUser = User.builder().id(2L).username("untouched").build();
        NflPlayer first = NflPlayer.builder()
                .id(10L).fullName("First Player").position("RB").build();
        NflPlayer second = NflPlayer.builder()
                .id(11L).fullName("Second Player").position("WR").build();
        BoardSnapshot rankedBoard = BoardSnapshot.builder()
                .id(20L)
                .user(rankedUser)
                .season(2026)
                .entries(List.of(SnapshotEntry.builder()
                        .player(second)
                        .userRank(1)
                        .build()))
                .build();

        when(leagueFormat.isConfirmed()).thenReturn(true);
        when(leagueFormat.getScoringFormat()).thenReturn("FULL_PPR");
        when(leagueFormat.isSuperflex()).thenReturn(false);
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.SEASON_START))
                .thenReturn(List.of());
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.PRESEASON))
                .thenReturn(List.of(rankedBoard));
        when(userRepository.findAll()).thenReturn(List.of(rankedUser, untouchedUser));
        when(defaultBoardRankingService.getRankings()).thenReturn(List.of(
                new DefaultBoardRankingService.DefaultRanking(first, 1, 1),
                new DefaultBoardRankingService.DefaultRanking(second, 2, 1)
        ));

        BoardLockResponse response = boardLockService.lockSeason(2026);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<BoardSnapshot>> boardsCaptor = ArgumentCaptor.forClass(List.class);
        verify(boardSnapshotRepository).saveAllAndFlush(boardsCaptor.capture());
        List<BoardSnapshot> lockedBoards = boardsCaptor.getValue();
        BoardSnapshot untouchedBoard = lockedBoards.stream()
                .filter(board -> board.getUser().getId().equals(2L))
                .findFirst()
                .orElseThrow();

        assertAll(
                () -> assertEquals(2, response.lockedBoards()),
                () -> assertEquals(0, response.alreadyLockedBoards()),
                () -> assertEquals("FULL_PPR", response.scoringFormat()),
                () -> assertFalse(response.superflex()),
                () -> assertEquals(2, lockedBoards.size()),
                () -> assertTrue(lockedBoards.stream().allMatch(BoardSnapshot::isLocked)),
                () -> assertTrue(lockedBoards.stream()
                        .allMatch(board -> SnapshotType.SEASON_START.equals(board.getSnapshotType()))),
                () -> assertEquals(2, untouchedBoard.getEntries().size()),
                () -> assertEquals(untouchedBoard, untouchedBoard.getEntries().getFirst().getSnapshot()),
                () -> assertNotNull(response.completedAt())
        );
    }

    @Test
    void globalLockRetrySkipsAlreadyLockedBoards() {
        User user = User.builder().id(1L).username("locked").build();
        BoardSnapshot lockedBoard = BoardSnapshot.builder()
                .id(20L)
                .user(user)
                .season(2026)
                .snapshotType(SnapshotType.SEASON_START)
                .lockedAt(java.time.LocalDateTime.now())
                .build();
        when(leagueFormat.isConfirmed()).thenReturn(true);
        when(leagueFormat.getScoringFormat()).thenReturn("FULL_PPR");
        when(leagueFormat.isSuperflex()).thenReturn(false);
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.SEASON_START))
                .thenReturn(List.of(lockedBoard));
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.PRESEASON))
                .thenReturn(List.of());
        when(userRepository.findAll()).thenReturn(List.of(user));

        BoardLockResponse response = boardLockService.lockSeason(2026);

        assertAll(
                () -> assertEquals(0, response.lockedBoards()),
                () -> assertEquals(1, response.alreadyLockedBoards())
        );
        verify(boardSnapshotRepository, never()).saveAllAndFlush(anyList());
    }
}
