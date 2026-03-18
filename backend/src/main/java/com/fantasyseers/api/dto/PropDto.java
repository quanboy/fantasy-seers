package com.fantasyseers.api.dto;

import com.fantasyseers.api.entity.Prop;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public class PropDto {

    public record PaginatedResponse(
            List<PropResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {}

    public record CreateRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 500) String description,
            @NotNull Prop.Sport sport,
            @NotNull LocalDateTime closesAt,
            Long groupId
    ) {}

    public record submitRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 500) String description,
            @NotNull Prop.Sport sport,
            @NotNull LocalDateTime closesAt,
            @Min(1) Integer minWager,
            @Min(1) Integer maxWager,
            Prop.Scope scope,
            Long groupId
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
            Integer maxWager,
            Integer userWager,
            Integer userPayout
    ) {}

    public record VoteRequest(
            @NotNull Prop.Result choice,
            @NotNull @Min(1) Integer wagerAmount
    ) {}
}