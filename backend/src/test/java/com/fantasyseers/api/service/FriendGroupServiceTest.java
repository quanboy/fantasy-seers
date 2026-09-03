package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.FriendGroupDto;
import com.fantasyseers.api.entity.FriendGroup;
import com.fantasyseers.api.entity.User;
import com.fantasyseers.api.repository.FriendGroupRepository;
import com.fantasyseers.api.repository.GroupInviteRepository;
import com.fantasyseers.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FriendGroupServiceTest {

    @Mock FriendGroupRepository friendGroupRepository;
    @Mock GroupInviteRepository groupInviteRepository;
    @Mock UserRepository userRepository;
    @InjectMocks FriendGroupService friendGroupService;

    @Test
    void nonMemberCannotInviteSomeoneToGroup() {
        User owner = User.builder().id(1L).username("owner").build();
        User outsider = User.builder().id(2L).username("outsider").build();
        FriendGroup group = FriendGroup.builder().id(10L).name("League").owner(owner).build();
        group.getMembers().add(owner);

        when(friendGroupRepository.findById(10L)).thenReturn(Optional.of(group));
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));

        AccessDeniedException error = assertThrows(
                AccessDeniedException.class,
                () -> friendGroupService.inviteUser(
                        10L,
                        new FriendGroupDto.InviteRequest("invitee"),
                        "outsider"
                )
        );

        assertEquals("You are not a member of this group", error.getMessage());
        verify(groupInviteRepository, never()).save(any());
    }
}
