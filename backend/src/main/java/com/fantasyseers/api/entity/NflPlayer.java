package com.fantasyseers.api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "nfl_players")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NflPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String sleeperId;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, length = 10)
    private String position;

    @Column(length = 10)
    private String nflTeam;

    @Column(length = 30)
    private String status;

    @Column
    private Integer adp;

    @Column
    private LocalDateTime updatedAt;
}
