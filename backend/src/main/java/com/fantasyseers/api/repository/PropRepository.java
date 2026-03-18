package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.Prop;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PropRepository extends JpaRepository<Prop, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Prop p WHERE p.id = :id")
    Optional<Prop> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT p FROM Prop p WHERE p.scope = :scope ORDER BY CASE WHEN p.status = 'RESOLVED' THEN 0 ELSE 1 END ASC, p.resolvedAt DESC NULLS LAST, p.closesAt ASC")
    List<Prop> findByScopeOrdered(@Param("scope") Prop.Scope scope);

    @Query("SELECT p FROM Prop p WHERE p.scope = :scope ORDER BY CASE WHEN p.status = 'RESOLVED' THEN 0 ELSE 1 END ASC, p.resolvedAt DESC NULLS LAST, p.closesAt ASC")
    Page<Prop> findByScopeOrdered(@Param("scope") Prop.Scope scope, Pageable pageable);

    @Query("""
            SELECT p FROM Prop p
            WHERE p.scope = :publicScope
               OR (p.scope IN :friendsScopes AND EXISTS (
                   SELECT g FROM FriendGroup g JOIN g.members m
                   WHERE g MEMBER OF p.groups AND m.username = :username
               ))
            ORDER BY CASE WHEN p.status = 'RESOLVED' THEN 0 ELSE 1 END ASC, p.resolvedAt DESC NULLS LAST, p.closesAt ASC
            """)
    List<Prop> findVisibleToUser(
            @Param("username") String username,
            @Param("publicScope") Prop.Scope publicScope,
            @Param("friendsScopes") List<Prop.Scope> friendsScopes
    );

    @Query("""
            SELECT p FROM Prop p
            WHERE p.scope = :publicScope
               OR (p.scope IN :friendsScopes AND EXISTS (
                   SELECT g FROM FriendGroup g JOIN g.members m
                   WHERE g MEMBER OF p.groups AND m.username = :username
               ))
            ORDER BY CASE WHEN p.status = 'RESOLVED' THEN 0 ELSE 1 END ASC, p.resolvedAt DESC NULLS LAST, p.closesAt ASC
            """)
    Page<Prop> findVisibleToUser(
            @Param("username") String username,
            @Param("publicScope") Prop.Scope publicScope,
            @Param("friendsScopes") List<Prop.Scope> friendsScopes,
            Pageable pageable
    );

    @Query("SELECT p FROM Prop p JOIN p.groups g WHERE g.id = :groupId ORDER BY p.status ASC, p.closesAt ASC")
    List<Prop> findByGroupIdOrderByStatusAscClosesAtAsc(@Param("groupId") Long groupId);

    List<Prop> findByStatusAndResultIsNull(Prop.Status status);

    List<Prop> findByStatusOrderByCreatedAtAsc(Prop.Status status);

    @Query("SELECT p FROM Prop p WHERE p.status = :status AND p.closesAt <= :before")
    List<Prop> findOpenPropsClosedBefore(@Param("status") Prop.Status status, @Param("before") java.time.LocalDateTime before);
}