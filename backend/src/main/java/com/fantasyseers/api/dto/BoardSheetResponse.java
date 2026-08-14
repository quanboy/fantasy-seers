package com.fantasyseers.api.dto;

import java.util.List;

public record BoardSheetResponse(
        Long boardId,
        Integer season,
        String scoringFormat,
        Boolean superflex,
        Boolean isDefault,
        List<RankedPlayerResponse> rankings
) {}
