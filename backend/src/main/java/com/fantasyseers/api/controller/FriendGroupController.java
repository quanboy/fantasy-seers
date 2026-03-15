package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.service.FriendGroupService;
import com.fantasyseers.api.service.PropService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class FriendGroupController {

    private final FriendGroupService friendGroupService;
    private final PropService propService;

    @PostMapping
    public ResponseEntity<FriendGroupDto.GroupResponse> createGroup(
            @Valid @RequestBody FriendGroupDto.CreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.createGroup(request, userDetails.getUsername()));
    }

    @PostMapping("/join")
    public ResponseEntity<FriendGroupDto.GroupResponse> joinGroup(
            @Valid @RequestBody FriendGroupDto.JoinRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.joinGroup(request, userDetails.getUsername()));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<FriendGroupDto.InviteResponse> inviteUser(
            @PathVariable Long id,
            @Valid @RequestBody FriendGroupDto.InviteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.inviteUser(id, request, userDetails.getUsername()));
    }

    @GetMapping("/invites")
    public ResponseEntity<List<FriendGroupDto.InviteResponse>> getMyInvites(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.getMyInvites(userDetails.getUsername()));
    }

    @PostMapping("/invites/{inviteId}/accept")
    public ResponseEntity<FriendGroupDto.GroupResponse> acceptInvite(
            @PathVariable Long inviteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.acceptInvite(inviteId, userDetails.getUsername()));
    }

    @PostMapping("/invites/{inviteId}/reject")
    public ResponseEntity<Void> rejectInvite(
            @PathVariable Long inviteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        friendGroupService.rejectInvite(inviteId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<FriendGroupDto.GroupResponse>> getMyGroups(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.getMyGroups(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FriendGroupDto.GroupResponse> getGroupById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.getGroupById(id, userDetails.getUsername()));
    }

    @GetMapping("/{id}/props")
    public ResponseEntity<List<PropDto.PropResponse>> getGroupProps(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.getGroupProps(id, userDetails.getUsername()));
    }
}
