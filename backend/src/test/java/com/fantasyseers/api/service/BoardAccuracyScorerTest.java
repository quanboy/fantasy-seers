package com.fantasyseers.api.service;

import com.fantasyseers.api.service.BoardAccuracyScorer.AccuracyResult;
import com.fantasyseers.api.service.BoardAccuracyScorer.PlayerRankError;
import com.fantasyseers.api.service.BoardAccuracyScorer.PredictedRank;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Spec (2026 MVP): a locked board's accuracy score is the sum of absolute
 * rank error between the user's predicted overall rank and the player's
 * actual Half-PPR end-of-season finish rank. Lower is better.
 */
class BoardAccuracyScorerTest {

    private final BoardAccuracyScorer scorer = new BoardAccuracyScorer();

    @Test
    void perfectPredictionScoresZero() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 1, 2L, 2, 3L, 3);

        AccuracyResult result = scorer.score(predicted, actualFinish);

        assertAll(
                () -> assertEquals(0, result.totalRankError()),
                () -> assertEquals(3, result.scoredPlayerCount()),
                () -> assertEquals(0, result.unmatchedPlayerCount())
        );
    }

    @Test
    void sumsAbsoluteRankErrorAcrossPlayers() {
        // predicted 1,2,3 for players 1,2,3; actual finishes are shuffled
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 3, 2L, 1, 3L, 2);
        // errors: |1-3| + |2-1| + |3-2| = 2 + 1 + 1 = 4

        AccuracyResult result = scorer.score(predicted, actualFinish);

        assertEquals(4, result.totalRankError());
    }

    @Test
    void scoreIsIndependentOfPredictedListOrder() {
        Map<Long, Integer> actualFinish = Map.of(1L, 3, 2L, 1, 3L, 2);

        AccuracyResult inOrder = scorer.score(List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        ), actualFinish);

        AccuracyResult shuffled = scorer.score(List.of(
                new PredictedRank(3L, 3),
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2)
        ), actualFinish);

        assertEquals(inOrder.totalRankError(), shuffled.totalRankError());
    }

    @Test
    void playersWithoutAnActualFinishAreExcludedAndCounted() {
        // Player 99 was ranked but never produced a scoreable finish (no Sleeper stats).
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(99L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 1, 2L, 2);

        AccuracyResult result = scorer.score(predicted, actualFinish);

        assertAll(
                () -> assertEquals(0, result.totalRankError()),
                () -> assertEquals(2, result.scoredPlayerCount()),
                () -> assertEquals(1, result.unmatchedPlayerCount())
        );
    }

    @Test
    void producesPerPlayerReceipts() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 5)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 4, 2L, 2);

        AccuracyResult result = scorer.score(predicted, actualFinish);

        assertEquals(
                List.of(
                        new PlayerRankError(1L, 1, 4, 3),
                        new PlayerRankError(2L, 5, 2, 3)
                ),
                result.breakdown()
        );
    }

    @Test
    void emptyBoardScoresZero() {
        AccuracyResult result = scorer.score(List.of(), Map.of());

        assertAll(
                () -> assertEquals(0, result.totalRankError()),
                () -> assertEquals(0, result.scoredPlayerCount())
        );
    }

    @Test
    void rejectsDuplicatePredictedPlayers() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(1L, 2)
        );

        assertThrows(IllegalArgumentException.class,
                () -> scorer.score(predicted, Map.of(1L, 1)));
    }
}
