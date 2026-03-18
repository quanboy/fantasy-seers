package com.fantasyseers.api.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "consensus_rankings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsensusRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false, unique = true)
    private NflPlayer player;

    @Column(nullable = false)
    private int overallRank;

    @Column(nullable = false)
    private int positionalRank;
}
