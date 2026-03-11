package com.fantasyseers.api.dto;

import com.fantasyseers.api.entity.Prop;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public class PropDto {

    public record CreateRequest(
            @NotBlank String title,
            String description,
            @NotNull Prop.Sport sport,
            @NotNull LocalDateTime closesAt
    ) {}

    public record submitRequest(
            @NotBlank String title,
            String description,
            @NotNull Prop.Sport sport,
            @NotNull LocalDateTime closesAt,
            @Min(1) Integer minWager,
            @Min(1) Integer maxWager
    ) {}

    public record PropResponse(
            Long id,
            String title,
            String description,
            String sport,
            String status,
            String result,
            LocalDateTime closesAt,
            String createdBy,
            String userChoice,
            Boolean userWon,
            Integer minWager,
            Integer maxWager
    ) {}

    public record VoteRequest(
            @NotNull Prop.Result choice,
            @NotNull @Min(1) Integer wagerAmount
    ) {}
}