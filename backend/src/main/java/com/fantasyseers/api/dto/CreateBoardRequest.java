package com.fantasyseers.api.dto;

import jakarta.validation.constraints.NotNull;

public record CreateBoardRequest(
        @NotNull Integer season
) {}
