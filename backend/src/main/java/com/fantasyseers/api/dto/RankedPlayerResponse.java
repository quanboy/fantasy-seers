package com.fantasyseers.api.dto;

public record RankedPlayerResponse(
        Long playerId,
        String fullName,
        String position,
        String nflTeam,
        Double adp,
        Integer overallRank,
        Integer positionalRank
) {}
