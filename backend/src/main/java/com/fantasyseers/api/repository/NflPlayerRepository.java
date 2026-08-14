package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.NflPlayer;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NflPlayerRepository extends JpaRepository<NflPlayer, Long> {

    List<NflPlayer> findAllByOrderByFullNameAsc();

    List<NflPlayer> findAllByActiveTrue();

    List<NflPlayer> findAllByActiveTrueOrderByAdpAscFullNameAscSleeperIdAsc(Pageable pageable);

    List<NflPlayer> findAllBySleeperIdIn(Collection<String> sleeperIds);

    @Query("select max(player.updatedAt) from NflPlayer player where player.active = true")
    Optional<LocalDateTime> findLatestActiveUpdate();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update NflPlayer player set player.active = false where player.active = true")
    int markAllInactive();
}
