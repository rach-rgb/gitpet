import { Difficulty, Pet, PetStage, PetTrait } from '../shared/types';
import { Database } from '../shared/db';

/**
 * Evolution and Trait Locking logic.
 * Adheres to .agent/clean-code.md conventions.
 */

const EVOLUTION_THRESHOLDS: Record<Difficulty, Record<number, { days: number, xp: number }>> = {
    easy: {
        0: { days: 0, xp: 1 },
        1: { days: 7, xp: 120 },
        2: { days: 18, xp: 300 },
        3: { days: 30, xp: 500 },
    },
    normal: {
        0: { days: 0, xp: 1 },
        1: { days: 14, xp: 220 },
        2: { days: 36, xp: 600 },
        3: { days: 60, xp: 1000 },
    },
    hard: {
        0: { days: 0, xp: 1 },
        1: { days: 21, xp: 320 },
        2: { days: 54, xp: 900 },
        3: { days: 90, xp: 1500 },
    },
};

/**
 * Evaluates if a pet is ready to evolve to the next stage.
 */
export async function checkEvolution(db: Database, pet: Pet): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const daysSinceBirth = (now - pet.bornAt) / 86400;

    const nextStage = (pet.stage + 1) as PetStage;
    const threshold = EVOLUTION_THRESHOLDS[pet.difficulty]?.[pet.stage];

    if (!threshold || nextStage > 4) return;

    // Prevent multiple evolutions in a single day (except for 0 -> 1)
    if (nextStage > 1) {
        const evolvedToday = await db.hasEvolvedToday(pet.petId);
        if (evolvedToday) return;
    }

    const timeCondition = daysSinceBirth >= threshold.days;
    const xpCondition = pet.xp >= threshold.xp;

    if (timeCondition && xpCondition) {
        const updates: Partial<Pet> = {
            stage: nextStage,
            updatedAt: now
        };

        // Special case: Transitioning to Stage 2 (Trait Lock)
        if (nextStage === 2 && !pet.trait) {
            updates.trait = await determineTrait(db, pet.userId);
            updates.traitLockedAt = now;

            // Lock the trait tally
            await db.upsertTraitTally(pet.userId, { isLocked: true });
        }

        // Special case: Hatching
        if (nextStage === 1) {
            updates.hatchedAt = now;
        }

        await db.updatePetStats(pet.petId, updates);

        // Notify user about evolution
        await db.createNotification(pet.userId, 'evolution', {
            petName: pet.name,
            oldStage: pet.stage,
            newStage: nextStage,
            trait: updates.trait
        });

        // Log evolution in activity
        await db.logActivity({
            userId: pet.userId,
            petId: pet.petId,
            eventType: 'evolution',
            githubEventId: null,
            repoName: null,
            hungerDelta: 0,
            happinessDelta: 0,
            xpDelta: 0,
            multiplier: 1.0,
            scoredAt: now,
            logId: crypto.randomUUID(),
            commitCount: null,
            linesChanged: null,
            notes: `Evolved to Stage ${nextStage}`
        });
    }
}

/**
 * Determines the pet's trait based on the TraitTally scores.
 * Ties are resolved deterministically per user to avoid a fixed trait bias.
 */
async function determineTrait(db: Database, userId: string): Promise<PetTrait> {
    const tally = await db.fetchTraitTally(userId);
    if (!tally) return 'lone_coder';

    const candidates = [
        { trait: 'craftsman' as PetTrait, score: tally.qualityScore || 0 },
        { trait: 'collaborator' as PetTrait, score: tally.socialScore || 0 },
        { trait: 'lone_coder' as PetTrait, score: tally.soloCommitScore || 0 },
        { trait: 'architect' as PetTrait, score: tally.diversityScore || 0 },
        { trait: 'sprinter' as PetTrait, score: tally.streakScore || 0 },
    ];

    const highestScore = Math.max(...candidates.map((candidate) => candidate.score));
    if (highestScore <= 0) return 'lone_coder';

    const tiedCandidates = candidates.filter((candidate) => candidate.score === highestScore);
    if (tiedCandidates.length === 1) return tiedCandidates[0].trait;

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return tiedCandidates[Math.abs(hash) % tiedCandidates.length].trait;
}
