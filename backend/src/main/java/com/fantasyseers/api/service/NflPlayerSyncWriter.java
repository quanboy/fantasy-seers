package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.NflPlayer;
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

    private final NflPlayerRepository nflPlayerRepository;

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

        nflPlayerRepository.saveAll(playersToSave);
        return new NflPlayerSyncResult(
                candidates.size(),
                created,
                candidates.size() - created,
                deactivated,
                false
        );
    }
}
