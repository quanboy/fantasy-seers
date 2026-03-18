package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.FriendGroup;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendGroupRepository extends JpaRepository<FriendGroup, Long> {

    Optional<FriendGroup> findByInviteCode(String inviteCode);

    @EntityGraph(attributePaths = {"owner", "members"})
    @Query("SELECT g FROM FriendGroup g JOIN g.members m WHERE m.username = :username")
    List<FriendGroup> findAllByMemberUsername(@Param("username") String username);

    boolean existsByIdAndMembersUsername(Long id, String username);
}
