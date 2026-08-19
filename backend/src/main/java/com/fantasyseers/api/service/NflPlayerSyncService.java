package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.SleeperPlayerDto;
import com.fantasyseers.api.entity.AdpSnapshot;
import com.fantasyseers.api.repository.AdpSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NflPlayerSyncService {

    private static final Set<String> ELIGIBLE_POSITIONS = Set.of("QB", "RB", "WR", "TE", "K", "DEF");
    private static final Set<String> INELIGIBLE_STATUSES = Set.of("INACTIVE", "RETIRED");
    private static final int MIN_EXPECTED_PLAYERS = 500;
    private static final int SLEEPER_UNRANKED_SENTINEL = 1_000_000;
    private static final int DEFAULT_DEFENSE_ADP = 200;
    private final SleeperPlayerClient sleeperPlayerClient;
    private final NflPlayerSyncWriter syncWriter;
    private final AdpSnapshotRepository adpSnapshotRepository;

    public synchronized NflPlayerSyncResult syncIfStale() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        boolean fresh = adpSnapshotRepository.existsBySourceAndCapturedAt(
                AdpSnapshot.SLEEPER_SOURCE,
                today.atStartOfDay()
        );
        return fresh ? NflPlayerSyncResult.skippedResult() : syncNow();
    }

    public synchronized NflPlayerSyncResult syncNow() {
        Map<String, SleeperPlayerDto> response = sleeperPlayerClient.fetchActivePlayers();
        List<NflPlayerSyncCandidate> candidates = new ArrayList<>();

        for (Map.Entry<String, SleeperPlayerDto> entry : response.entrySet()) {
            NflPlayerSyncCandidate candidate = toCandidate(entry.getKey(), entry.getValue());
            if (candidate != null) {
                candidates.add(candidate);
            }
        }

        if (candidates.size() < MIN_EXPECTED_PLAYERS) {
            throw new IllegalStateException(
                    "Sleeper active player response was unexpectedly small: " + candidates.size()
            );
        }

        candidates.sort(Comparator
                .comparing(NflPlayerSyncCandidate::adp, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(NflPlayerSyncCandidate::fullName)
                .thenComparing(NflPlayerSyncCandidate::sleeperId));

        return syncWriter.replaceActivePlayers(candidates, LocalDateTime.now(ZoneOffset.UTC));
    }

    private NflPlayerSyncCandidate toCandidate(String responseKey, SleeperPlayerDto player) {
        if (player == null || !Boolean.TRUE.equals(player.active())) {
            return null;
        }

        String position = normalize(player.position(), 10);
        if (position == null || !ELIGIBLE_POSITIONS.contains(position)) {
            return null;
        }

        String team = normalize(player.team(), 10);
        String status = normalize(firstNonBlank(player.status(), "Active"), 30);
        // Sleeper's active flag alone includes retired players and stale roster records.
        if (team == null || INELIGIBLE_STATUSES.contains(status.toUpperCase(Locale.ROOT))) {
            return null;
        }

        String sleeperId = normalize(firstNonBlank(player.playerId(), responseKey), 50);
        String fullName = normalize(firstNonBlank(
                player.fullName(),
                joinName(player.firstName(), player.lastName())
        ), 150);
        if (sleeperId == null || fullName == null) {
            return null;
        }

        Integer sourceAdp = player.searchRank();
        if (sourceAdp != null && (sourceAdp <= 0 || sourceAdp >= SLEEPER_UNRANKED_SENTINEL)) {
            sourceAdp = null;
        }
        Integer boardAdp = sourceAdp;
        if (boardAdp == null && position.equals("DEF")) {
            boardAdp = DEFAULT_DEFENSE_ADP;
        }

        return new NflPlayerSyncCandidate(
                sleeperId,
                fullName,
                position,
                team,
                status,
                boardAdp,
                sourceAdp
        );
    }

    private String joinName(String firstName, String lastName) {
        String first = normalize(firstName, 150);
        String last = normalize(lastName, 150);
        if (first == null) return last;
        if (last == null) return first;
        return first + " " + last;
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred : fallback;
    }

    private String normalize(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }
}
