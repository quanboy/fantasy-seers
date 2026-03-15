package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.LeaderboardDto;
import com.fantasyseers.api.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping("/global")
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> getGlobalLeaderboard() {
        return ResponseEntity.ok(leaderboardService.getGlobalLeaderboard());
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<LeaderboardDto.LeaderboardResponse> getGroupLeaderboard(
            @PathVariable Long groupId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(leaderboardService.getGroupLeaderboard(groupId, userDetails.getUsername()));
    }
}
