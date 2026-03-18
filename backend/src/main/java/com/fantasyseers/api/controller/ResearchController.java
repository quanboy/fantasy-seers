package com.fantasyseers.api.controller;

import com.fantasyseers.api.service.AnthropicService;
import com.fantasyseers.api.service.SchemaContextService;
import com.fantasyseers.api.service.SqlValidatorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@RestController
@RequestMapping("/api/research")
@RequiredArgsConstructor
public class ResearchController {

    private final SchemaContextService schemaContextService;
    private final AnthropicService anthropicService;
    private final SqlValidatorService sqlValidatorService;
    @Qualifier("readOnlyJdbcTemplate")
    private final JdbcTemplate readOnlyJdbcTemplate;

    // Per-user rate limiting: username → list of request timestamps
    private static final int MAX_REQUESTS_PER_HOUR = 20;
    private final ConcurrentMap<String, List<Long>> userRequestLog = new ConcurrentHashMap<>();

    public record ResearchRequest(
            @NotBlank @Size(max = 500) String question
    ) {}

    public record ResearchResponse(
            String answer,
            String sql
    ) {}

    @PostMapping
    public ResponseEntity<?> research(
            @Valid @RequestBody ResearchRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String username = userDetails.getUsername();

        // Rate limit: 20 requests per user per hour
        if (isRateLimited(username)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Rate limit exceeded. Maximum " + MAX_REQUESTS_PER_HOUR + " queries per hour."));
        }

        // 1. Build schema prompt
        String schemaPrompt = schemaContextService.buildSystemPrompt();

        // 2. Ask Claude to generate SQL
        String rawSql = anthropicService.generateSql(request.question(), schemaPrompt);

        // Handle Claude saying it can't answer
        if ("CANNOT_ANSWER".equals(rawSql.strip())) {
            return ResponseEntity.ok(new ResearchResponse(
                    "Sorry, I can't answer that question with the available data.", null));
        }

        // 3. Validate the generated SQL
        String validatedSql = sqlValidatorService.validate(rawSql);

        // 4. Execute against read-only datasource
        List<Map<String, Object>> rows = readOnlyJdbcTemplate.queryForList(validatedSql);

        // 5. Format results as plain English
        String sqlResults = formatRowsAsText(rows);
        String answer = anthropicService.formatResults(sqlResults, request.question());

        return ResponseEntity.ok(new ResearchResponse(answer, validatedSql));
    }

    private boolean isRateLimited(String username) {
        long now = System.currentTimeMillis();
        long oneHourAgo = now - 3_600_000;

        List<Long> timestamps = userRequestLog.compute(username, (key, existing) -> {
            java.util.ArrayList<Long> list;
            if (existing == null) {
                list = new java.util.ArrayList<>();
            } else {
                // Prune entries older than 1 hour
                list = new java.util.ArrayList<>();
                for (Long ts : existing) {
                    if (ts > oneHourAgo) list.add(ts);
                }
            }
            list.add(now);
            return list;
        });

        return timestamps.size() > MAX_REQUESTS_PER_HOUR;
    }

    private String formatRowsAsText(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "(no results)";

        StringBuilder sb = new StringBuilder();

        // Header row
        Map<String, Object> first = rows.get(0);
        sb.append(String.join(" | ", first.keySet())).append("\n");

        // Data rows
        for (Map<String, Object> row : rows) {
            sb.append(String.join(" | ",
                    row.values().stream()
                            .map(v -> v == null ? "null" : v.toString())
                            .toList()
            )).append("\n");
        }

        return sb.toString();
    }
}
