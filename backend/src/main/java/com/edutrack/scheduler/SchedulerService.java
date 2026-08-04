package com.edutrack.scheduler;

import com.edutrack.repository.mongodb.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Background housekeeping jobs. Kept intentionally simple: a school
 * deployment runs a single instance, so no distributed-lock is needed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private final NotificationRepository notificationRepository;

    /** Purge expired notifications once a day at 2am server time. */
    @Scheduled(cron = "0 0 2 * * *")
    public void purgeExpiredNotifications() {
        Instant now = Instant.now();
        List<com.edutrack.model.document.Notification> all = notificationRepository.findAll();
        List<com.edutrack.model.document.Notification> expired = all.stream()
                .filter(n -> n.getExpiresAt() != null && n.getExpiresAt().isBefore(now))
                .toList();
        if (!expired.isEmpty()) {
            notificationRepository.deleteAll(expired);
            log.info("Purged {} expired notifications", expired.size());
        }
    }
}
