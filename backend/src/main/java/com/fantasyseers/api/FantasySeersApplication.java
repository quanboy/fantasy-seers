package com.fantasyseers.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FantasySeersApplication {
    public static void main(String[] args) {
        SpringApplication.run(FantasySeersApplication.class, args);
    }
}
