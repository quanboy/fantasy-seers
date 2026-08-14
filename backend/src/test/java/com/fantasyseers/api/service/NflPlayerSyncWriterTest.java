package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.repository.NflPlayerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NflPlayerSyncWriterTest {

    @Mock NflPlayerRepository nflPlayerRepository;
    @InjectMocks NflPlayerSyncWriter syncWriter;

    @Test
    void replaceActivePlayersPreservesExistingIdsAndCountsDeactivations() {
        NflPlayer retained = NflPlayer.builder().id(10L).sleeperId("keep").active(true).build();
        NflPlayer removed = NflPlayer.builder().id(11L).sleeperId("remove").active(true).build();
        List<NflPlayerSyncCandidate> candidates = List.of(
                new NflPlayerSyncCandidate("keep", "Kept Player", "QB", "BUF", "Active", 4),
                new NflPlayerSyncCandidate("new", "New Player", "WR", "NE", "Active", 8)
        );
        AtomicReference<List<NflPlayer>> savedPlayers = new AtomicReference<>();

        when(nflPlayerRepository.findAllByActiveTrue())
                .thenReturn(List.of(retained, removed));
        when(nflPlayerRepository.findAllBySleeperIdIn(Set.of("keep", "new")))
                .thenReturn(List.of(retained));
        when(nflPlayerRepository.saveAll(anyList())).thenAnswer(invocation -> {
            savedPlayers.set(invocation.getArgument(0));
            return invocation.getArgument(0);
        });

        NflPlayerSyncResult result = syncWriter.replaceActivePlayers(
                candidates,
                LocalDateTime.of(2026, 8, 14, 4, 15)
        );

        assertEquals(1, result.created());
        assertEquals(1, result.updated());
        assertEquals(1, result.deactivated());
        assertSame(retained, savedPlayers.get().getFirst());
        assertEquals(10L, savedPlayers.get().getFirst().getId());
        assertTrue(savedPlayers.get().stream().allMatch(NflPlayer::getActive));
    }
}
