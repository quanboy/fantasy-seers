package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.service.PropService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/props")
@RequiredArgsConstructor
public class PropController {

    private final PropService propService;

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PropDto.PropResponse> createProp(
            @Valid @RequestBody PropDto.CreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.createProp(request, userDetails.getUsername()));
    }

    @PostMapping("/submit")
    public ResponseEntity<PropDto.PropResponse> submitProp(
            @Valid @RequestBody PropDto.SubmitRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.submitProp(request, userDetails.getUsername()));
    }

    @GetMapping("/public")
    public ResponseEntity<PropDto.PaginatedResponse> getPublicProps(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(propService.getPublicPropsPaginated(username, PageRequest.of(page, Math.min(size, 100))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropDto.PropResponse> getPropById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.getPropById(id, userDetails.getUsername()));
    }
}