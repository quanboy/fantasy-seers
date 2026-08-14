package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.SleeperPlayerDto;
import com.fantasyseers.api.repository.AdpSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NflPlayerSyncServiceTest {

    @Mock SleeperPlayerClient sleeperPlayerClient;
    @Mock NflPlayerSyncWriter syncWriter;
    @Mock AdpSnapshotRepository adpSnapshotRepository;
    @InjectMocks NflPlayerSyncService syncService;

    @Test
    void syncMapsTheFullEligibleUniverseIncludingTeamDefenses() {
        Map<String, SleeperPlayerDto> response = eligiblePlayerResponse(500);
        response.put("ARI", new SleeperPlayerDto(
                "ARI", null, "Arizona", "Cardinals", "DEF", "ARI", null, true, null
        ));
        response.put("inactive", new SleeperPlayerDto(
                "inactive", "Inactive Player", null, null, "WR", null, "Inactive", false, 1
        ));

        AtomicReference<List<NflPlayerSyncCandidate>> savedCandidates = new AtomicReference<>();
        when(sleeperPlayerClient.fetchActivePlayers()).thenReturn(response);
        when(syncWriter.replaceActivePlayers(any(), any())).thenAnswer(invocation -> {
            List<NflPlayerSyncCandidate> candidates = invocation.getArgument(0);
            savedCandidates.set(candidates);
            return new NflPlayerSyncResult(candidates.size(), candidates.size(), 0, 0, 0, false);
        });

        NflPlayerSyncResult result = syncService.syncNow();

        assertEquals(501, result.fetched());
        NflPlayerSyncCandidate defense = savedCandidates.get().stream()
                .filter(candidate -> candidate.sleeperId().equals("ARI"))
                .findFirst()
                .orElseThrow();
        assertEquals("Arizona Cardinals", defense.fullName());
        assertEquals("DEF", defense.position());
        assertEquals("Active", defense.status());
        assertEquals(200, defense.adp());
        assertNull(defense.sourceAdp());
    }

    @Test
    void syncIfStaleSkipsWhenTodayWasAlreadyCaptured() {
        when(adpSnapshotRepository.existsBySourceAndCapturedAt(
                "SLEEPER",
                LocalDate.now(ZoneOffset.UTC).atStartOfDay()
        )).thenReturn(true);

        NflPlayerSyncResult result = syncService.syncIfStale();

        assertTrue(result.skipped());
        verifyNoInteractions(sleeperPlayerClient, syncWriter);
    }

    @Test
    void syncRejectsAnUnexpectedlySmallResponseBeforeWriting() {
        when(sleeperPlayerClient.fetchActivePlayers()).thenReturn(eligiblePlayerResponse(1));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                syncService::syncNow
        );

        assertTrue(exception.getMessage().contains("unexpectedly small"));
        verifyNoInteractions(syncWriter);
    }

    private Map<String, SleeperPlayerDto> eligiblePlayerResponse(int count) {
        Map<String, SleeperPlayerDto> response = new HashMap<>();
        for (int index = 0; index < count; index++) {
            String id = Integer.toString(index);
            response.put(id, new SleeperPlayerDto(
                    id,
                    "Player " + index,
                    null,
                    null,
                    "QB",
                    "TEST",
                    "Active",
                    true,
                    index + 1
            ));
        }
        return response;
    }
}
