package com.fantasyseers.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * Configures a second, read-only DataSource for AI-generated SQL queries.
 * Uses the fs_readonly Postgres role which has SELECT-only permissions.
 * Lazy-initialized so the app can start and run Flyway migrations
 * (which create the fs_readonly role) before this connection is attempted.
 */
@Configuration
public class ReadOnlyDataSourceConfig {

    @Value("${readonly.datasource.url}")
    private String url;

    @Value("${readonly.datasource.username}")
    private String username;

    @Value("${readonly.datasource.password}")
    private String password;

    @Lazy
    @Bean("readOnlyDataSource")
    public DataSource readOnlyDataSource() {
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }

    @Lazy
    @Bean("readOnlyJdbcTemplate")
    public JdbcTemplate readOnlyJdbcTemplate() {
        return new JdbcTemplate(readOnlyDataSource());
    }
}
