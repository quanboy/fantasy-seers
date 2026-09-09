package com.fantasyseers.api.service;

import com.fantasyseers.api.service.BoardAccuracyScorer.BoardScoreResult;
import com.fantasyseers.api.service.BoardAccuracyScorer.PlayerScoreReceipt;
import com.fantasyseers.api.service.BoardAccuracyScorer.PredictedRank;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Spec (2026 MVP): a locked board publishes mean absolute rank error and
 * consensus-relative Edge using sigma = 1.
 *
 * <p>Missing and deep finishes are capped against each board's ranked depth so
 * full and partial boards receive proportional penalties.
 */
class BoardAccuracyScorerTest {

    private static final int MAXIMUM_DEPTH = BoardAccuracyScorer.MAXIMUM_BOARD_DEPTH;

    private final BoardAccuracyScorer scorer = new BoardAccuracyScorer();

    @Test
    void perfectPredictionScoresZero() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 1, 2L, 2, 3L, 3);

        BoardScoreResult result = score(predicted, actualFinish);

        assertAll(
                () -> assertEquals(0.0, result.averageRankError()),
                () -> assertEquals(0, result.totalRankError()),
                () -> assertEquals(3, result.scoredPlayerCount()),
                () -> assertEquals(0, result.unmatchedPlayerCount())
        );
    }

    @Test
    void averagesAbsoluteRankErrorAcrossPlayers() {
        // predicted 1,2,3 for players 1,2,3; actual finishes are shuffled
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 3, 2L, 1, 3L, 2);
        // errors: |1-3| + |2-1| + |3-2| = 2 + 1 + 1 = 4

        BoardScoreResult result = score(predicted, actualFinish);

        assertAll(
                () -> assertEquals(4.0 / 3.0, result.averageRankError(), 1e-9),
                () -> assertEquals(4, result.totalRankError())
        );
    }

    @Test
    void calculatesConsensusRelativeEdgeAndCompleteReceipts() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 2, 2L, 1);
        Map<Long, Integer> frozenConsensus = Map.of(1L, 2, 2L, 2);

        BoardScoreResult result = scorer.score(predicted, actualFinish, frozenConsensus);

        assertAll(
                () -> assertEquals(1.0, result.averageRankError()),
                () -> assertEquals(-0.5, result.averageEdge()),
                () -> assertEquals(1.0, result.breakdown().getFirst().sigma()),
                () -> assertEquals(1.0, result.breakdown().getFirst().userError()),
                () -> assertEquals(0.0, result.breakdown().getFirst().consensusError()),
                () -> assertEquals(-1.0, result.breakdown().getFirst().edge())
        );
    }

    @Test
    void scoreIsIndependentOfPredictedListOrder() {
        Map<Long, Integer> actualFinish = Map.of(1L, 3, 2L, 1, 3L, 2);

        BoardScoreResult inOrder = score(List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(3L, 3)
        ), actualFinish);

        BoardScoreResult shuffled = score(List.of(
                new PredictedRank(3L, 3),
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2)
        ), actualFinish);

        assertAll(
                () -> assertEquals(inOrder.averageRankError(), shuffled.averageRankError(), 1e-9),
                () -> assertEquals(inOrder.averageEdge(), shuffled.averageEdge(), 1e-9)
        );
    }

    @Test
    void playersWithoutAnActualFinishAreCappedAndCounted() {
        // Player 99 was ranked but never produced a scoreable finish (no Sleeper stats).
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 2),
                new PredictedRank(99L, 3)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 1, 2L, 2);
        int cap = 3 + BoardAccuracyScorer.FINISH_RANK_BUFFER;
        int expectedError = cap - 3;

        BoardScoreResult result = score(predicted, actualFinish);

        assertAll(
                () -> assertEquals((double) expectedError / 3.0, result.averageRankError(), 1e-9),
                () -> assertEquals(expectedError, result.totalRankError()),
                () -> assertEquals(3, result.scoredPlayerCount()),
                () -> assertEquals(1, result.unmatchedPlayerCount()),
                () -> assertEquals(
                        new PlayerScoreReceipt(99L, 3, 3, null, cap, 1.0,
                                expectedError, expectedError, 0.0),
                        result.breakdown().get(2)
                )
        );
    }

    @Test
    void producesPerPlayerReceipts() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(2L, 5)
        );
        Map<Long, Integer> actualFinish = Map.of(1L, 4, 2L, 2);

        BoardScoreResult result = score(predicted, actualFinish);

        assertEquals(
                List.of(
                        new PlayerScoreReceipt(1L, 1, 1, 4, 4, 1.0, 3.0, 3.0, 0.0),
                        new PlayerScoreReceipt(2L, 5, 5, 2, 2, 1.0, 3.0, 3.0, 0.0)
                ),
                result.breakdown()
        );
    }

    @Test
    void capsActualFinishesBeyondBoardDepthAndBuffer() {
        int cap = 1 + BoardAccuracyScorer.FINISH_RANK_BUFFER;
        int wayDeep = MAXIMUM_DEPTH + BoardAccuracyScorer.FINISH_RANK_BUFFER + 100;
        int expectedError = cap - 1;

        BoardScoreResult result = score(
                List.of(new PredictedRank(1L, 1)),
                Map.of(1L, wayDeep)
        );

        assertAll(
                () -> assertEquals((double) expectedError, result.averageRankError(), 1e-9),
                () -> assertEquals(expectedError, result.totalRankError()),
                () -> assertEquals(
                        new PlayerScoreReceipt(1L, 1, 1, wayDeep, cap, 1.0,
                                expectedError, expectedError, 0.0),
                        result.breakdown().getFirst()
                )
        );
    }

    @Test
    void capsMissingFinishesAgainstTheScoredBoardsDepth() {
        List<PredictedRank> predicted = IntStream.rangeClosed(1, 150)
                .mapToObj(rank -> new PredictedRank(rank, rank))
                .toList();
        Map<Long, Integer> actualFinish = IntStream.rangeClosed(2, 150)
                .boxed()
                .collect(Collectors.toMap(Integer::longValue, rank -> rank));
        int boardDepthCap = 150 + BoardAccuracyScorer.FINISH_RANK_BUFFER;

        BoardScoreResult result = score(predicted, actualFinish);

        assertEquals(
                new PlayerScoreReceipt(1L, 1, 1, null, boardDepthCap, 1.0,
                        boardDepthCap - 1, boardDepthCap - 1, 0.0),
                result.breakdown().getFirst()
        );
    }

    @Test
    void rejectsEmptyBoard() {
        assertThrows(IllegalArgumentException.class,
                () -> scorer.score(List.of(), Map.of(), Map.of()));
    }

    @Test
    void rejectsDuplicatePredictedPlayers() {
        List<PredictedRank> predicted = List.of(
                new PredictedRank(1L, 1),
                new PredictedRank(1L, 2)
        );

        assertThrows(IllegalArgumentException.class,
                () -> scorer.score(predicted, Map.of(1L, 1), Map.of(1L, 1)));
    }

    @Test
    void requiresFrozenConsensusForEveryScoredPlayer() {
        assertThrows(IllegalArgumentException.class,
                () -> scorer.score(
                        List.of(new PredictedRank(1L, 1)),
                        Map.of(1L, 1),
                        Map.of()
                ));
    }

    @Test
    void rejectsInvalidRanks() {
        assertAll(
                () -> assertThrows(IllegalArgumentException.class,
                        () -> scorer.score(List.of(new PredictedRank(1L, 0)), Map.of(1L, 1), Map.of(1L, 1))),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> scorer.score(List.of(new PredictedRank(1L, MAXIMUM_DEPTH + 1)),
                                Map.of(1L, 1), Map.of(1L, 1))),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> scorer.score(List.of(new PredictedRank(1L, 1)),
                                Map.of(1L, 0), Map.of(1L, 1))),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> scorer.score(List.of(new PredictedRank(1L, 1)),
                                Map.of(1L, 1), Map.of(1L, 0)))
        );
    }

    @Test
    void returnsAnImmutableBreakdown() {
        BoardScoreResult result = score(
                List.of(new PredictedRank(1L, 1)),
                Map.of(1L, 1)
        );

        assertThrows(UnsupportedOperationException.class,
                () -> result.breakdown().add(
                        new PlayerScoreReceipt(2L, 2, 2, 2, 2, 1.0, 0.0, 0.0, 0.0)));
    }

    private BoardScoreResult score(List<PredictedRank> predicted, Map<Long, Integer> actualFinish) {
        Map<Long, Integer> matchingConsensus = predicted.stream()
                .collect(Collectors.toMap(PredictedRank::playerId, PredictedRank::predictedRank));
        return scorer.score(predicted, actualFinish, matchingConsensus);
    }
}
