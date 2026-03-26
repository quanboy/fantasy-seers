package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.RankingsDto;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.service.RankingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rankings")
@RequiredArgsConstructor
public class RankingsController {

    private final RankingsService rankingsService;
    private final UserRepository userRepository;

    @GetMapping("/my-sheet")
    public ResponseEntity<RankingsDto.MasterSheetDto> getMySheet(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(rankingsService.getUserSheet(userId));
    }

    @PostMapping("/my-sheet")
    public ResponseEntity<Void> saveMySheet(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RankingsDto.SaveRankingsRequest request
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        rankingsService.saveUserSheet(userId, request);
        return ResponseEntity.ok().build();
    }
}
