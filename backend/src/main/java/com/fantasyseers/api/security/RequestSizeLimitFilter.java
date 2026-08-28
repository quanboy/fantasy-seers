package com.fantasyseers.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RequestSizeLimitFilter extends OncePerRequestFilter {

    private static final long MAX_BODY_BYTES = 512 * 1024; // 512 KB

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        long declared = request.getContentLengthLong();
        if (declared > MAX_BODY_BYTES) {
            reject(response);
            return;
        }

        filterChain.doFilter(new LimitedRequestWrapper(request, MAX_BODY_BYTES), response);
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Request body too large.\"}");
    }

    private static class LimitedRequestWrapper extends HttpServletRequestWrapper {
        private final long limit;

        LimitedRequestWrapper(HttpServletRequest request, long limit) {
            super(request);
            this.limit = limit;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return new LimitedInputStream(super.getInputStream(), limit);
        }
    }

    private static class LimitedInputStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final long limit;
        private long bytesRead;

        LimitedInputStream(ServletInputStream delegate, long limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            int b = delegate.read();
            if (b != -1 && ++bytesRead > limit) {
                throw new RequestBodyTooLargeException();
            }
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (len == 0) return 0;
            int maxRead = (int) Math.min(len, limit - bytesRead + 1);
            if (maxRead <= 0) maxRead = 1;
            int n = delegate.read(b, off, maxRead);
            if (n > 0) {
                bytesRead += n;
                if (bytesRead > limit) {
                    throw new RequestBodyTooLargeException();
                }
            }
            return n;
        }

        @Override
        public boolean isFinished() { return delegate.isFinished(); }

        @Override
        public boolean isReady() { return delegate.isReady(); }

        @Override
        public void setReadListener(ReadListener listener) { delegate.setReadListener(listener); }
    }

    public static class RequestBodyTooLargeException extends IOException {
        RequestBodyTooLargeException() {
            super("Request body exceeded the maximum allowed size");
        }
    }
}
