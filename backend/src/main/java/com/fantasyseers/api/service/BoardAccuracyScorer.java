package com.fantasyseers.api.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pure scoring math for the 2026 season.
 *
 * <p>A locked board's accuracy score is the sum of absolute rank error between
 * the user's predicted overall rank and the player's actual Half-PPR
 * end-of-season finish rank. Lower is better.
 *
 * <p>This class is intentionally free of persistence and external I/O so the
 * scoring rules can be exercised in fast unit tests. The Sleeper adapter that
 * turns actual season stats into finish ranks lives elsewhere and feeds the
 * {@code actualFinishByPlayerId} map into {@link #score}.
 */
@Component
public class BoardAccuracyScorer {

    /** A single player's predicted position on a user's board. */
    public record PredictedRank(long playerId, int predictedRank) {}

    /** Per-player receipt: predicted vs. actual finish and the resulting error. */
    public record PlayerRankError(long playerId, int predictedRank, int actualRank, int error) {}

    /** Outcome of scoring one board. */
    public record AccuracyResult(
            int totalRankError,
            int scoredPlayerCount,
            int unmatchedPlayerCount,
            List<PlayerRankError> breakdown
    ) {}

    /**
     * Scores a board.
     *
     * @param predicted             the user's ranked players (predicted overall ranks)
     * @param actualFinishByPlayerId actual Half-PPR finish rank keyed by player id
     * @return the total error, counts, and a per-player breakdown in predicted order
     * @throws IllegalArgumentException if the same player is ranked more than once
     */
    public AccuracyResult score(List<PredictedRank> predicted, Map<Long, Integer> actualFinishByPlayerId) {
        Set<Long> seen = new HashSet<>();
        List<PlayerRankError> breakdown = new ArrayList<>();
        int totalError = 0;
        int unmatched = 0;

        for (PredictedRank p : predicted) {
            if (!seen.add(p.playerId())) {
                throw new IllegalArgumentException("Duplicate predicted player: " + p.playerId());
            }
            Integer actualRank = actualFinishByPlayerId.get(p.playerId());
            if (actualRank == null) {
                unmatched++;
                continue;
            }
            int error = Math.abs(p.predictedRank() - actualRank);
            totalError += error;
            breakdown.add(new PlayerRankError(p.playerId(), p.predictedRank(), actualRank, error));
        }

        return new AccuracyResult(totalError, breakdown.size(), unmatched, breakdown);
    }
}
