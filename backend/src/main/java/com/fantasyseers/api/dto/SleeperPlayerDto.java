package com.fantasyseers.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SleeperPlayerDto(
        @JsonProperty("player_id") String playerId,
        @JsonProperty("full_name") String fullName,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName,
        String position,
        String team,
        String status,
        Boolean active,
        @JsonProperty("search_rank") Integer searchRank
) {}
