package com.fantasyseers.api.service;

record NflPlayerSyncCandidate(
        String sleeperId,
        String fullName,
        String position,
        String nflTeam,
        String status,
        Integer adp,
        Integer sourceAdp
) {}
