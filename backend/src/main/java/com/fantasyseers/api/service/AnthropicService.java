package com.fantasyseers.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Handles all communication with the Anthropic Messages API.
 */
@Service
@RequiredArgsConstructor
public class AnthropicService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-sonnet-4-20250514";
    private static final String API_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 500;

    private final RestTemplate restTemplate;

    @Value("${anthropic.api-key}")
    private String apiKey;

    /**
     * Sends the user's question to Claude with the schema as system prompt.
     * Returns only the raw SQL string from Claude's response.
     */
    public String generateSql(String userQuestion, String schemaPrompt) {
        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", MAX_TOKENS,
                "system", schemaPrompt,
                "messages", List.of(
                        Map.of("role", "user", "content", userQuestion)
                )
        );

        return callAnthropic(body);
    }

    /**
     * Asks Claude to summarize raw SQL results as a plain English answer.
     */
    public String formatResults(String sqlResults, String originalQuestion) {
        String systemPrompt = """
                You are a helpful data analyst for Fantasy Seers, a fantasy sports prediction platform.
                The user asked a question and a SQL query was run to answer it.
                Summarize the query results as a clear, concise plain English answer.
                Do not include any SQL or technical details. Just answer the question naturally.
                If the results are empty, say so clearly.
                """;

        String userMessage = "Question: " + originalQuestion + "\n\nQuery results:\n" + sqlResults;

        Map<String, Object> body = Map.of(
                "model", MODEL,
                "max_tokens", MAX_TOKENS,
                "system", systemPrompt,
                "messages", List.of(
                        Map.of("role", "user", "content", userMessage)
                )
        );

        return callAnthropic(body);
    }

    @SuppressWarnings("unchecked")
    private String callAnthropic(Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", API_VERSION);

        ResponseEntity<Map> response = restTemplate.exchange(
                API_URL,
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("content")) {
            throw new RuntimeException("Empty response from Anthropic API");
        }

        List<Map<String, Object>> content = (List<Map<String, Object>>) responseBody.get("content");
        if (content.isEmpty()) {
            throw new RuntimeException("No content in Anthropic API response");
        }

        return ((String) content.get(0).get("text")).strip();
    }
}
