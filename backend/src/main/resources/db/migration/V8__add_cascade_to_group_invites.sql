-- Add ON DELETE CASCADE to group_invites foreign keys
ALTER TABLE group_invites DROP CONSTRAINT IF EXISTS group_invites_group_id_fkey;
ALTER TABLE group_invites ADD CONSTRAINT group_invites_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES friend_groups(id) ON DELETE CASCADE;

ALTER TABLE group_invites DROP CONSTRAINT IF EXISTS group_invites_inviter_id_fkey;
ALTER TABLE group_invites ADD CONSTRAINT group_invites_inviter_id_fkey
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE group_invites DROP CONSTRAINT IF EXISTS group_invites_invitee_id_fkey;
ALTER TABLE group_invites ADD CONSTRAINT group_invites_invitee_id_fkey
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE;
