package com.fantasyseers.api.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "props")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Prop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Sport sport;

    private String gameId;
    private String statKey;
    private BigDecimal statThreshold;

    @Enumerated(EnumType.STRING)
    private StatDirection statDirection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isAdminProp = false;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Scope scope = Scope.GROUP;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.OPEN;

    @Enumerated(EnumType.STRING)
    private Result result;

    @Column(nullable = false)
    private LocalDateTime closesAt;

    private LocalDateTime resolvedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private Integer minWager;

    @Column
    private Integer maxWager;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "prop_groups",
        joinColumns = @JoinColumn(name = "prop_id"),
        inverseJoinColumns = @JoinColumn(name = "group_id")
    )
    @Builder.Default
    private Set<FriendGroup> groups = new HashSet<>();

    public enum Sport        { NFL, NBA }
    public enum StatDirection { OVER, UNDER }
    public enum Scope        { GROUP, PUBLIC, FRIENDS, FRIENDS_AND_GROUP }
    public enum Status       { OPEN, CLOSED, RESOLVED, PENDING }
    public enum Result       { YES, NO }
}
