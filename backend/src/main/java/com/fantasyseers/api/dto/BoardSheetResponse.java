package com.fantasyseers.api.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BoardSheetResponse(
        Long boardId,
        Integer season,
        String scoringFormat,
        Boolean superflex,
        Boolean locked,
        LocalDateTime lockedAt,
        Boolean isDefault,
        List<RankedPlayerResponse> rankings
) {}
