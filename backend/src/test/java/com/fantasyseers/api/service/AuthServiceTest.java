package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.AuthDto;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.security.JwtUtils;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtils jwtUtils;
    @Mock AuthenticationManager authenticationManager;
    @Mock UserDetailsService userDetailsService;
    @Mock EntityManager entityManager;
    @InjectMocks AuthService service;

    @Test
    void anyoneCanRegisterWithUsernameEmailAndPassword() {
        UserDetails userDetails = mock(UserDetails.class);
        when(passwordEncoder.encode("safe-password")).thenReturn("hashed");
        when(userDetailsService.loadUserByUsername("newseer")).thenReturn(userDetails);
        when(jwtUtils.generateToken(userDetails)).thenReturn("jwt");

        AuthDto.AuthResponse response = service.register(
                new AuthDto.RegisterRequest("newseer", "seer@example.com", "safe-password")
        );

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertAll(
                () -> assertEquals("jwt", response.token()),
                () -> assertEquals("newseer", response.username()),
                () -> assertEquals(1000, response.pointBank()),
                () -> assertEquals("seer@example.com", userCaptor.getValue().getEmail()),
                () -> assertEquals("hashed", userCaptor.getValue().getPassword())
        );
    }
}
