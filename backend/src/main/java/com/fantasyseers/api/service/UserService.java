package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public record UpdateProfileRequest(
        @Size(max = 50) String favoriteNflTeam,
        @Size(max = 50) String favoriteNbaTeam,
        @Size(max = 100) String almaMater
    ) {}

    @Transactional
    public User updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setFavoriteNflTeam(request.favoriteNflTeam());
        user.setFavoriteNbaTeam(request.favoriteNbaTeam());
        user.setAlmaMater(request.almaMater());

        return userRepository.save(user);
    }
}
