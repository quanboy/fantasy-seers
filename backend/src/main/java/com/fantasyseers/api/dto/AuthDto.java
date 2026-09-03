package com.fantasyseers.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDto {

    public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 100) String inviteCode,
        @Size(max = 50) String favoriteNflTeam,
        @Size(max = 50) String favoriteNbaTeam,
        @Size(max = 100) String almaMater
    ) {}

    public record LoginRequest(
        @NotBlank @Size(max = 50) String username,
        @NotBlank @Size(max = 72) String password
    ) {}

    public record AuthResponse(
        String token,
        String username,
        String email,
        Integer pointBank,
        String role
    ) {}
}
