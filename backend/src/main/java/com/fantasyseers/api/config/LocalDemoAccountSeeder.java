package com.fantasyseers.api.config;

import com.fantasyseers.api.entity.PointTransaction;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.PointTransactionRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("local & !prod")
@ConditionalOnProperty(prefix = "demo-account", name = "enabled", havingValue = "true")
public class LocalDemoAccountSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String email;
    private final String password;

    public LocalDemoAccountSeeder(
            UserRepository userRepository,
            PointTransactionRepository pointTransactionRepository,
            PasswordEncoder passwordEncoder,
            @Value("${demo-account.username:demo}") String username,
            @Value("${demo-account.email:demo@local.fantasyseers.invalid}") String email,
            @Value("${demo-account.password:demo-only-password}") String password
    ) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(username) || userRepository.existsByEmail(email)) {
            return;
        }

        User demoUser = userRepository.save(User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .pointBank(1000)
                .role(User.Role.USER)
                .accountType(User.AccountType.HUMAN)
                .build());

        pointTransactionRepository.save(PointTransaction.builder()
                .user(demoUser)
                .amount(1000)
                .type(PointTransaction.TransactionType.STARTING_BALANCE)
                .note("Local demo account starting balance")
                .build());
    }
}
