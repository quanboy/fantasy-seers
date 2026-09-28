package com.fantasyseers.api.controller;

import com.fantasyseers.api.config.SecurityConfig;
import com.fantasyseers.api.dto.BoardSheetResponse;
import com.fantasyseers.api.dto.RankedPlayerResponse;
import com.fantasyseers.api.repository.PropRepository;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.security.JwtUtils;
import com.fantasyseers.api.security.TokenBlacklistService;
import com.fantasyseers.api.service.BoardService;
import com.fantasyseers.api.service.PropService;
import com.fantasyseers.api.service.VoteService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {BoardController.class, VoteController.class})
@Import(SecurityConfig.class)
class PublicBoardAccessTest {

    @Autowired MockMvc mockMvc;

    @MockBean BoardService boardService;
    @MockBean UserRepository userRepository;
    @MockBean VoteService voteService;
    @MockBean PropService propService;
    @MockBean PropRepository propRepository;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;
    @MockBean TokenBlacklistService tokenBlacklistService;
    // AppConfig is a WebMvcConfigurer, so the slice loads its @EnableJpaAuditing.
    @MockBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void guestCanReadDefaultSheet() throws Exception {
        when(boardService.getDefaultSheet(2026)).thenReturn(new BoardSheetResponse(
                null, 2026, "HALF_PPR", false, false, null, true,
                List.of(new RankedPlayerResponse(21L, "sleeper-21", "Player One", "WR", "BUF", 17.0, 1, 1))
        ));

        mockMvc.perform(get("/api/v1/boards/default").param("season", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isDefault").value(true))
                .andExpect(jsonPath("$.scoringFormat").value("HALF_PPR"))
                .andExpect(jsonPath("$.rankings[0].sleeperId").value("sleeper-21"));
    }

    @Test
    void guestCannotReadPersonalBoards() throws Exception {
        mockMvc.perform(get("/api/v1/boards/my-sheet")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/boards/11")).andExpect(status().isUnauthorized());
        verifyNoInteractions(boardService);
    }

    @Test
    void guestCannotWriteBoards() throws Exception {
        mockMvc.perform(post("/api/v1/boards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"season\":2026}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/v1/boards/11/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(boardService);
    }

    @Test
    void guestCannotVote() throws Exception {
        mockMvc.perform(post("/api/props/5/vote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"choice\":\"YES\",\"wagerAmount\":50}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(voteService);
    }

    @Test
    @WithMockUser(roles = "USER")
    void signedInUserWithoutAdminRoleIsForbiddenNotUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/admin/props/pending")).andExpect(status().isForbidden());
    }

    @Test
    void errorDispatchKeepsTheOriginalStatus() throws Exception {
        // A real container forwards denied requests to /error without re-running the JWT filter.
        mockMvc.perform(get("/error").with(request -> {
                    request.setDispatcherType(DispatcherType.ERROR);
                    request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 403);
                    return request;
                }))
                .andExpect(status().isForbidden());
    }
}
