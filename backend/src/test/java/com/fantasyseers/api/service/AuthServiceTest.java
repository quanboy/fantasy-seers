package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.AuthDto;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.security.JwtUtils;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtils jwtUtils;
    @Mock AuthenticationManager authenticationManager;
    @Mock UserDetailsService userDetailsService;
    @Mock EntityManager entityManager;

    @Test
    void registrationRejectsWrongInviteCodeBeforeWritingUserData() {
        AuthService service = new AuthService(
                userRepository,
                passwordEncoder,
                jwtUtils,
                authenticationManager,
                userDetailsService,
                entityManager,
                "league-only"
        );

        var request = new AuthDto.RegisterRequest(
                "newseer",
                "seer@example.com",
                "safe-password",
                "wrong-code",
                null,
                null,
                null
        );

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service.register(request)
        );

        assertEquals("Invalid invite code", error.getMessage());
        verifyNoInteractions(userRepository, passwordEncoder, entityManager);
    }
}
