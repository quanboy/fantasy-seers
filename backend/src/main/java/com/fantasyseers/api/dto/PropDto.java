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
            Boolean userWon
    ) {}

    public record VoteRequest(
            @NotNull Prop.Result choice,
            @NotNull @Min(1) Integer wagerAmount
    ) {}
}