package com.fantasyseers.api.config;

import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AppConfigTest {

    @Test
    void systemBaselineAccountsCannotAuthenticate() {
        UserRepository userRepository = mock(UserRepository.class);
        User systemUser = User.builder()
                .username("consensus-baseline")
                .password("{disabled}")
                .accountType(User.AccountType.CONSENSUS_BASELINE)
                .build();
        when(userRepository.findByUsername("consensus-baseline"))
                .thenReturn(Optional.of(systemUser));

        AppConfig appConfig = new AppConfig(userRepository);

        assertThrows(
                UsernameNotFoundException.class,
                () -> appConfig.userDetailsService().loadUserByUsername("consensus-baseline")
        );
    }
}
