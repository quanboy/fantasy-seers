package com.fantasyseers.api.dto;

import java.util.List;

public record BoardSheetResponse(
        Long boardId,
        Integer season,
        Boolean isDefault,
        List<RankedPlayerResponse> rankings
) {}
