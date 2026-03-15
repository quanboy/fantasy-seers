package com.fantasyseers.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public class FriendGroupDto {

    public record CreateRequest(
            @NotBlank @Size(max = 100) String name
    ) {}

    public record JoinRequest(
            @NotBlank String inviteCode
    ) {}

    public record InviteRequest(
            @NotBlank String username
    ) {}

    public record RenameRequest(
            @NotBlank @Size(max = 100) String name
    ) {}

    public record MemberInfo(
            Long id,
            String username
    ) {}

    public record GroupResponse(
            Long id,
            String name,
            String inviteCode,
            String ownerUsername,
            int memberCount,
            List<String> memberUsernames,
            List<MemberInfo> members
    ) {}

    public record InviteResponse(
            Long id,
            Long groupId,
            String groupName,
            String inviterUsername,
            String inviteeUsername,
            String status,
            LocalDateTime createdAt
    ) {}
}
