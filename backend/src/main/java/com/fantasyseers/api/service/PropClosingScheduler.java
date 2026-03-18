package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.repository.PropRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class PropClosingScheduler {

    private final PropRepository propRepository;

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void closeExpiredProps() {
        int closed = propRepository.bulkCloseExpiredProps(Prop.Status.OPEN, Prop.Status.CLOSED, LocalDateTime.now());
        if (closed > 0) {
            log.info("Auto-closed {} expired prop(s)", closed);
        }
    }
}
