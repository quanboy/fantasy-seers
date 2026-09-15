package com.fantasyseers.api.service;

import com.fantasyseers.api.config.LeagueFormat;
import com.fantasyseers.api.dto.BoardLockResponse;
import com.fantasyseers.api.entity.AdpSnapshot;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.SnapshotEntry;
import com.fantasyseers.api.entity.SnapshotType;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.AdpSnapshotRepository;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BoardLockService {

    private static final int BASELINE_RANKING_DEPTH = 300;

    private final BoardSnapshotRepository boardSnapshotRepository;
    private final UserRepository userRepository;
    private final DefaultBoardRankingService defaultBoardRankingService;
    private final ConsensusRankingRepository consensusRankingRepository;
    private final AdpSnapshotRepository adpSnapshotRepository;
    private final LeagueFormat leagueFormat;

    @Transactional
    public BoardLockResponse lockSeason(Integer season) {
        validateSeason(season);
        if (!leagueFormat.isConfirmed()) {
            throw new IllegalStateException(
                    "League format is still provisional; confirm it before locking boards"
            );
        }

        Map<Long, BoardSnapshot> lockedByUser = indexByUser(
                boardSnapshotRepository.findAllBySeasonAndSnapshotType(season, SnapshotType.SEASON_START)
        );
        Map<Long, BoardSnapshot> preseasonByUser = indexByUser(
                boardSnapshotRepository.findAllBySeasonAndSnapshotType(season, SnapshotType.PRESEASON)
        );
        List<User> users = userRepository.findAllByAccountType(User.AccountType.HUMAN);
        List<BoardSnapshot> boardsToLock = new ArrayList<>();
        List<DefaultBoardRankingService.DefaultRanking> defaultRankings = null;
        int alreadyLocked = 0;
        LocalDateTime completedAt = LocalDateTime.now(ZoneOffset.UTC);

        for (User user : users) {
            if (lockedByUser.containsKey(user.getId())) {
                alreadyLocked++;
                continue;
            }

            BoardSnapshot board = preseasonByUser.get(user.getId());
            if (board == null) {
                board = BoardSnapshot.builder()
                        .user(user)
                        .season(season)
                        .snapshotType(SnapshotType.PRESEASON)
                        .build();
            }

            if (board.getEntries().isEmpty()) {
                if (defaultRankings == null) {
                    defaultRankings = defaultBoardRankingService.getRankings();
                }
                if (defaultRankings.isEmpty()) {
                    throw new IllegalStateException(
                            "Cannot lock boards because no default rankings are available"
                    );
                }
                for (DefaultBoardRankingService.DefaultRanking ranking : defaultRankings) {
                    board.getEntries().add(SnapshotEntry.builder()
                            .snapshot(board)
                            .player(ranking.player())
                            .userRank(ranking.overallRank())
                            .build());
                }
            }

            board.setSnapshotType(SnapshotType.SEASON_START);
            board.setScoringFormat(leagueFormat.getScoringFormat());
            board.setSuperflex(leagueFormat.isSuperflex());
            board.setLockedAt(completedAt);
            boardsToLock.add(board);
        }

        for (User.AccountType baselineType : List.of(
                User.AccountType.CONSENSUS_BASELINE,
                User.AccountType.ADP_BASELINE
        )) {
            User baselineUser = userRepository.findByAccountType(baselineType)
                    .orElseThrow(() -> new IllegalStateException(
                            "Cannot lock boards because the " + baselineType + " account is missing"
                    ));
            if (lockedByUser.containsKey(baselineUser.getId())) {
                alreadyLocked++;
                continue;
            }

            List<SnapshotEntry> baselineEntries = baselineEntries(baselineType);
            if (baselineEntries.isEmpty()) {
                throw new IllegalStateException(
                        "Cannot lock boards because the " + baselineType + " rankings are missing"
                );
            }
            if (baselineEntries.size() != BASELINE_RANKING_DEPTH) {
                throw new IllegalStateException(
                        "Cannot lock boards because the " + baselineType
                                + " baseline must contain exactly " + BASELINE_RANKING_DEPTH + " rankings"
                );
            }

            BoardSnapshot baselineBoard = BoardSnapshot.builder()
                    .user(baselineUser)
                    .season(season)
                    .snapshotType(SnapshotType.SEASON_START)
                    .scoringFormat(leagueFormat.getScoringFormat())
                    .superflex(leagueFormat.isSuperflex())
                    .lockedAt(completedAt)
                    .build();
            for (SnapshotEntry entry : baselineEntries) {
                entry.setSnapshot(baselineBoard);
                baselineBoard.getEntries().add(entry);
            }
            boardsToLock.add(baselineBoard);
        }

        if (!boardsToLock.isEmpty()) {
            boardSnapshotRepository.saveAllAndFlush(boardsToLock);
        }
        return new BoardLockResponse(
                season,
                boardsToLock.size(),
                alreadyLocked,
                leagueFormat.getScoringFormat(),
                leagueFormat.isSuperflex(),
                completedAt
        );
    }

    private List<SnapshotEntry> baselineEntries(User.AccountType baselineType) {
        if (baselineType == User.AccountType.CONSENSUS_BASELINE) {
            return consensusRankingRepository.findAllByOrderByOverallRankAsc().stream()
                    .limit(BASELINE_RANKING_DEPTH)
                    .map(ranking -> SnapshotEntry.builder()
                            .player(ranking.getPlayer())
                            .userRank(ranking.getOverallRank())
                            .build())
                    .toList();
        }

        LocalDateTime capturedAt = adpSnapshotRepository
                .findLatestCapturedAtBySource(AdpSnapshot.SLEEPER_SOURCE)
                .orElseThrow(() -> new IllegalStateException(
                        "Cannot lock boards because no Sleeper ADP snapshot is available"
                ));
        List<AdpSnapshot> snapshots = adpSnapshotRepository
                .findAllBySourceAndCapturedAtOrderByValueAsc(AdpSnapshot.SLEEPER_SOURCE, capturedAt);
        List<SnapshotEntry> entries = new ArrayList<>();
        for (int index = 0; index < Math.min(snapshots.size(), BASELINE_RANKING_DEPTH); index++) {
            entries.add(SnapshotEntry.builder()
                    .player(snapshots.get(index).getPlayer())
                    .userRank(index + 1)
                    .build());
        }
        return entries;
    }

    private Map<Long, BoardSnapshot> indexByUser(List<BoardSnapshot> boards) {
        Map<Long, BoardSnapshot> byUser = new HashMap<>();
        for (BoardSnapshot board : boards) {
            byUser.put(board.getUser().getId(), board);
        }
        return byUser;
    }

    private void validateSeason(Integer season) {
        if (season == null || season < 2000 || season > 2100) {
            throw new IllegalArgumentException("Season must be between 2000 and 2100");
        }
    }
}
