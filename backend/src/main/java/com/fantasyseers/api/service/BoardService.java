package com.fantasyseers.api.service;

import com.fantasyseers.api.config.LeagueFormat;
import com.fantasyseers.api.dto.BoardDto;
import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.dto.RankedPlayerDto;
import com.fantasyseers.api.dto.RankedPlayerResponse;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.ConsensusRanking;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.SnapshotEntry;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.ConsensusRankingRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import com.fantasyseers.api.repository.SnapshotEntryRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BoardService {

    private static final int DEFAULT_RANKING_DEPTH = 300;

    private final BoardSnapshotRepository boardSnapshotRepository;
    private final SnapshotEntryRepository snapshotEntryRepository;
    private final ConsensusRankingRepository consensusRankingRepository;
    private final UserRepository userRepository;
    private final NflPlayerRepository nflPlayerRepository;

    @Transactional
    public BoardDto.BoardResponse createBoard(Long userId, Integer season) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (boardSnapshotRepository.findByUserIdAndSeason(userId, season).isPresent()) {
            throw new IllegalStateException("Board already exists for season " + season);
        }

        BoardSnapshot board = BoardSnapshot.builder()
                .user(user)
                .season(season)
                .snapshotType("PRESEASON")
                .scoringFormat(LeagueFormat.SCORING_FORMAT)
                .superflex(LeagueFormat.SUPERFLEX)
                .build();

        BoardSnapshot saved = boardSnapshotRepository.save(board);
        return toResponse(saved);
    }

    @Transactional
    public BoardDto.BoardResponse upsertEntries(Long boardId, Long userId, List<RankedPlayerDto> entries) {
        BoardSnapshot board = boardSnapshotRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        if (!board.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not own this board");
        }

        stampCurrentLeagueFormat(board);

        List<SnapshotEntry> newEntries = new ArrayList<>();
        for (RankedPlayerDto dto : entries) {
            NflPlayer player = nflPlayerRepository.findById(dto.playerId())
                    .orElseThrow(() -> new IllegalArgumentException("Player not found: " + dto.playerId()));

            SnapshotEntry entry = SnapshotEntry.builder()
                    .snapshot(board)
                    .player(player)
                    .userRank(dto.rank())
                    .build();
            newEntries.add(entry);
        }

        board.getEntries().clear();
        snapshotEntryRepository.flush();

        board.getEntries().addAll(newEntries);
        BoardSnapshot saved = boardSnapshotRepository.save(board);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public BoardDto.BoardResponse getBoard(Long boardId, Long userId) {
        BoardSnapshot board = boardSnapshotRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        if (!board.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not own this board");
        }

        List<SnapshotEntry> ordered = snapshotEntryRepository.findAllBySnapshotIdOrderByUserRankAsc(boardId);
        board.setEntries(ordered);

        return toResponse(board);
    }

    @Transactional
    public BoardSheetResponse getMySheet(Long userId, Integer season) {
        BoardSnapshot board = boardSnapshotRepository.findByUserIdAndSeason(userId, season)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));
                    BoardSnapshot newBoard = BoardSnapshot.builder()
                            .user(user)
                            .season(season)
                            .snapshotType("PRESEASON")
                            .scoringFormat(LeagueFormat.SCORING_FORMAT)
                            .superflex(LeagueFormat.SUPERFLEX)
                            .build();
                    return boardSnapshotRepository.save(newBoard);
                });

        List<SnapshotEntry> entries = snapshotEntryRepository.findAllBySnapshotIdOrderByUserRankAsc(board.getId());
        boolean isDefault = entries.isEmpty();

        List<RankedPlayerResponse> rankings = isDefault
                ? getDefaultRankings()
                : toRankedPlayerResponses(entries);

        return new BoardSheetResponse(
                board.getId(),
                season,
                board.getScoringFormat(),
                board.getSuperflex(),
                isDefault,
                rankings
        );
    }

    private RankedPlayerResponse toRankedPlayerResponse(ConsensusRanking ranking) {
        NflPlayer player = ranking.getPlayer();
        return new RankedPlayerResponse(
                player.getId(),
                player.getFullName(),
                player.getPosition(),
                player.getNflTeam(),
                player.getAdp() != null ? player.getAdp().doubleValue() : null,
                ranking.getOverallRank(),
                ranking.getPositionalRank()
        );
    }

    private List<RankedPlayerResponse> getDefaultRankings() {
        List<NflPlayer> activePlayers = nflPlayerRepository.findAllByActiveTrueOrderByAdpAscFullNameAscSleeperIdAsc(
                PageRequest.of(0, DEFAULT_RANKING_DEPTH)
        );
        if (activePlayers.isEmpty()) {
            return consensusRankingRepository.findAllByOrderByOverallRankAsc().stream()
                    .map(this::toRankedPlayerResponse)
                    .toList();
        }

        Map<String, Integer> positionCounters = new HashMap<>();
        List<RankedPlayerResponse> rankings = new ArrayList<>();
        for (int index = 0; index < activePlayers.size(); index++) {
            NflPlayer player = activePlayers.get(index);
            int positionalRank = positionCounters.merge(player.getPosition(), 1, Integer::sum);
            rankings.add(new RankedPlayerResponse(
                    player.getId(),
                    player.getFullName(),
                    player.getPosition(),
                    player.getNflTeam(),
                    player.getAdp() != null ? player.getAdp().doubleValue() : null,
                    index + 1,
                    positionalRank
            ));
        }
        return rankings;
    }

    private List<RankedPlayerResponse> toRankedPlayerResponses(List<SnapshotEntry> entries) {
        Map<String, Integer> posCounters = new HashMap<>();
        return entries.stream()
                .map(entry -> {
                    NflPlayer player = entry.getPlayer();
                    String position = player.getPosition();
                    int positionalRank = posCounters.merge(position, 1, Integer::sum);
                    return new RankedPlayerResponse(
                            player.getId(),
                            player.getFullName(),
                            position,
                            player.getNflTeam(),
                            player.getAdp() != null ? player.getAdp().doubleValue() : null,
                            entry.getUserRank(),
                            positionalRank
                    );
                })
                .toList();
    }

    private BoardDto.BoardResponse toResponse(BoardSnapshot board) {
        List<BoardDto.EntryResponse> entryResponses = board.getEntries().stream()
                .map(e -> new BoardDto.EntryResponse(
                        e.getId(),
                        e.getPlayer().getId(),
                        e.getPlayer().getFullName(),
                        e.getPlayer().getPosition(),
                        e.getPlayer().getNflTeam(),
                        e.getUserRank(),
                        e.getCreatedAt()
                ))
                .toList();

        return new BoardDto.BoardResponse(
                board.getId(),
                board.getUser().getUsername(),
                board.getSeason(),
                board.getSnapshotType(),
                board.getScoringFormat(),
                board.getSuperflex(),
                entryResponses,
                board.getCreatedAt()
        );
    }

    private void stampCurrentLeagueFormat(BoardSnapshot board) {
        board.setScoringFormat(LeagueFormat.SCORING_FORMAT);
        board.setSuperflex(LeagueFormat.SUPERFLEX);
    }
}
