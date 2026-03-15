package com.fantasyseers.api.controller;

import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow();

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("pointBank", user.getPointBank());
        response.put("role", user.getRole().name());
        response.put("favoriteNflTeam", user.getFavoriteNflTeam());
        response.put("favoriteNbaTeam", user.getFavoriteNbaTeam());
        response.put("almaMater", user.getAlmaMater());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UserService.UpdateProfileRequest request
    ) {
        User user = userService.updateProfile(userDetails.getUsername(), request);

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("pointBank", user.getPointBank());
        response.put("role", user.getRole().name());
        response.put("favoriteNflTeam", user.getFavoriteNflTeam());
        response.put("favoriteNbaTeam", user.getFavoriteNbaTeam());
        response.put("almaMater", user.getAlmaMater());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/authorities")
    public ResponseEntity<?> getAuthorities(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(Map.of(
                "username", userDetails.getUsername(),
                "authorities", userDetails.getAuthorities().stream()
                        .map(a -> a.getAuthority())
                        .toList()
        ));
    }
}
