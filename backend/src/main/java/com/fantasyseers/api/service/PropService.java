package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.entity.FriendGroup;
import com.fantasyseers.api.entity.Prop;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.FriendGroupRepository;
import com.fantasyseers.api.repository.PropRepository;
import com.fantasyseers.api.repository.UserRepository;
import com.fantasyseers.api.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropService {

    private final PropRepository propRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;
    private final FriendGroupRepository friendGroupRepository;

    @Transactional
    public PropDto.PropResponse createProp(PropDto.CreateRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Prop.Scope scope = request.groupId() != null ? Prop.Scope.GROUP : Prop.Scope.PUBLIC;

        Prop prop = Prop.builder()
                .title(request.title())
                .description(request.description())
                .sport(request.sport())
                .closesAt(request.closesAt())
                .createdBy(user)
                .isAdminProp(true)
                .scope(scope)
                .status(Prop.Status.OPEN)
                .build();

        Prop saved = propRepository.save(prop);

        if (request.groupId() != null) {
            FriendGroup group = friendGroupRepository.findById(request.groupId())
                    .orElseThrow(() -> new IllegalArgumentException("Group not found"));
            saved.getGroups().add(group);
            saved = propRepository.save(saved);
        }

        return toResponse(saved, username);
    }

    @Transactional
    public PropDto.PropResponse submitProp(PropDto.submitRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Prop.Scope scope = request.scope() != null ? request.scope() : Prop.Scope.PUBLIC;

        Prop prop = Prop.builder()
                .title(request.title())
                .description(request.description())
                .sport(request.sport())
                .closesAt(request.closesAt())
                .minWager(request.minWager())
                .maxWager(request.maxWager())
                .createdBy(user)
                .isAdminProp(false)
                .scope(scope)
                .status(Prop.Status.PENDING)
                .build();

        Prop saved = propRepository.save(prop);

        if (request.groupId() != null &&
                (scope == Prop.Scope.GROUP || scope == Prop.Scope.FRIENDS_AND_GROUP)) {
            FriendGroup group = friendGroupRepository.findById(request.groupId())
                    .orElseThrow(() -> new IllegalArgumentException("Group not found"));
            saved.getGroups().add(group);
            saved = propRepository.save(saved);
        }

        return toResponse(saved, username);
    }

    public PropDto.PropResponse approveProp(Long id) {
        Prop prop = propRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() != Prop.Status.PENDING) {
            throw new IllegalStateException("Only PENDING props can be approved");
        }

        prop.setStatus(Prop.Status.OPEN);
        return toResponse(propRepository.save(prop), null);
    }

    public void rejectProp(Long id) {
        Prop prop = propRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() != Prop.Status.PENDING) {
            throw new IllegalStateException("Only PENDING props can be rejected");
        }

        propRepository.delete(prop);
    }

    public List<PropDto.PropResponse> getPendingProps() {
        return propRepository.findByStatusOrderByCreatedAtAsc(Prop.Status.PENDING)
                .stream()
                .map(p -> toResponse(p, null))
                .toList();
    }

    public List<PropDto.PropResponse> getPublicProps(String username) {
        if (username != null) {
            return propRepository.findVisibleToUser(
                            username,
                            Prop.Scope.PUBLIC,
                            List.of(Prop.Scope.FRIENDS, Prop.Scope.FRIENDS_AND_GROUP)
                    )
                    .stream()
                    .map(p -> toResponse(p, username))
                    .toList();
        }
        return propRepository
                .findByScopeOrdered(Prop.Scope.PUBLIC)
                .stream()
                .map(p -> toResponse(p, null))
                .toList();
    }

    public List<PropDto.PropResponse> getGroupProps(Long groupId, String username) {
        if (!friendGroupRepository.existsByIdAndMembersUsername(groupId, username)) {
            throw new AccessDeniedException("You are not a member of this group");
        }
        return propRepository.findByGroupIdOrderByStatusAscClosesAtAsc(groupId)
                .stream()
                .map(p -> toResponse(p, username))
                .toList();
    }

    public PropDto.PropResponse getPropById(Long id, String username) {
        Prop prop = propRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));
        return toResponse(prop, username);
    }

    private PropDto.PropResponse toResponse(Prop prop, String username) {
        String userChoice = null;
        Boolean userWon = null;

        if (username != null) {
            var userOpt = userRepository.findByUsername(username);
            if (userOpt.isPresent()) {
                var vote = voteRepository.findByPropIdAndUserId(prop.getId(), userOpt.get().getId());
                if (vote.isPresent()) {
                    userChoice = vote.get().getChoice().name();
                    if (prop.getResult() != null) {
                        userWon = vote.get().getChoice().name().equals(prop.getResult().name());
                    }
                }
            }
        }

        return new PropDto.PropResponse(
                prop.getId(),
                prop.getTitle(),
                prop.getDescription(),
                prop.getSport().name(),
                prop.getStatus().name(),
                prop.getResult() != null ? prop.getResult().name() : null,
                prop.getClosesAt(),
                prop.getCreatedBy().getUsername(),
                userChoice,
                userWon,
                prop.getMinWager(),
                prop.getMaxWager()
        );
    }
}
