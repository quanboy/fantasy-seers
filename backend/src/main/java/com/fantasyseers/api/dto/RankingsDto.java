package com.fantasyseers.api.dto;

import java.util.List;

public class RankingsDto {

    public record PlayerRankingDto(
            Long playerId,
            String sleeperId,
            String fullName,
            String position,
            String nflTeam,
            int overallRank,
            int positionalRank,
            Integer adp,
            Integer consensusOverallRank
    ) {}

    public record MasterSheetDto(
            List<PlayerRankingDto> rankings,
            boolean isDefault
    ) {}

    public record SaveRankingsRequest(
            List<RankingEntryRequest> rankings
    ) {
        public record RankingEntryRequest(
                Long playerId,
                int overallRank,
                int positionalRank
        ) {}
    }
}
