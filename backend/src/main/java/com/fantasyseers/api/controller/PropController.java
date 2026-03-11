package com.fantasyseers.api.controller;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.service.PropService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<PropDto.PropResponse> createProp(
            @Valid @RequestBody PropDto.CreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.createProp(request, userDetails.getUsername()));
    }

    @PostMapping("/submit")
    public ResponseEntity<PropDto.PropResponse> submitProp(
            @Valid @RequestBody PropDto.submitRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.submitProp(request, userDetails.getUsername()));
    }

    @GetMapping("/public")
    public ResponseEntity<List<PropDto.PropResponse>> getPublicProps(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(propService.getPublicProps(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropDto.PropResponse> getPropById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(propService.getPropById(id, userDetails.getUsername()));
    }
}