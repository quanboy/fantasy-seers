package com.fantasyseers.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * The single scoring format used for the 2026 season.
 */
@Component
@ConfigurationProperties(prefix = "league-format")
@Getter
@Setter
public class LeagueFormat {

    public static final String DEFAULT_SCORING_FORMAT = "FULL_PPR";
    public static final boolean DEFAULT_SUPERFLEX = false;

    private String scoringFormat = DEFAULT_SCORING_FORMAT;
    private boolean superflex = DEFAULT_SUPERFLEX;
    private boolean confirmed = false;
}
