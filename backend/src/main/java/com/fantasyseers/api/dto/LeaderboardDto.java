package com.fantasyseers.api.dto;

import java.util.List;

public class LeaderboardDto {

    public record LeaderboardEntry(
            int rank,
            String username,
            long totalPicks,
            long correctPicks,
            double accuracy
    ) {}

    public record LeaderboardResponse(
            List<LeaderboardEntry> entries
    ) {}
}
