package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.dto.VoteDto;
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

    @PostMapping("/{id}/vote")
    public ResponseEntity<VoteDto.VoteResponse> castVote(
            @PathVariable Long id,
            @Valid @RequestBody PropDto.VoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(voteService.castVote(id, request, userDetails.getUsername()));
    }

    @GetMapping("/{id}/split")
    public ResponseEntity<VoteDto.VoteResponse> getSplit(@PathVariable Long id) {
        return ResponseEntity.ok(voteService.getSplit(id));
    }
}