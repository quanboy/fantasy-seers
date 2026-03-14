package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.entity.FriendGroup;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.FriendGroupRepository;
import com.fantasyseers.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendGroupService {

    private final FriendGroupRepository friendGroupRepository;
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

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private FriendGroupDto.GroupResponse toResponse(FriendGroup group) {
        List<String> memberUsernames = group.getMembers().stream()
                .map(User::getUsername)
                .sorted()
                .toList();

        return new FriendGroupDto.GroupResponse(
                group.getId(),
                group.getName(),
                group.getInviteCode(),
                group.getOwner().getUsername(),
                group.getMembers().size(),
                memberUsernames
        );
    }
}
