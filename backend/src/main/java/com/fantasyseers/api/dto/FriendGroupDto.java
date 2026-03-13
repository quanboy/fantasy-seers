package com.fantasyseers.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class FriendGroupDto {

    public record CreateRequest(
            @NotBlank @Size(max = 100) String name
    ) {}

    public record JoinRequest(
            @NotBlank String inviteCode
    ) {}

    public record GroupResponse(
            Long id,
            String name,
            String inviteCode,
            String ownerUsername,
            int memberCount,
            List<String> memberUsernames
    ) {}
}
