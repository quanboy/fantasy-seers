package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.SleeperPlayerDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class SleeperPlayerClient {

    private static final ParameterizedTypeReference<Map<String, SleeperPlayerDto>> RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public SleeperPlayerClient(
            RestClient.Builder restClientBuilder,
            @Value("${sleeper.base-url}") String baseUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(30_000);

        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.USER_AGENT, "FantasySeers/1.0")
                .requestFactory(requestFactory)
                .build();
    }

    public Map<String, SleeperPlayerDto> fetchActivePlayers() {
        Map<String, SleeperPlayerDto> players = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/players/nfl")
                        .queryParam("active", true)
                        .build())
                .retrieve()
                .body(RESPONSE_TYPE);

        if (players == null || players.isEmpty()) {
            throw new IllegalStateException("Sleeper returned no active NFL players");
        }
        return players;
    }
}
