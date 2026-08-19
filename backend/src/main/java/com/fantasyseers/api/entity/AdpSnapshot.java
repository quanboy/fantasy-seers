package com.fantasyseers.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "adp_snapshots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"player_id", "source", "captured_at"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdpSnapshot {

    public static final String SLEEPER_SOURCE = "SLEEPER";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private NflPlayer player;

    @Column(nullable = false, length = 30)
    private String source;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    @Column(nullable = false)
    private Integer value;
}
