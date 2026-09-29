package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.AuthDto;
import com.fantasyseers.api.entity.PointTransaction;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final EntityManager entityManager;

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
            .username(request.username())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .pointBank(1000)
            .build();

        userRepository.save(user);

        // Record starting balance transaction
        PointTransaction tx = PointTransaction.builder()
            .user(user)
            .amount(1000)
            .type(PointTransaction.TransactionType.STARTING_BALANCE)
            .note("Welcome to Fantasy Seers!")
            .build();
        entityManager.persist(tx);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtils.generateToken(userDetails);

        return new AuthDto.AuthResponse(token, user.getUsername(), user.getEmail(), user.getPointBank(), user.getRole().name());
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        User user = userRepository.findByUsername(request.username())
            .orElseThrow();

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String token = jwtUtils.generateToken(userDetails);

        return new AuthDto.AuthResponse(token, user.getUsername(), user.getEmail(), user.getPointBank(), user.getRole().name());
    }
}
