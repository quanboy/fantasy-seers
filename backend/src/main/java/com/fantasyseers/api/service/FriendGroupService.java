package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.entity.FriendGroup;
import com.fantasyseers.api.entity.GroupInvite;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.FriendGroupRepository;
import com.fantasyseers.api.repository.GroupInviteRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendGroupService {

    private final FriendGroupRepository friendGroupRepository;
    private final GroupInviteRepository groupInviteRepository;
    private final UserRepository userRepository;

    @Transactional
    public FriendGroupDto.GroupResponse createGroup(FriendGroupDto.CreateRequest request, String username) {
        User user = findUser(username);

        FriendGroup group = FriendGroup.builder()
                .name(request.name())
                .owner(user)
                .build();
        group.getMembers().add(user);

        return toResponse(friendGroupRepository.save(group));
    }

    @Transactional
    public FriendGroupDto.GroupResponse joinGroup(FriendGroupDto.JoinRequest request, String username) {
        User user = findUser(username);

        FriendGroup group = friendGroupRepository.findByInviteCode(request.inviteCode().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code"));

        if (group.getMembers().contains(user)) {
            throw new IllegalStateException("Already a member of this group");
        }

        group.getMembers().add(user);
        return toResponse(friendGroupRepository.save(group));
    }

    @Transactional
    public FriendGroupDto.InviteResponse inviteUser(Long groupId, FriendGroupDto.InviteRequest request, String inviterUsername) {
        FriendGroup group = friendGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        User inviter = findUser(inviterUsername);

        boolean isInviterMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(inviterUsername));
        if (!isInviterMember) {
            throw new org.springframework.security.access.AccessDeniedException("You are not a member of this group");
        }

        User invitee = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + request.username()));

        if (group.getMembers().contains(invitee)) {
            throw new IllegalStateException(request.username() + " is already a member of this group");
        }

        if (groupInviteRepository.existsByGroupIdAndInviteeIdAndStatus(groupId, invitee.getId(), GroupInvite.Status.PENDING)) {
            throw new IllegalStateException(request.username() + " already has a pending invite to this group");
        }

        GroupInvite invite = GroupInvite.builder()
                .group(group)
                .inviter(inviter)
                .invitee(invitee)
                .build();

        return toInviteResponse(groupInviteRepository.save(invite));
    }

    @Transactional(readOnly = true)
    public List<FriendGroupDto.InviteResponse> getMyInvites(String username) {
        return groupInviteRepository.findAllByInviteeUsernameAndStatus(username, GroupInvite.Status.PENDING)
                .stream()
                .map(this::toInviteResponse)
                .toList();
    }

    @Transactional
    public FriendGroupDto.GroupResponse acceptInvite(Long inviteId, String username) {
        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found"));

        if (!invite.getInvitee().getUsername().equals(username)) {
            throw new IllegalStateException("This invite is not for you");
        }

        if (invite.getStatus() != GroupInvite.Status.PENDING) {
            throw new IllegalStateException("This invite has already been " + invite.getStatus().name().toLowerCase());
        }

        invite.setStatus(GroupInvite.Status.ACCEPTED);
        groupInviteRepository.save(invite);

        FriendGroup group = invite.getGroup();
        group.getMembers().add(invite.getInvitee());
        return toResponse(friendGroupRepository.save(group));
    }

    @Transactional
    public void rejectInvite(Long inviteId, String username) {
        GroupInvite invite = groupInviteRepository.findById(inviteId)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found"));

        if (!invite.getInvitee().getUsername().equals(username)) {
            throw new IllegalStateException("This invite is not for you");
        }

        if (invite.getStatus() != GroupInvite.Status.PENDING) {
            throw new IllegalStateException("This invite has already been " + invite.getStatus().name().toLowerCase());
        }

        invite.setStatus(GroupInvite.Status.REJECTED);
        groupInviteRepository.save(invite);
    }

    @Transactional(readOnly = true)
    public List<FriendGroupDto.GroupResponse> getMyGroups(String username) {
        return friendGroupRepository.findAllByMemberUsername(username)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FriendGroupDto.GroupResponse getGroupById(Long id, String username) {
        FriendGroup group = friendGroupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getUsername().equals(username));
        if (!isMember) {
            throw new IllegalStateException("You are not a member of this group");
        }

        return toResponse(group);
    }

    @Transactional
    public FriendGroupDto.GroupResponse renameGroup(Long groupId, FriendGroupDto.RenameRequest request, String username) {
        FriendGroup group = friendGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        if (!group.getOwner().getUsername().equals(username)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the group owner can rename the group");
        }

        group.setName(request.name());
        return toResponse(friendGroupRepository.save(group));
    }

    @Transactional
    public void kickMember(Long groupId, Long userId, String username) {
        FriendGroup group = friendGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        if (!group.getOwner().getUsername().equals(username)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the group owner can kick members");
        }

        if (group.getOwner().getId().equals(userId)) {
            throw new IllegalStateException("Cannot kick the group owner");
        }

        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!group.getMembers().contains(target)) {
            throw new IllegalArgumentException("User is not a member of this group");
        }

        group.getMembers().remove(target);
        friendGroupRepository.save(group);
    }

    @Transactional
    public void leaveGroup(Long groupId, String username) {
        FriendGroup group = friendGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        User user = findUser(username);

        if (!group.getMembers().contains(user)) {
            throw new IllegalArgumentException("You are not a member of this group");
        }

        group.getMembers().remove(user);

        if (group.getOwner().getUsername().equals(username)) {
            if (group.getMembers().isEmpty()) {
                friendGroupRepository.delete(group);
                return;
            }
            // Transfer ownership to the first remaining member (alphabetical)
            User newOwner = group.getMembers().stream()
                    .sorted(java.util.Comparator.comparing(User::getUsername))
                    .findFirst()
                    .get();
            group.setOwner(newOwner);
        }

        friendGroupRepository.save(group);
    }

    @Transactional(readOnly = true)
    public List<FriendGroupDto.GroupResponse> getAllGroups() {
        return friendGroupRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private FriendGroupDto.InviteResponse toInviteResponse(GroupInvite invite) {
        return new FriendGroupDto.InviteResponse(
                invite.getId(),
                invite.getGroup().getId(),
                invite.getGroup().getName(),
                invite.getInviter().getUsername(),
                invite.getInvitee().getUsername(),
                invite.getStatus().name(),
                invite.getCreatedAt()
        );
    }

    private FriendGroupDto.GroupResponse toResponse(FriendGroup group) {
        List<String> memberUsernames = group.getMembers().stream()
                .map(User::getUsername)
                .sorted()
                .toList();

        List<FriendGroupDto.MemberInfo> members = group.getMembers().stream()
                .map(u -> new FriendGroupDto.MemberInfo(u.getId(), u.getUsername()))
                .sorted(java.util.Comparator.comparing(FriendGroupDto.MemberInfo::username))
                .toList();

        return new FriendGroupDto.GroupResponse(
                group.getId(),
                group.getName(),
                group.getInviteCode(),
                group.getOwner().getUsername(),
                group.getMembers().size(),
                memberUsernames,
                members
        );
    }
}
