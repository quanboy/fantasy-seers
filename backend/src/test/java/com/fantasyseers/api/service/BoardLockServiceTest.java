package com.fantasyseers.api.service;

import com.fantasyseers.api.config.LeagueFormat;
import com.fantasyseers.api.dto.BoardLockResponse;
import com.fantasyseers.api.entity.AdpSnapshot;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.ConsensusRanking;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.SnapshotEntry;
import com.fantasyseers.api.entity.SnapshotType;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.AdpSnapshotRepository;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

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
    @Mock ConsensusRankingRepository consensusRankingRepository;
    @Mock AdpSnapshotRepository adpSnapshotRepository;
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
    void globalLockFreezesSavedUntouchedAndBaselineBoards() {
        User rankedUser = User.builder().id(1L).username("ranked").build();
        User untouchedUser = User.builder().id(2L).username("untouched").build();
        User consensusUser = User.builder()
                .id(3L)
                .username("consensus-baseline")
                .accountType(User.AccountType.CONSENSUS_BASELINE)
                .build();
        User adpUser = User.builder()
                .id(4L)
                .username("sleeper-adp-baseline")
                .accountType(User.AccountType.ADP_BASELINE)
                .build();
        List<NflPlayer> baselinePlayers = IntStream.rangeClosed(1, 300)
                .mapToObj(rank -> NflPlayer.builder()
                        .id((long) rank + 9)
                        .sleeperId("player-" + rank)
                        .fullName("Player " + rank)
                        .position(rank % 2 == 0 ? "WR" : "RB")
                        .build())
                .toList();
        NflPlayer first = baselinePlayers.get(0);
        NflPlayer second = baselinePlayers.get(1);
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
        when(userRepository.findAllByAccountType(User.AccountType.HUMAN))
                .thenReturn(List.of(rankedUser, untouchedUser));
        when(userRepository.findByAccountType(User.AccountType.CONSENSUS_BASELINE))
                .thenReturn(Optional.of(consensusUser));
        when(userRepository.findByAccountType(User.AccountType.ADP_BASELINE))
                .thenReturn(Optional.of(adpUser));
        when(defaultBoardRankingService.getRankings()).thenReturn(List.of(
                new DefaultBoardRankingService.DefaultRanking(first, 1, 1),
                new DefaultBoardRankingService.DefaultRanking(second, 2, 1)
        ));
        List<NflPlayer> consensusOrder = new ArrayList<>(baselinePlayers);
        consensusOrder.set(0, second);
        consensusOrder.set(1, first);
        when(consensusRankingRepository.findAllByOrderByOverallRankAsc()).thenReturn(
                IntStream.range(0, consensusOrder.size())
                        .mapToObj(index -> ConsensusRanking.builder()
                                .player(consensusOrder.get(index))
                                .overallRank(index + 1)
                                .positionalRank(index / 2 + 1)
                                .build())
                        .toList()
        );
        LocalDateTime latestCapture = LocalDateTime.of(2026, 9, 10, 0, 0);
        when(adpSnapshotRepository.findLatestCapturedAtBySource(AdpSnapshot.SLEEPER_SOURCE))
                .thenReturn(Optional.of(latestCapture));
        when(adpSnapshotRepository.findAllBySourceAndCapturedAtOrderByValueAsc(
                AdpSnapshot.SLEEPER_SOURCE,
                latestCapture
        )).thenReturn(IntStream.range(0, baselinePlayers.size())
                .mapToObj(index -> AdpSnapshot.builder()
                        .player(baselinePlayers.get(index))
                        .value(index + 1)
                        .build())
                .toList());

        BoardLockResponse response = boardLockService.lockSeason(2026);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<BoardSnapshot>> boardsCaptor = ArgumentCaptor.forClass(List.class);
        verify(boardSnapshotRepository).saveAllAndFlush(boardsCaptor.capture());
        List<BoardSnapshot> lockedBoards = boardsCaptor.getValue();
        BoardSnapshot untouchedBoard = lockedBoards.stream()
                .filter(board -> board.getUser().getId().equals(2L))
                .findFirst()
                .orElseThrow();
        BoardSnapshot consensusBoard = lockedBoards.stream()
                .filter(board -> board.getUser().getAccountType() == User.AccountType.CONSENSUS_BASELINE)
                .findFirst()
                .orElseThrow();
        BoardSnapshot adpBoard = lockedBoards.stream()
                .filter(board -> board.getUser().getAccountType() == User.AccountType.ADP_BASELINE)
                .findFirst()
                .orElseThrow();

        assertAll(
                () -> assertEquals(4, response.lockedBoards()),
                () -> assertEquals(0, response.alreadyLockedBoards()),
                () -> assertEquals("FULL_PPR", response.scoringFormat()),
                () -> assertFalse(response.superflex()),
                () -> assertEquals(4, lockedBoards.size()),
                () -> assertTrue(lockedBoards.stream().allMatch(BoardSnapshot::isLocked)),
                () -> assertTrue(lockedBoards.stream()
                        .allMatch(board -> SnapshotType.SEASON_START.equals(board.getSnapshotType()))),
                () -> assertEquals(2, untouchedBoard.getEntries().size()),
                () -> assertEquals(untouchedBoard, untouchedBoard.getEntries().getFirst().getSnapshot()),
                () -> assertEquals(List.of(second, first), consensusBoard.getEntries().stream()
                        .limit(2).map(SnapshotEntry::getPlayer).toList()),
                () -> assertEquals(List.of(first, second), adpBoard.getEntries().stream()
                        .limit(2).map(SnapshotEntry::getPlayer).toList()),
                () -> assertEquals(300, consensusBoard.getEntries().size()),
                () -> assertEquals(300, adpBoard.getEntries().size()),
                () -> assertNotNull(response.completedAt())
        );
    }

    @Test
    void globalLockRetrySkipsAlreadyLockedBoards() {
        User user = User.builder().id(1L).username("locked").build();
        User consensusUser = User.builder()
                .id(2L)
                .username("consensus-baseline")
                .accountType(User.AccountType.CONSENSUS_BASELINE)
                .build();
        User adpUser = User.builder()
                .id(3L)
                .username("sleeper-adp-baseline")
                .accountType(User.AccountType.ADP_BASELINE)
                .build();
        BoardSnapshot lockedBoard = BoardSnapshot.builder()
                .id(20L)
                .user(user)
                .season(2026)
                .snapshotType(SnapshotType.SEASON_START)
                .lockedAt(java.time.LocalDateTime.now())
                .build();
        BoardSnapshot lockedConsensus = BoardSnapshot.builder()
                .id(21L)
                .user(consensusUser)
                .season(2026)
                .snapshotType(SnapshotType.SEASON_START)
                .lockedAt(java.time.LocalDateTime.now())
                .build();
        BoardSnapshot lockedAdp = BoardSnapshot.builder()
                .id(22L)
                .user(adpUser)
                .season(2026)
                .snapshotType(SnapshotType.SEASON_START)
                .lockedAt(java.time.LocalDateTime.now())
                .build();
        when(leagueFormat.isConfirmed()).thenReturn(true);
        when(leagueFormat.getScoringFormat()).thenReturn("FULL_PPR");
        when(leagueFormat.isSuperflex()).thenReturn(false);
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.SEASON_START))
                .thenReturn(List.of(lockedBoard, lockedConsensus, lockedAdp));
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.PRESEASON))
                .thenReturn(List.of());
        when(userRepository.findAllByAccountType(User.AccountType.HUMAN)).thenReturn(List.of(user));
        when(userRepository.findByAccountType(User.AccountType.CONSENSUS_BASELINE))
                .thenReturn(Optional.of(consensusUser));
        when(userRepository.findByAccountType(User.AccountType.ADP_BASELINE))
                .thenReturn(Optional.of(adpUser));

        BoardLockResponse response = boardLockService.lockSeason(2026);

        assertAll(
                () -> assertEquals(0, response.lockedBoards()),
                () -> assertEquals(3, response.alreadyLockedBoards())
        );
        verify(boardSnapshotRepository, never()).saveAllAndFlush(anyList());
    }

    @Test
    void missingConsensusBaselineAbortsTheWholeLock() {
        User human = User.builder().id(1L).username("seer").build();
        User consensusUser = User.builder()
                .id(2L)
                .accountType(User.AccountType.CONSENSUS_BASELINE)
                .build();

        when(leagueFormat.isConfirmed()).thenReturn(true);
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.SEASON_START))
                .thenReturn(List.of());
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.PRESEASON))
                .thenReturn(List.of());
        when(userRepository.findAllByAccountType(User.AccountType.HUMAN)).thenReturn(List.of(human));
        when(userRepository.findByAccountType(User.AccountType.CONSENSUS_BASELINE))
                .thenReturn(Optional.of(consensusUser));
        when(defaultBoardRankingService.getRankings()).thenReturn(List.of(
                new DefaultBoardRankingService.DefaultRanking(
                        NflPlayer.builder().id(10L).position("RB").build(),
                        1,
                        1
                )
        ));
        when(consensusRankingRepository.findAllByOrderByOverallRankAsc()).thenReturn(List.of());

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> boardLockService.lockSeason(2026)
        );

        assertTrue(error.getMessage().contains("CONSENSUS_BASELINE rankings are missing"));
        verify(boardSnapshotRepository, never()).saveAllAndFlush(anyList());
    }

    @Test
    void incompleteConsensusBaselineAbortsTheWholeLock() {
        User consensusUser = User.builder()
                .id(2L)
                .accountType(User.AccountType.CONSENSUS_BASELINE)
                .build();
        NflPlayer player = NflPlayer.builder().id(10L).position("RB").build();

        when(leagueFormat.isConfirmed()).thenReturn(true);
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.SEASON_START))
                .thenReturn(List.of());
        when(boardSnapshotRepository.findAllBySeasonAndSnapshotType(2026, SnapshotType.PRESEASON))
                .thenReturn(List.of());
        when(userRepository.findAllByAccountType(User.AccountType.HUMAN)).thenReturn(List.of());
        when(userRepository.findByAccountType(User.AccountType.CONSENSUS_BASELINE))
                .thenReturn(Optional.of(consensusUser));
        when(consensusRankingRepository.findAllByOrderByOverallRankAsc()).thenReturn(List.of(
                ConsensusRanking.builder().player(player).overallRank(1).positionalRank(1).build()
        ));

        IllegalStateException error = assertThrows(
                IllegalStateException.class,
                () -> boardLockService.lockSeason(2026)
        );

        assertTrue(error.getMessage().contains("must contain exactly 300 rankings"));
        verify(boardSnapshotRepository, never()).saveAllAndFlush(anyList());
    }
}
