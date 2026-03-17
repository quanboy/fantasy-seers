package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.LeaderboardDto;
import com.fantasyseers.api.entity.FriendGroup;
import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.repository.FriendGroupRepository;
import com.fantasyseers.api.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final VoteRepository voteRepository;
    private final FriendGroupRepository friendGroupRepository;

    @Transactional(readOnly = true)
    public LeaderboardDto.LeaderboardResponse getGlobalLeaderboard() {
        List<Object[]> rows = voteRepository.getGlobalLeaderboard(
                Prop.Status.RESOLVED,
                com.fantasyseers.api.entity.Vote.Choice.YES,
                com.fantasyseers.api.entity.Vote.Choice.NO,
                Prop.Result.YES,
                Prop.Result.NO
        );
        return buildResponse(rows);
    }

    @Transactional(readOnly = true)
    public LeaderboardDto.LeaderboardResponse getGroupLeaderboard(Long groupId, String username) {
        FriendGroup group = friendGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(username));
        if (!isMember) {
            throw new AccessDeniedException("Not a member of this group");
        }

        List<Object[]> rows = voteRepository.getGroupLeaderboard(
                Prop.Status.RESOLVED,
                groupId,
                com.fantasyseers.api.entity.Vote.Choice.YES,
                com.fantasyseers.api.entity.Vote.Choice.NO,
                Prop.Result.YES,
                Prop.Result.NO
        );
        return buildResponse(rows);
    }

    private LeaderboardDto.LeaderboardResponse buildResponse(List<Object[]> rows) {
        List<LeaderboardDto.LeaderboardEntry> sorted = rows.stream()
                .map(r -> {
                    String username = (String) r[0];
                    long total = ((Number) r[1]).longValue();
                    long correct = ((Number) r[2]).longValue();
                    double accuracy = total > 0
                            ? BigDecimal.valueOf(correct * 100.0 / total)
                                .setScale(1, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    return new LeaderboardDto.LeaderboardEntry(0, username, total, correct, accuracy);
                })
                .sorted(Comparator.comparingDouble(LeaderboardDto.LeaderboardEntry::accuracy).reversed()
                        .thenComparing(Comparator.comparingLong(LeaderboardDto.LeaderboardEntry::totalPicks).reversed()))
                .toList();

        List<LeaderboardDto.LeaderboardEntry> ranked = IntStream.range(0, sorted.size())
                .mapToObj(i -> new LeaderboardDto.LeaderboardEntry(
                        i + 1,
                        sorted.get(i).username(),
                        sorted.get(i).totalPicks(),
                        sorted.get(i).correctPicks(),
                        sorted.get(i).accuracy()
                ))
                .toList();

        return new LeaderboardDto.LeaderboardResponse(ranked);
    }
}
