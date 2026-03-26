package com.fantasyseers.api.service;

import com.fantasyseers.api.dto.PropDto;
import com.fantasyseers.api.dto.VoteDto;
import com.fantasyseers.api.entity.*;
import com.fantasyseers.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VoteService {

    private final VoteRepository voteRepository;
    private final PropRepository propRepository;
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    @Transactional
    public VoteDto.VoteResponse castVote(Long propId, PropDto.VoteRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Lock the prop row so the scheduler cannot flip status to CLOSED
        // between our status check and the vote save
        Prop prop = propRepository.findByIdForUpdate(propId)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() != Prop.Status.OPEN) {
            throw new IllegalStateException("Voting is closed for this prop");
        }

        if (prop.getClosesAt() != null && prop.getClosesAt().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalStateException("Voting is closed for this prop");
        }

        if (voteRepository.existsByPropIdAndUserId(propId, user.getId())) {
            throw new IllegalStateException("You have already voted on this prop");
        }

        if (prop.getMinWager() != null && request.wagerAmount() < prop.getMinWager()) {
            throw new IllegalArgumentException("Minimum wager is " + prop.getMinWager() + " points");
        }
        if (prop.getMaxWager() != null && request.wagerAmount() > prop.getMaxWager()) {
            throw new IllegalArgumentException("Maximum wager is " + prop.getMaxWager() + " points");
        }

        // Acquire a pessimistic write lock on the user row to prevent concurrent
        // votes from both passing the balance check (race condition → negative points)
        User lockedUser = userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (lockedUser.getPointBank() < request.wagerAmount()) {
            throw new IllegalStateException("Insufficient points");
        }

        // Deduct wager from point bank (on the locked row)
        lockedUser.setPointBank(lockedUser.getPointBank() - request.wagerAmount());
        userRepository.save(lockedUser);

        // Cast the vote
        Vote vote = Vote.builder()
                .prop(prop)
                .user(user)
                .choice(request.choice())
                .wagerAmount(request.wagerAmount())
                .build();

        voteRepository.save(vote);

        // Record wager transaction
        pointTransactionRepository.save(PointTransaction.builder()
                .user(lockedUser)
                .amount(-request.wagerAmount())
                .type(PointTransaction.TransactionType.WAGER)
                .referenceId(propId)
                .note("Wager on prop #" + propId)
                .build());

        // Return split after voting
        return getSplit(propId);
    }

    public VoteDto.VoteResponse getSplit(Long propId) {
        long yesCount = voteRepository.countByPropIdAndChoice(propId, Vote.Choice.YES);
        long noCount  = voteRepository.countByPropIdAndChoice(propId, Vote.Choice.NO);
        long yesWager = voteRepository.sumWagerByPropIdAndChoice(propId, Vote.Choice.YES);
        long noWager  = voteRepository.sumWagerByPropIdAndChoice(propId, Vote.Choice.NO);
        long total    = yesCount + noCount;

        double yesPct = total == 0 ? 0 : (yesCount * 100.0 / total);
        double noPct  = total == 0 ? 0 : (noCount  * 100.0 / total);

        return new VoteDto.VoteResponse(yesCount, noCount, yesPct, noPct, yesWager, noWager);
    }
}
