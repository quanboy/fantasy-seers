package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.dto.VoteDto;
import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.repository.PropRepository;
import com.fantasyseers.api.service.PropService;
import com.fantasyseers.api.service.VoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/props")
@RequiredArgsConstructor
public class VoteController {

    private final VoteService voteService;
    private final PropService propService;
    private final PropRepository propRepository;

    @PostMapping("/{id}/vote")
    public ResponseEntity<VoteDto.VoteResponse> castVote(
            @PathVariable Long id,
            @Valid @RequestBody PropDto.VoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(voteService.castVote(id, request, userDetails.getUsername()));
    }

    @GetMapping("/{id}/split")
    public ResponseEntity<VoteDto.VoteResponse> getSplit(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Prop prop = propRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));
        propService.checkPropAccess(prop, userDetails.getUsername());
        return ResponseEntity.ok(voteService.getSplit(id));
    }
}