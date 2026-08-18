package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.AdpSnapshot;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.repository.AdpSnapshotRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NflPlayerSyncWriter {

    private static final String SLEEPER_SOURCE = "SLEEPER";

    private final NflPlayerRepository nflPlayerRepository;
    private final AdpSnapshotRepository adpSnapshotRepository;

    @Transactional
    public NflPlayerSyncResult replaceActivePlayers(
            List<NflPlayerSyncCandidate> candidates,
            LocalDateTime syncTime
    ) {
        Set<String> incomingIds = new HashSet<>();
        for (NflPlayerSyncCandidate candidate : candidates) {
            if (!incomingIds.add(candidate.sleeperId())) {
                throw new IllegalArgumentException("Duplicate Sleeper player ID: " + candidate.sleeperId());
            }
        }

        int deactivated = (int) nflPlayerRepository.findAllByActiveTrue().stream()
                .filter(player -> !incomingIds.contains(player.getSleeperId()))
                .count();

        nflPlayerRepository.markAllInactive();

        Map<String, NflPlayer> existingBySleeperId = new HashMap<>();
        for (NflPlayer player : nflPlayerRepository.findAllBySleeperIdIn(incomingIds)) {
            existingBySleeperId.put(player.getSleeperId(), player);
        }

        int created = 0;
        List<NflPlayer> playersToSave = new ArrayList<>(candidates.size());
        for (NflPlayerSyncCandidate candidate : candidates) {
            NflPlayer player = existingBySleeperId.get(candidate.sleeperId());
            if (player == null) {
                player = new NflPlayer();
                player.setSleeperId(candidate.sleeperId());
                created++;
            }

            player.setFullName(candidate.fullName());
            player.setPosition(candidate.position());
            player.setNflTeam(candidate.nflTeam());
            player.setStatus(candidate.status());
            player.setActive(true);
            player.setAdp(candidate.adp());
            player.setUpdatedAt(syncTime);
            playersToSave.add(player);
        }

        List<NflPlayer> savedPlayers = nflPlayerRepository.saveAll(playersToSave);
        nflPlayerRepository.flush();

        Map<String, NflPlayer> savedBySleeperId = new HashMap<>();
        for (NflPlayer player : savedPlayers) {
            savedBySleeperId.put(player.getSleeperId(), player);
        }
        int snapshotsCaptured = captureDailyAdp(candidates, savedBySleeperId, syncTime);

        return new NflPlayerSyncResult(
                candidates.size(),
                created,
                candidates.size() - created,
                deactivated,
                snapshotsCaptured,
                false
        );
    }

    private int captureDailyAdp(
            List<NflPlayerSyncCandidate> candidates,
            Map<String, NflPlayer> savedBySleeperId,
            LocalDateTime syncTime
    ) {
        LocalDateTime capturedAt = syncTime.toLocalDate().atStartOfDay();
        List<NflPlayerSyncCandidate> rankedCandidates = candidates.stream()
                .filter(candidate -> candidate.sourceAdp() != null)
                .toList();
        if (rankedCandidates.isEmpty()) {
            return 0;
        }

        List<Long> playerIds = rankedCandidates.stream()
                .map(candidate -> savedBySleeperId.get(candidate.sleeperId()).getId())
                .toList();
        Map<Long, AdpSnapshot> existingByPlayerId = new HashMap<>();
        for (AdpSnapshot snapshot : adpSnapshotRepository
                .findAllBySourceAndCapturedAtAndPlayerIdIn(SLEEPER_SOURCE, capturedAt, playerIds)) {
            existingByPlayerId.put(snapshot.getPlayer().getId(), snapshot);
        }

        List<AdpSnapshot> snapshotsToSave = new ArrayList<>(rankedCandidates.size());
        for (NflPlayerSyncCandidate candidate : rankedCandidates) {
            NflPlayer player = savedBySleeperId.get(candidate.sleeperId());
            AdpSnapshot snapshot = existingByPlayerId.get(player.getId());
            if (snapshot == null) {
                snapshot = AdpSnapshot.builder()
                        .player(player)
                        .source(SLEEPER_SOURCE)
                        .capturedAt(capturedAt)
                        .build();
            }
            snapshot.setValue(candidate.sourceAdp());
            snapshotsToSave.add(snapshot);
        }

        adpSnapshotRepository.saveAll(snapshotsToSave);
        return snapshotsToSave.size();
    }
}
