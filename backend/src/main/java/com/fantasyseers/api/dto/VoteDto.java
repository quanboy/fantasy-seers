package com.fantasyseers.api.dto;

public class VoteDto {

    public record VoteResponse(
            long yesCount,
            long noCount,
            double yesPct,
            double noPct,
            long yesWagerTotal,
            long noWagerTotal
    ) {}
}
