CREATE TABLE group_invites (
    id          BIGSERIAL PRIMARY KEY,
    group_id    BIGINT      NOT NULL REFERENCES friend_groups(id),
    inviter_id  BIGINT      NOT NULL REFERENCES users(id),
    invitee_id  BIGINT      NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, invitee_id)
);
