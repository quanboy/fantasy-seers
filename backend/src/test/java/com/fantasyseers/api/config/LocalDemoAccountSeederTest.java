package com.fantasyseers.api.config;

import com.fantasyseers.api.entity.PointTransaction;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.PointTransactionRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LocalDemoAccountSeederTest {

    @Test
    void isRestrictedToExplicitLocalNonProductionStartup() {
        Profile profile = LocalDemoAccountSeeder.class.getAnnotation(Profile.class);
        ConditionalOnProperty property = LocalDemoAccountSeeder.class.getAnnotation(ConditionalOnProperty.class);

        assertArrayEquals(new String[]{"local & !prod"}, profile.value());
        assertEquals("demo-account", property.prefix());
        assertArrayEquals(new String[]{"enabled"}, property.name());
        assertEquals("true", property.havingValue());
        assertFalse(property.matchIfMissing());
    }

    @Test
    void createsNormalDemoUserAndStartingBalanceWhenMissing() throws Exception {
        UserRepository users = mock(UserRepository.class);
        PointTransactionRepository transactions = mock(PointTransactionRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode("demo-only-password")).thenReturn("encoded-password");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDemoAccountSeeder seeder = new LocalDemoAccountSeeder(
                users,
                transactions,
                encoder,
                "demo",
                "demo@local.fantasyseers.invalid",
                "demo-only-password"
        );

        seeder.run(null);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(users).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("demo", savedUser.getUsername());
        assertEquals("demo@local.fantasyseers.invalid", savedUser.getEmail());
        assertEquals("encoded-password", savedUser.getPassword());
        assertEquals(1000, savedUser.getPointBank());
        assertEquals(User.Role.USER, savedUser.getRole());
        assertEquals(User.AccountType.HUMAN, savedUser.getAccountType());

        ArgumentCaptor<PointTransaction> transactionCaptor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(transactions).save(transactionCaptor.capture());
        PointTransaction savedTransaction = transactionCaptor.getValue();
        assertEquals(savedUser, savedTransaction.getUser());
        assertEquals(1000, savedTransaction.getAmount());
        assertEquals(PointTransaction.TransactionType.STARTING_BALANCE, savedTransaction.getType());
        verify(encoder).encode("demo-only-password");
    }

    @Test
    void leavesExistingAccountUntouched() throws Exception {
        UserRepository users = mock(UserRepository.class);
        PointTransactionRepository transactions = mock(PointTransactionRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.existsByUsername("demo")).thenReturn(true);

        LocalDemoAccountSeeder seeder = new LocalDemoAccountSeeder(
                users,
                transactions,
                encoder,
                "demo",
                "demo@local.fantasyseers.invalid",
                "demo-only-password"
        );

        seeder.run(null);

        verify(users, never()).save(any(User.class));
        verifyNoInteractions(transactions, encoder);
    }
}
