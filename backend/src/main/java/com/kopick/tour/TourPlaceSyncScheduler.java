package com.kopick.tour;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(prefix = "tour.sync", name = "enabled", havingValue = "true")
public class TourPlaceSyncScheduler {
    private static final Logger log = LoggerFactory.getLogger(TourPlaceSyncScheduler.class);
    private final TourPlaceStoreService store;
    private final AtomicBoolean syncing = new AtomicBoolean(false);

    public TourPlaceSyncScheduler(TourPlaceStoreService store) {
        this.store = store;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seedWhenEmpty() {
        if (!store.hasData()) runAsync("initial");
    }

    @Scheduled(cron = "0 20 4 * * *", zone = "Asia/Seoul")
    public void refreshDaily() {
        runAsync("daily");
    }

    private void runAsync(String reason) {
        if (!syncing.compareAndSet(false, true)) return;
        CompletableFuture.runAsync(() -> {
            try {
                int count = store.syncAll();
                log.info("TourAPI {} database sync completed: {} rows", reason, count);
            } catch (Exception error) {
                log.warn("TourAPI {} database sync skipped after failure: {}", reason, error.getMessage());
            } finally {
                syncing.set(false);
            }
        });
    }
}
