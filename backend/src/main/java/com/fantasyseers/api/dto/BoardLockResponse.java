package com.fantasyseers.api.dto;

import java.time.LocalDateTime;

public record BoardLockResponse(
        Integer season,
        Integer lockedBoards,
        Integer alreadyLockedBoards,
        String scoringFormat,
        Boolean superflex,
        LocalDateTime completedAt
) {
}
