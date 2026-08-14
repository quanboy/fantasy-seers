package com.fantasyseers.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        name = "sleeper.players.sync-enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class NflPlayerSyncScheduler {

    private final NflPlayerSyncService syncService;

    @EventListener(ApplicationReadyEvent.class)
    public void syncAfterStartup() {
        runSync();
    }

    @Scheduled(cron = "${sleeper.players.sync-cron}", zone = "UTC")
    public void syncDaily() {
        runSync();
    }

    private void runSync() {
        try {
            NflPlayerSyncResult result = syncService.syncIfStale();
            if (result.skipped()) {
                log.info("Skipped Sleeper NFL player sync; current data is less than 24 hours old");
                return;
            }
            log.info(
                    "Sleeper NFL player sync complete: fetched={}, created={}, updated={}, deactivated={}",
                    result.fetched(),
                    result.created(),
                    result.updated(),
                    result.deactivated()
            );
        } catch (RuntimeException exception) {
            log.error("Sleeper NFL player sync failed; existing player universe was preserved", exception);
        }
    }
}
