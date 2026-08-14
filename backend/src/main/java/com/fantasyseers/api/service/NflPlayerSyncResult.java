package com.fantasyseers.api.service;

public record NflPlayerSyncResult(
        int fetched,
        int created,
        int updated,
        int deactivated,
        boolean skipped
) {
    public static NflPlayerSyncResult skippedResult() {
        return new NflPlayerSyncResult(0, 0, 0, 0, true);
    }
}
