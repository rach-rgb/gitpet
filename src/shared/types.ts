/**
 * Core types and interfaces for the Petgotchi application.
 * Adheres to .agent/clean-code.md naming conventions.
 */

export type Difficulty = 'easy' | 'normal' | 'hard';
export type PetStage = 0 | 1 | 2 | 3 | 4 | 5;
export type PetTrait = 'lone_coder' | 'collaborator' | 'craftsman' | 'architect' | 'sprinter';

export interface User {
    userId: string;
    githubId: number;
    githubUsername: string;
    tokenEncrypted: string; // AES-256
    createdAt: number;
    lastActive: number;
    lastSync: number;
}

export interface Pet {
    petId: string;
    userId: string;
    name: string;
    stage: PetStage;
    trait: PetTrait | null;
    hunger: number;
    happiness: number;
    health: number;
    xp: number;
    streakCurrent: number;
    streakLongest: number;
    streakLastDate: string | null; // YYYY-MM-DD
    isDormant: boolean;
    dormantSince: number | null;
    legendaryAchieved: boolean;
    legendaryAchievedAt: number | null;
    difficulty: Difficulty;
    bornAt: number;
    hatchedAt: number | null;
    traitLockedAt: number | null;
    createdAt: number;
    updatedAt: number;
}

export interface ActivityLog {
    logId: string;
    userId: string;
    petId: string;
    eventType: string;
    githubEventId: string | null;
    repoName: string | null;
    hungerDelta: number;
    happinessDelta: number;
    healthDelta: number;
    xpDelta: number;
    commitCount: number | null;
    linesChanged: number | null;
    multiplier: number;
    notes: string | null;
    scoredAt: number;
}

export interface TraitTally {
    userId: string;
    soloCommitScore: number;
    socialScore: number;
    qualityScore: number;
    diversityScore: number;
    streakScore: number;
    trackingUntil: number;
    isLocked: boolean;
}
