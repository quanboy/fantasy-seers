package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.BoardDto;
import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.dto.RankedPlayerDto;
import com.fantasyseers.api.dto.RankedPlayerResponse;
import com.fantasyseers.api.entity.BoardSnapshot;
import com.fantasyseers.api.entity.NflPlayer;
import com.fantasyseers.api.entity.SnapshotEntry;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.BoardSnapshotRepository;
import com.fantasyseers.api.repository.NflPlayerRepository;
import com.fantasyseers.api.repository.SnapshotEntryRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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

    private final BoardSnapshotRepository boardSnapshotRepository;
    private final SnapshotEntryRepository snapshotEntryRepository;
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

        // Validate all player IDs before making changes
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

        // Clear existing entries and replace
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

        // Force load entries ordered by rank
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
                            .build();
                    return boardSnapshotRepository.save(newBoard);
                });

        List<SnapshotEntry> entries = snapshotEntryRepository.findAllBySnapshotIdOrderByUserRankAsc(board.getId());
        boolean isDefault = entries.isEmpty();

        Map<String, Integer> posCounters = new HashMap<>();
        List<RankedPlayerResponse> rankings = entries.stream()
                .map(e -> {
                    NflPlayer p = e.getPlayer();
                    String pos = p.getPosition();
                    int posRank = posCounters.merge(pos, 1, Integer::sum);
                    return new RankedPlayerResponse(
                            p.getId(),
                            p.getFullName(),
                            pos,
                            p.getNflTeam(),
                            p.getAdp() != null ? p.getAdp().doubleValue() : null,
                            e.getUserRank(),
                            posRank
                    );
                })
                .toList();

        return new BoardSheetResponse(board.getId(), season, isDefault, rankings);
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
                entryResponses,
                board.getCreatedAt()
        );
    }
}
