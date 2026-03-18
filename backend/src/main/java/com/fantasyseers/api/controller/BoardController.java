package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.BoardDto;
import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.dto.CreateBoardRequest;
import com.fantasyseers.api.dto.RankedPlayerDto;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Year;
import java.util.List;

@RestController
@RequestMapping("/api/v1/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<BoardDto.BoardResponse> createBoard(
            @Valid @RequestBody CreateBoardRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(boardService.createBoard(userId, request.season()));
    }

    @PutMapping("/{id}/entries")
    public ResponseEntity<BoardDto.BoardResponse> upsertEntries(
            @PathVariable Long id,
            @Valid @RequestBody List<RankedPlayerDto> entries,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(boardService.upsertEntries(id, userId, entries));
    }

    @GetMapping("/my-sheet")
    public ResponseEntity<BoardSheetResponse> getMySheet(
            @RequestParam(required = false) Integer season,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        int resolvedSeason = season != null ? season : Year.now().getValue();
        return ResponseEntity.ok(boardService.getMySheet(userId, resolvedSeason));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BoardDto.BoardResponse> getBoard(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long userId = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(boardService.getBoard(id, userId));
    }
}
