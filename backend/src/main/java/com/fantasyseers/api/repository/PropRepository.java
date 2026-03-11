package com.fantasyseers.api.repository;

import com.fantasyseers.api.entity.Prop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PropRepository extends JpaRepository<Prop, Long> {

    @Query("SELECT p FROM Prop p WHERE p.scope = :scope ORDER BY CASE WHEN p.status = 'RESOLVED' THEN 0 ELSE 1 END ASC, p.resolvedAt DESC NULLS LAST, p.closesAt ASC")
    List<Prop> findByScopeOrdered(@Param("scope") Prop.Scope scope);

    @Query("SELECT p FROM Prop p JOIN p.groups g WHERE g.id = :groupId ORDER BY p.status ASC, p.closesAt ASC")
    List<Prop> findByGroupIdOrderByStatusAscClosesAtAsc(@Param("groupId") Long groupId);

    List<Prop> findByStatusAndResultIsNull(Prop.Status status);

    List<Prop> findByStatusOrderByCreatedAtAsc(Prop.Status status);
}