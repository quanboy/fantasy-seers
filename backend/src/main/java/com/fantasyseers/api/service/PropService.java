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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PropService {

    private static final java.util.regex.Pattern HTML_TAG = java.util.regex.Pattern.compile("<[^>]*>");

    private final PropRepository propRepository;
    private final UserRepository userRepository;
    private final VoteRepository voteRepository;
    private final FriendGroupRepository friendGroupRepository;

    /**
     * Strip HTML tags from user input to prevent stored XSS.
     */
    private String sanitize(String input) {
        if (input == null) return null;
        return HTML_TAG.matcher(input).replaceAll("").trim();
    }

    @Transactional
    public PropDto.PropResponse createProp(PropDto.CreateRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.closesAt().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("Closing time must be in the future");
        }

        Prop.Scope scope = request.groupId() != null ? Prop.Scope.GROUP : Prop.Scope.PUBLIC;

        Prop prop = Prop.builder()
                .title(sanitize(request.title()))
                .description(sanitize(request.description()))
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
    public PropDto.PropResponse submitProp(PropDto.SubmitRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Prop.Scope scope = request.scope() != null ? request.scope() : Prop.Scope.PUBLIC;

        if (request.closesAt().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("Closing time must be in the future");
        }

        if (request.minWager() != null && request.maxWager() != null
                && request.minWager() > request.maxWager()) {
            throw new IllegalArgumentException("Minimum wager cannot exceed maximum wager");
        }

        Prop prop = Prop.builder()
                .title(sanitize(request.title()))
                .description(sanitize(request.description()))
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
            if (!group.getMembers().contains(user)) {
                throw new AccessDeniedException("You are not a member of this group");
            }
            saved.getGroups().add(group);
            saved = propRepository.save(saved);
        }

        return toResponse(saved, username);
    }

    @Transactional
    public PropDto.PropResponse approveProp(Long id) {
        Prop prop = propRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() != Prop.Status.PENDING) {
            throw new IllegalStateException("Only PENDING props can be approved");
        }

        prop.setStatus(Prop.Status.OPEN);
        return toResponse(propRepository.save(prop), (String) null);
    }

    @Transactional
    public void rejectProp(Long id) {
        Prop prop = propRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() != Prop.Status.PENDING) {
            throw new IllegalStateException("Only PENDING props can be rejected");
        }

        propRepository.delete(prop);
    }

    @Transactional(readOnly = true)
    public List<PropDto.PropResponse> getPendingProps() {
        return propRepository.findByStatusOrderByCreatedAtAsc(Prop.Status.PENDING)
                .stream()
                .map(p -> toResponse(p, (String) null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PropDto.PropResponse> getClosedProps() {
        return propRepository.findByStatusOrderByCreatedAtAsc(Prop.Status.CLOSED)
                .stream()
                .map(p -> toResponse(p, (String) null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PropDto.PropResponse> getPublicProps(String username) {
        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;
        if (username != null) {
            return propRepository.findVisibleToUser(
                            username,
                            Prop.Scope.PUBLIC,
                            List.of(Prop.Scope.FRIENDS, Prop.Scope.FRIENDS_AND_GROUP)
                    )
                    .stream()
                    .map(p -> toResponse(p, user))
                    .toList();
        }
        return propRepository
                .findByScopeOrdered(Prop.Scope.PUBLIC)
                .stream()
                .map(p -> toResponse(p, (User) null))
                .toList();
    }

    public PropDto.PaginatedResponse getPublicPropsPaginated(String username, Pageable pageable) {
        User user = username != null ? userRepository.findByUsername(username).orElse(null) : null;
        Page<Prop> page;
        if (username != null) {
            page = propRepository.findVisibleToUser(
                    username,
                    Prop.Scope.PUBLIC,
                    List.of(Prop.Scope.FRIENDS, Prop.Scope.FRIENDS_AND_GROUP),
                    pageable
            );
        } else {
            page = propRepository.findByScopeOrdered(Prop.Scope.PUBLIC, pageable);
        }
        List<PropDto.PropResponse> content = page.getContent().stream()
                .map(p -> toResponse(p, user))
                .toList();
        return new PropDto.PaginatedResponse(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public List<PropDto.PropResponse> getGroupProps(Long groupId, String username) {
        if (!friendGroupRepository.existsByIdAndMembersUsername(groupId, username)) {
            throw new AccessDeniedException("You are not a member of this group");
        }
        User user = userRepository.findByUsername(username).orElse(null);
        return propRepository.findByGroupIdOrderByStatusAscClosesAtAsc(groupId)
                .stream()
                .map(p -> toResponse(p, user))
                .toList();
    }

    @Transactional(readOnly = true)
    public PropDto.PropResponse getPropById(Long id, String username) {
        Prop prop = propRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));
        checkPropAccess(prop, username);
        return toResponse(prop, username);
    }

    /**
     * Verifies the user has access to a prop based on its scope.
     * GROUP-scoped props require group membership.
     */
    public void checkPropAccess(Prop prop, String username) {
        if (prop.getScope() == Prop.Scope.GROUP || prop.getScope() == Prop.Scope.FRIENDS_AND_GROUP) {
            boolean hasAccess = prop.getGroups().stream()
                    .anyMatch(g -> friendGroupRepository.existsByIdAndMembersUsername(g.getId(), username));
            if (!hasAccess) {
                throw new AccessDeniedException("You do not have access to this prop");
            }
        }
    }

    private PropDto.PropResponse toResponse(Prop prop, String username) {
        User resolvedUser = username != null
                ? userRepository.findByUsername(username).orElse(null)
                : null;
        return toResponse(prop, resolvedUser);
    }

    private PropDto.PropResponse toResponse(Prop prop, User resolvedUser) {
        String userChoice = null;
        Boolean userWon = null;
        Integer userWager = null;
        Integer userPayout = null;

        if (resolvedUser != null) {
            var vote = voteRepository.findByPropIdAndUserId(prop.getId(), resolvedUser.getId());
            if (vote.isPresent()) {
                userChoice = vote.get().getChoice().name();
                userWager = vote.get().getWagerAmount();
                userPayout = vote.get().getPayout();
                if (prop.getResult() != null) {
                    userWon = vote.get().getChoice().name().equals(prop.getResult().name());
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
                prop.getMaxWager(),
                userWager,
                userPayout
        );
    }
}
