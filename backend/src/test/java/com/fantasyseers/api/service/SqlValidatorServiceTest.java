package com.fantasyseers.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class SqlValidatorServiceTest {

    private SqlValidatorService validator;

    @BeforeEach
    void setUp() {
        validator = new SqlValidatorService();
    }

    // ── Safe queries that should pass ──────────────────────────────────────

    @Test
    void validSimpleSelect() {
        String sql = "SELECT username, point_bank FROM users_safe ORDER BY point_bank DESC LIMIT 10";
        String result = validator.validate(sql);
        assertEquals(sql, result);
    }

    @Test
    void validWithTrailingSemicolon() {
        String sql = "SELECT * FROM props LIMIT 50;";
        String result = validator.validate(sql);
        assertEquals("SELECT * FROM props LIMIT 50", result);
    }

    @Test
    void validWithWhitespace() {
        String sql = "  SELECT username FROM users_safe LIMIT 100  ";
        String result = validator.validate(sql);
        assertEquals("SELECT username FROM users_safe LIMIT 100", result);
    }

    @Test
    void validComplexJoin() {
        String sql = """
                SELECT u.username, COUNT(v.id) AS total_picks,
                       SUM(CASE WHEN v.choice = p.result THEN 1 ELSE 0 END) AS correct
                FROM users_safe u
                JOIN votes v ON v.user_id = u.id
                JOIN props p ON p.id = v.prop_id
                WHERE p.status = 'RESOLVED'
                GROUP BY u.username
                ORDER BY correct DESC
                LIMIT 20""";
        assertDoesNotThrow(() -> validator.validate(sql));
    }

    @Test
    void validSubquery() {
        String sql = "SELECT * FROM (SELECT username, point_bank FROM users_safe) sub LIMIT 10";
        assertDoesNotThrow(() -> validator.validate(sql));
    }

    @Test
    void validCaseInsensitiveSelect() {
        String sql = "select username from users_safe limit 10";
        assertDoesNotThrow(() -> validator.validate(sql));
    }

    // ── Null and empty ─────────────────────────────────────────────────────

    @Test
    void rejectsNull() {
        UnsafeSqlException ex = assertThrows(UnsafeSqlException.class,
                () -> validator.validate(null));
        assertEquals("Query is empty", ex.getMessage());
    }

    @Test
    void rejectsEmpty() {
        UnsafeSqlException ex = assertThrows(UnsafeSqlException.class,
                () -> validator.validate("   "));
        assertEquals("Query is empty", ex.getMessage());
    }

    // ── Must start with SELECT ─────────────────────────────────────────────

    @Test
    void rejectsNonSelect() {
        UnsafeSqlException ex = assertThrows(UnsafeSqlException.class,
                () -> validator.validate("WITH cte AS (SELECT 1) SELECT * FROM cte LIMIT 10"));
        assertEquals("Only SELECT queries are allowed", ex.getMessage());
    }

    // ── Forbidden keywords ─────────────────────────────────────────────────

    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT 1; DROP TABLE users",
            "SELECT 1; DELETE FROM props",
            "SELECT * FROM users_safe; INSERT INTO users(username) VALUES('hack')"
    })
    void rejectsStackedQueries(String sql) {
        UnsafeSqlException ex = assertThrows(UnsafeSqlException.class,
                () -> validator.validate(sql));
        assertEquals("Multiple statements are not allowed", ex.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "INSERT INTO users(username) VALUES('x') LIMIT 1",
            "UPDATE users SET point_bank = 999999 LIMIT 1",
            "DELETE FROM props LIMIT 1",
            "DROP TABLE votes",
            "ALTER TABLE users ADD COLUMN hack TEXT",
            "CREATE TABLE evil (id INT)",
            "TRUNCATE votes",
            "GRANT ALL ON users TO public",
            "REVOKE SELECT ON users FROM fs_readonly"
    })
    void rejectsForbiddenKeywords(String sql) {
        assertThrows(UnsafeSqlException.class, () -> validator.validate(sql));
    }

    @Test
    void rejectsCaseVariations() {
        assertThrows(UnsafeSqlException.class,
                () -> validator.validate("select * from users_safe; dRoP table users"));
    }

    @Test
    void doesNotFalsePositiveOnColumnNames() {
        // "updated_at" contains "update" but should NOT trigger the keyword check
        // because the pattern uses word boundaries
        String sql = "SELECT created_at, updated_at FROM props WHERE status = 'RESOLVED' LIMIT 10";
        assertDoesNotThrow(() -> validator.validate(sql));
    }

    @Test
    void doesNotFalsePositiveOnDeletedInString() {
        // "is_deleted" contains "delete" — word boundary should prevent false positive
        String sql = "SELECT * FROM props WHERE description LIKE '%deleted%' LIMIT 10";
        assertDoesNotThrow(() -> validator.validate(sql));
    }

    // ── Missing LIMIT ──────────────────────────────────────────────────────

    @Test
    void rejectsMissingLimit() {
        UnsafeSqlException ex = assertThrows(UnsafeSqlException.class,
                () -> validator.validate("SELECT * FROM users_safe"));
        assertEquals("Query must include a LIMIT clause", ex.getMessage());
    }

    @Test
    void rejectsLimitWithoutNumber() {
        assertThrows(UnsafeSqlException.class,
                () -> validator.validate("SELECT * FROM users_safe LIMIT"));
    }
}
