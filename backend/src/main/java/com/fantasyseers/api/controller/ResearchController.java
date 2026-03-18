package com.fantasyseers.api.controller;

import com.fantasyseers.api.service.AnthropicService;
import com.fantasyseers.api.service.RateLimitService;
import com.fantasyseers.api.service.SchemaContextService;
import com.fantasyseers.api.service.SqlValidatorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/research")
@RequiredArgsConstructor
public class ResearchController {

    private final SchemaContextService schemaContextService;
    private final AnthropicService anthropicService;
    private final SqlValidatorService sqlValidatorService;
    private final RateLimitService rateLimitService;
    @Lazy @Qualifier("readOnlyJdbcTemplate")
    private final JdbcTemplate readOnlyJdbcTemplate;

    private static final int MAX_REQUESTS_PER_HOUR = 20;
    private static final String ENDPOINT_KEY = "research";

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
        if (rateLimitService.isRateLimited(username, ENDPOINT_KEY, MAX_REQUESTS_PER_HOUR, 1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Rate limit exceeded. Maximum " + MAX_REQUESTS_PER_HOUR + " queries per hour."));
        }
        rateLimitService.recordRequest(username, ENDPOINT_KEY);

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
