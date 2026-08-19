package com.fantasyseers.api.entity;

import com.fantasyseers.api.config.LeagueFormat;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "board_snapshots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "season", "snapshot_type"})
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BoardSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Integer season;

    @Enumerated(EnumType.STRING)
    @Column(name = "snapshot_type", nullable = false, length = 20)
    @Builder.Default
    private SnapshotType snapshotType = SnapshotType.PRESEASON;

    @Column(name = "scoring_format", nullable = false, length = 20)
    @Builder.Default
    private String scoringFormat = LeagueFormat.DEFAULT_SCORING_FORMAT;

    @Column(nullable = false)
    @Builder.Default
    private Boolean superflex = LeagueFormat.DEFAULT_SUPERFLEX;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SnapshotEntry> entries = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Transient
    public boolean isLocked() {
        return lockedAt != null;
    }
}
