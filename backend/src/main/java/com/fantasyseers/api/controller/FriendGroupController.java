package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.dto.PagedResponse;
import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.entity.Prop;
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

    @PatchMapping("/{id}")
    public ResponseEntity<FriendGroupDto.GroupResponse> renameGroup(
            @PathVariable Long id,
            @Valid @RequestBody FriendGroupDto.RenameRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(friendGroupService.renameGroup(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> kickMember(
            @PathVariable Long id,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        friendGroupService.kickMember(id, userId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/members/me")
    public ResponseEntity<Void> leaveGroup(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        friendGroupService.leaveGroup(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
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

    @GetMapping("/{id}/props/paged")
    public ResponseEntity<PagedResponse<PropDto.PropResponse>> getGroupPropsPaged(
            @PathVariable Long id,
            @RequestParam Prop.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.getGroupPropsByStatus(id, userDetails.getUsername(), status, page, size));
    }
}
