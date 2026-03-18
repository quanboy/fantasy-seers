package com.fantasyseers.api.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Validates AI-generated SQL before execution against the read-only database.
 * Defense-in-depth: even though the DB role is read-only, we reject unsafe SQL
 * at the application layer to fail fast with a clear error.
 */
@Service
public class SqlValidatorService {

    private static final List<Pattern> FORBIDDEN_PATTERNS = List.of(
            wordBoundaryPattern("INSERT"),
            wordBoundaryPattern("UPDATE"),
            wordBoundaryPattern("DELETE"),
            wordBoundaryPattern("DROP"),
            wordBoundaryPattern("ALTER"),
            wordBoundaryPattern("CREATE"),
            wordBoundaryPattern("TRUNCATE"),
            wordBoundaryPattern("GRANT"),
            wordBoundaryPattern("REVOKE"),
            wordBoundaryPattern("EXEC"),
            wordBoundaryPattern("EXECUTE"),
            wordBoundaryPattern("COPY")
    );

    private static Pattern wordBoundaryPattern(String keyword) {
        return Pattern.compile("\\b" + keyword + "\\b", Pattern.CASE_INSENSITIVE);
    }

    /**
     * Validates the SQL query and returns the cleaned string.
     *
     * @throws UnsafeSqlException if any safety check fails
     */
    public String validate(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new UnsafeSqlException("Query is empty");
        }

        String cleaned = sql.strip();

        // Remove trailing semicolon if present
        if (cleaned.endsWith(";")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1).strip();
        }

        // Reject stacked queries (semicolon in the middle)
        if (cleaned.contains(";")) {
            throw new UnsafeSqlException("Multiple statements are not allowed");
        }

        // Must start with SELECT
        if (!cleaned.toUpperCase().startsWith("SELECT")) {
            throw new UnsafeSqlException("Only SELECT queries are allowed");
        }

        // Check for forbidden keywords
        for (Pattern pattern : FORBIDDEN_PATTERNS) {
            if (pattern.matcher(cleaned).find()) {
                String keyword = pattern.pattern().replaceAll("\\\\b", "");
                throw new UnsafeSqlException("Forbidden keyword: " + keyword);
            }
        }

        // Must have a LIMIT clause
        if (!Pattern.compile("\\bLIMIT\\s+\\d+", Pattern.CASE_INSENSITIVE).matcher(cleaned).find()) {
            throw new UnsafeSqlException("Query must include a LIMIT clause");
        }

        return cleaned;
    }
}
