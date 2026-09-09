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
 * <p>A locked board publishes two scores: Accuracy is the mean absolute rank
 * error between the user's prediction and the actual finish (lower is better),
 * while Edge measures that error relative to frozen consensus (higher is better).
 *
 * <p>Each board is scored at its own ranked depth. Missing or deeper finishes are
 * capped at that depth plus {@link #FINISH_RANK_BUFFER}, which keeps penalties
 * proportional for full and partial boards.
 *
 * <p>This class is intentionally free of persistence and external I/O so the
 * scoring rules can be exercised in fast unit tests. The Sleeper adapter that
 * turns actual season stats into format-correct finish ranks lives elsewhere and
 * feeds format-correct actual finishes and frozen consensus ranks into
 * {@link #score(List, Map, Map)}.
 */
@Component
public class BoardAccuracyScorer {

    /** The documented 2026 methodology uses unweighted rank error. */
    public static final double METHODOLOGY_SIGMA = 1.0;

    /**
     * Maximum supported board depth. The Master Sheet surfaces the top 300 players
     * by Sleeper rank, while partial boards use their highest predicted rank.
     */
    public static final int MAXIMUM_BOARD_DEPTH = 300;

    /**
     * Slack added beyond the scored board's depth before a finish is capped.
     */
    static final int FINISH_RANK_BUFFER = 20;

    /** A single player's predicted position on a user's board. */
    public record PredictedRank(long playerId, int predictedRank) {}

    /** Per-player receipt, preserving both the reported and capped finish rank. */
    public record PlayerScoreReceipt(
            long playerId,
            int predictedRank,
            int consensusRank,
            Integer actualRank,
            int effectiveActualRank,
            double sigma,
            double userError,
            double consensusError,
            double edge
    ) {}

    /** Outcome of scoring one board. */
    public record BoardScoreResult(
            double averageRankError,
            double averageEdge,
            int totalRankError,
            int scoredPlayerCount,
            int unmatchedPlayerCount,
            List<PlayerScoreReceipt> breakdown
    ) {}

    /**
     * Scores a board at its highest predicted rank, capping missing or deeper
     * finishes at that board depth plus {@link #FINISH_RANK_BUFFER}.
     *
     * @param predicted              the user's ranked players (predicted overall ranks)
     * @param actualFinishByPlayerId format-correct finish rank keyed by player id
     * @param consensusRankByPlayerId consensus rank frozen with the scored board
     * @return average and total error, counts, and immutable receipts in predicted order
     * @throws IllegalArgumentException for an empty board, missing consensus, invalid ranks or duplicate players
     */
    public BoardScoreResult score(
            List<PredictedRank> predicted,
            Map<Long, Integer> actualFinishByPlayerId,
            Map<Long, Integer> consensusRankByPlayerId
    ) {
        if (predicted.isEmpty()) {
            throw new IllegalArgumentException("Cannot score an empty board");
        }

        Set<Long> seen = new HashSet<>();
        int boardDepth = 0;
        for (PredictedRank p : predicted) {
            if (!seen.add(p.playerId())) {
                throw new IllegalArgumentException("Duplicate predicted player: " + p.playerId());
            }
            if (p.predictedRank() < 1 || p.predictedRank() > MAXIMUM_BOARD_DEPTH) {
                throw new IllegalArgumentException("Predicted rank must be between 1 and " + MAXIMUM_BOARD_DEPTH);
            }
            boardDepth = Math.max(boardDepth, p.predictedRank());
        }
        int maximumFinishRank = Math.addExact(boardDepth, FINISH_RANK_BUFFER);

        List<PlayerScoreReceipt> breakdown = new ArrayList<>();
        int totalError = 0;
        double totalEdge = 0.0;
        int unmatched = 0;

        for (PredictedRank p : predicted) {
            Integer consensusRank = consensusRankByPlayerId.get(p.playerId());
            if (consensusRank == null) {
                throw new IllegalArgumentException("Missing frozen consensus rank for player: " + p.playerId());
            }
            if (consensusRank < 1 || consensusRank > MAXIMUM_BOARD_DEPTH) {
                throw new IllegalArgumentException("Consensus rank must be between 1 and " + MAXIMUM_BOARD_DEPTH);
            }

            Integer actualRank = actualFinishByPlayerId.get(p.playerId());
            if (actualRank != null && actualRank < 1) {
                throw new IllegalArgumentException("Actual finish rank must be positive");
            }
            if (actualRank == null) {
                unmatched++;
            }

            int effectiveActualRank = actualRank == null
                    ? maximumFinishRank
                    : Math.min(actualRank, maximumFinishRank);
            int rawUserError = Math.abs(p.predictedRank() - effectiveActualRank);
            double userError = rawUserError / METHODOLOGY_SIGMA;
            double consensusError = Math.abs(consensusRank - effectiveActualRank) / METHODOLOGY_SIGMA;
            double edge = consensusError - userError;
            totalError = Math.addExact(totalError, rawUserError);
            totalEdge += edge;
            breakdown.add(new PlayerScoreReceipt(
                    p.playerId(),
                    p.predictedRank(),
                    consensusRank,
                    actualRank,
                    effectiveActualRank,
                    METHODOLOGY_SIGMA,
                    userError,
                    consensusError,
                    edge
            ));
        }

        double averageError = (double) totalError / breakdown.size();
        return new BoardScoreResult(
                averageError,
                totalEdge / breakdown.size(),
                totalError,
                breakdown.size(),
                unmatched,
                List.copyOf(breakdown)
        );
    }
}
