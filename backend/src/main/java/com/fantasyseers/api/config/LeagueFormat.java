package com.fantasyseers.api.config;

/**
 * The single scoring format used for the 2026 season.
 *
 * Keep CONFIRMED false until the real league settings are known. Snapshot
 * locking must refuse to run while the format remains provisional.
 */
public final class LeagueFormat {

    public static final String SCORING_FORMAT = "FULL_PPR";
    public static final boolean SUPERFLEX = false;
    public static final boolean CONFIRMED = false;

    private LeagueFormat() {
    }
}
