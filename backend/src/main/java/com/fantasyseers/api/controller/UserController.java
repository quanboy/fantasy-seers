package com.fantasyseers.api.controller;

import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow();

        return ResponseEntity.ok(Map.of(
                "username",  user.getUsername(),
                "email",     user.getEmail(),
                "pointBank", user.getPointBank(),
                "role",      user.getRole().name()
        ));
    }
}