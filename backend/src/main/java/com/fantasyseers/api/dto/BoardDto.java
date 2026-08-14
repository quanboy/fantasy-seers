package com.fantasyseers.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public class BoardDto {

    public record BoardResponse(
            Long id,
            String username,
            Integer season,
            String snapshotType,
            String scoringFormat,
            Boolean superflex,
            List<EntryResponse> entries,
            LocalDateTime createdAt
    ) {}

    public record EntryResponse(
            Long id,
            Long playerId,
            String playerName,
            String position,
            String nflTeam,
            Integer userRank,
            LocalDateTime createdAt
    ) {}
}
