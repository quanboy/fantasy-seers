package com.fantasyseers.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RankedPlayerDto(
        @NotNull Long playerId,
        @NotNull @Min(1) @Max(1000) Integer rank
) {}
