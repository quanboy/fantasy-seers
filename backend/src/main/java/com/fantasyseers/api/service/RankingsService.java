package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.RankingsDto;
import com.fantasyseers.api.entity.ConsensusRanking;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.entity.UserRanking;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import com.fantasyseers.api.repository.UserRankingRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RankingsService {

    private final UserRankingRepository userRankingRepository;
    private final ConsensusRankingRepository consensusRankingRepository;
    private final NflPlayerRepository nflPlayerRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public RankingsDto.MasterSheetDto getUserSheet(Long userId) {
        List<UserRanking> userRankings = userRankingRepository.findByUserIdOrderByOverallRankAsc(userId);

        if (userRankings.isEmpty()) {
            // Fall back to consensus rankings
            List<RankingsDto.PlayerRankingDto> consensus = consensusRankingRepository
                    .findAllByOrderByOverallRankAsc()
                    .stream()
                    .map(cr -> new RankingsDto.PlayerRankingDto(
                            cr.getPlayer().getId(),
                            cr.getPlayer().getSleeperId(),
                            cr.getPlayer().getFullName(),
                            cr.getPlayer().getPosition(),
                            cr.getPlayer().getNflTeam(),
                            cr.getOverallRank(),
                            cr.getPositionalRank(),
                            cr.getPlayer().getAdp(),
                            cr.getOverallRank()
                    ))
                    .toList();
            return new RankingsDto.MasterSheetDto(consensus, true);
        }

        // Build a map of playerId -> consensus overall rank
        Map<Long, Integer> consensusRankMap = consensusRankingRepository
                .findAllByOrderByOverallRankAsc()
                .stream()
                .collect(Collectors.toMap(
                        cr -> cr.getPlayer().getId(),
                        ConsensusRanking::getOverallRank
                ));

        List<RankingsDto.PlayerRankingDto> rankings = userRankings.stream()
                .map(ur -> new RankingsDto.PlayerRankingDto(
                        ur.getPlayer().getId(),
                        ur.getPlayer().getSleeperId(),
                        ur.getPlayer().getFullName(),
                        ur.getPlayer().getPosition(),
                        ur.getPlayer().getNflTeam(),
                        ur.getOverallRank(),
                        ur.getPositionalRank(),
                        ur.getPlayer().getAdp(),
                        consensusRankMap.get(ur.getPlayer().getId())
                ))
                .toList();
        return new RankingsDto.MasterSheetDto(rankings, false);
    }

    @Transactional
    public void saveUserSheet(Long userId, RankingsDto.SaveRankingsRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Validate no duplicate playerIds
        Set<Long> playerIds = new HashSet<>();
        for (var entry : request.rankings()) {
            if (!playerIds.add(entry.playerId())) {
                throw new IllegalArgumentException("Duplicate player ID: " + entry.playerId());
            }
        }

        userRankingRepository.deleteAllByUserId(userId);

        List<UserRanking> rankings = request.rankings().stream()
                .map(entry -> {
                    NflPlayer player = nflPlayerRepository.findById(entry.playerId())
                            .orElseThrow(() -> new IllegalArgumentException("Player not found: " + entry.playerId()));
                    return UserRanking.builder()
                            .user(user)
                            .player(player)
                            .overallRank(entry.overallRank())
                            .positionalRank(entry.positionalRank())
                            .build();
                })
                .toList();

        userRankingRepository.saveAll(rankings);
    }
}
