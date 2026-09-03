package com.fantasyseers.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTest {

    @Test
    void rejectsEleventhAuthRequestFromSameIpWithinWindow() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(false);

        for (int i = 0; i < 10; i++) {
            assertEquals(200, runAuthRequest(filter, "203.0.113.10").getStatus());
        }

        MockHttpServletResponse rejected = runAuthRequest(filter, "203.0.113.10");
        assertEquals(429, rejected.getStatus());
        assertEquals("{\"message\":\"Too many requests. Please try again later.\"}",
                rejected.getContentAsString());
    }

    @Test
    void ignoresForwardedHeadersWhenProxyTrustIsDisabled() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(false);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = authRequest("203.0.113.20");
            request.addHeader("X-Real-IP", "198.51.100." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertEquals(200, response.getStatus());
        }

        MockHttpServletRequest request = authRequest("203.0.113.20");
        request.addHeader("X-Real-IP", "198.51.100.250");
        MockHttpServletResponse rejected = new MockHttpServletResponse();
        filter.doFilter(request, rejected, new MockFilterChain());

        assertEquals(429, rejected.getStatus());
    }

    private MockHttpServletResponse runAuthRequest(RateLimitFilter filter, String remoteAddress)
            throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(authRequest(remoteAddress), response, new MockFilterChain());
        return response;
    }

    private MockHttpServletRequest authRequest(String remoteAddress) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(remoteAddress);
        return request;
    }
}
