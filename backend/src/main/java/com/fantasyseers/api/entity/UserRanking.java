package com.fantasyseers.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_rankings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "player_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private NflPlayer player;

    @Column(nullable = false)
    private int overallRank;

    @Column(nullable = false)
    private int positionalRank;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    private void setTimestamp() {
        this.updatedAt = LocalDateTime.now();
    }
}
