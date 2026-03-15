package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.repository.PropRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PropClosingScheduler {

    private final PropRepository propRepository;

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void closeExpiredProps() {
        List<Prop> expired = propRepository.findOpenPropsClosedBefore(Prop.Status.OPEN, LocalDateTime.now());
        if (expired.isEmpty()) return;

        for (Prop prop : expired) {
            prop.setStatus(Prop.Status.CLOSED);
        }
        propRepository.saveAll(expired);
        log.info("Auto-closed {} expired prop(s)", expired.size());
    }
}
