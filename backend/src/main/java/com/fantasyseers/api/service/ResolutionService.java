package com.fantasyseers.api.service;

import com.fantasyseers.api.entity.*;
import com.fantasyseers.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ResolutionService {

    private final PropRepository propRepository;
    private final VoteRepository voteRepository;
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    @Transactional
    public void resolveProp(Long propId, Prop.Result result) {
        Prop prop = propRepository.findByIdForUpdate(propId)
                .orElseThrow(() -> new IllegalArgumentException("Prop not found"));

        if (prop.getStatus() == Prop.Status.RESOLVED) {
            throw new IllegalStateException("Prop is already resolved");
        }
        if (prop.getStatus() != Prop.Status.CLOSED) {
            throw new IllegalStateException("Only closed props can be resolved");
        }

        // Mark prop as resolved
        prop.setResult(result);
        prop.setStatus(Prop.Status.RESOLVED);
        prop.setResolvedAt(LocalDateTime.now());
        propRepository.save(prop);

        // Get all votes
        List<Vote> allVotes = voteRepository.findByPropId(propId);

        // Determine winning and losing choice
        Vote.Choice winningChoice = Vote.Choice.valueOf(result.name());
        Vote.Choice losingChoice  = winningChoice == Vote.Choice.YES ? Vote.Choice.NO : Vote.Choice.YES;

        // Sum the losing pool
        long losingPool = allVotes.stream()
                .filter(v -> v.getChoice() == losingChoice)
                .mapToLong(Vote::getWagerAmount)
                .sum();

        // Sum the winning pool
        long winningPool = allVotes.stream()
                .filter(v -> v.getChoice() == winningChoice)
                .mapToLong(Vote::getWagerAmount)
                .sum();

        // Apply 5% platform rake to losing pool
        long rakeAmount  = (long) (losingPool * 0.05);
        long distributablePool = losingPool - rakeAmount;

        // Get winning votes
        List<Vote> winningVotes = allVotes.stream()
                .filter(v -> v.getChoice() == winningChoice)
                .toList();

        // Edge case: everyone voted the same side — return wagers
        if (winningPool == 0 || losingPool == 0) {
            List<User> users = new ArrayList<>();
            for (Vote vote : allVotes) {
                User user = vote.getUser();
                long newBalance = (long) user.getPointBank() + vote.getWagerAmount();
                user.setPointBank((int) Math.min(newBalance, Integer.MAX_VALUE));
                vote.setPayout(vote.getWagerAmount());
                users.add(user);
            }
            voteRepository.saveAll(allVotes);
            userRepository.saveAll(users);
            List<PointTransaction> txns = new ArrayList<>();
            for (Vote vote : allVotes) {
                txns.add(PointTransaction.builder()
                        .user(vote.getUser())
                        .amount(vote.getWagerAmount())
                        .type(PointTransaction.TransactionType.PAYOUT)
                        .referenceId(propId)
                        .note("Wager returned — all votes on same side")
                        .build());
            }
            pointTransactionRepository.saveAll(txns);
            return;
        }

        // Distribute losing pool to winners proportionally
        List<User> winningUsers = new ArrayList<>();
        for (Vote vote : winningVotes) {
            double share = (double) vote.getWagerAmount() / winningPool;
            long winnings = (long) (distributablePool * share);
            long payout = vote.getWagerAmount() + winnings;

            int safePayout = (int) Math.min(payout, Integer.MAX_VALUE);
            vote.setPayout(safePayout);

            User user = vote.getUser();
            long newBalance = (long) user.getPointBank() + safePayout;
            user.setPointBank((int) Math.min(newBalance, Integer.MAX_VALUE));
            winningUsers.add(user);
        }
        voteRepository.saveAll(winningVotes);
        userRepository.saveAll(winningUsers);

        // Record payout transactions for winners
        List<PointTransaction> txns = new ArrayList<>();
        for (Vote vote : winningVotes) {
            txns.add(PointTransaction.builder()
                    .user(vote.getUser())
                    .amount(vote.getPayout())
                    .type(PointTransaction.TransactionType.PAYOUT)
                    .referenceId(propId)
                    .note("Winning payout on prop #" + propId)
                    .build());
        }

        // Mark losing votes as 0 payout
        List<Vote> losingVotes = allVotes.stream()
                .filter(v -> v.getChoice() == losingChoice)
                .toList();

        for (Vote vote : losingVotes) {
            vote.setPayout(0);
        }
        voteRepository.saveAll(losingVotes);
        pointTransactionRepository.saveAll(txns);
    }
}
