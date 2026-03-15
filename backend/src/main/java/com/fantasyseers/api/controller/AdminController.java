package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.service.FriendGroupService;
import com.fantasyseers.api.service.PropService;
import com.fantasyseers.api.service.ResolutionService;
import com.fantasyseers.api.dto.PropDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final PropService propService;
    private final ResolutionService resolutionService;
    private final FriendGroupService friendGroupService;

    @PostMapping("/props")
    public ResponseEntity<PropDto.PropResponse> createProp(
            @Valid @RequestBody PropDto.CreateRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal
            org.springframework.security.core.userdetails.UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.createProp(request, userDetails.getUsername()));
    }

    @PostMapping("/props/{id}/resolve")
    public ResponseEntity<Void> resolveProp(
            @PathVariable Long id,
            @RequestParam Prop.Result result
    ) {
        resolutionService.resolveProp(id, result);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/props/pending")
    public ResponseEntity<List<PropDto.PropResponse>> getPendingProps() {
        return ResponseEntity.ok(propService.getPendingProps());
    }

    @PostMapping("/props/{id}/approve")
    public ResponseEntity<PropDto.PropResponse> approveProp(@PathVariable Long id) {
        return ResponseEntity.ok(propService.approveProp(id));
    }

    @PostMapping("/props/{id}/reject")
    public ResponseEntity<Void> rejectProp(@PathVariable Long id) {
        propService.rejectProp(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/groups")
    public ResponseEntity<List<FriendGroupDto.GroupResponse>> getAllGroups() {
        return ResponseEntity.ok(friendGroupService.getAllGroups());
    }
}