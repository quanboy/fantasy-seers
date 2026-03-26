package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.NflPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NflPlayerRepository extends JpaRepository<NflPlayer, Long> {

    List<NflPlayer> findAllByOrderByFullNameAsc();
}
