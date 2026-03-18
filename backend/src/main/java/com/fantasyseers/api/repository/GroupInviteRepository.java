package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.GroupInvite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupInviteRepository extends JpaRepository<GroupInvite, Long> {

    @EntityGraph(attributePaths = {"group", "inviter"})
    List<GroupInvite> findAllByInviteeUsernameAndStatus(String username, GroupInvite.Status status);

    boolean existsByGroupIdAndInviteeIdAndStatus(Long groupId, Long inviteeId, GroupInvite.Status status);
}
