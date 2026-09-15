ALTER TABLE users
    ADD COLUMN account_type VARCHAR(30) NOT NULL DEFAULT 'HUMAN';

ALTER TABLE users
    ADD CONSTRAINT chk_users_account_type
    CHECK (account_type IN ('HUMAN', 'CONSENSUS_BASELINE', 'ADP_BASELINE'));

CREATE UNIQUE INDEX uq_users_baseline_account_type
    ON users (account_type)
    WHERE account_type <> 'HUMAN';

INSERT INTO users (
    username,
    email,
    password,
    point_bank,
    role,
    account_type,
    created_at,
    updated_at
)
VALUES
    (
        'consensus-baseline',
        'consensus@system.fantasyseers.invalid',
        '{disabled}',
        0,
        'USER',
        'CONSENSUS_BASELINE',
        NOW(),
        NOW()
    ),
    (
        'sleeper-adp-baseline',
        'adp@system.fantasyseers.invalid',
        '{disabled}',
        0,
        'USER',
        'ADP_BASELINE',
        NOW(),
        NOW()
    );
