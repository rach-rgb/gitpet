import { Pet, PetStage, PetTrait } from '../shared/types';
import { Database } from '../shared/db';

/**
 * Evolution and Trait Locking logic.
 * Adheres to .agent/clean-code.md conventions.
 */

const EVOLUTION_THRESHOLDS: Record<number, { days: number, xp: number }> = {
    0: { days: 0, xp: 1 },      // Egg to Hatchling (First commit)
    1: { days: 10, xp: 150 },   // Hatchling to Fledgling (Trait Lock point)
    2: { days: 30, xp: 600 },   // Fledgling to Adult
    3: { days: 90, xp: 1500 },  // Adult to Elder
    4: { days: 180, xp: 5000 }  // Elder to Legendary
};

/**
 * Evaluates if a pet is ready to evolve to the next stage.
 */
export async function checkEvolution(db: Database, pet: Pet): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const daysSinceBirth = (now - pet.bornAt) / 86400;

    const nextStage = (pet.stage + 1) as PetStage;
    const threshold = EVOLUTION_THRESHOLDS[pet.stage];

    if (!threshold || nextStage > 5) return;

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
    }
}

/**
 * Determines the pet's trait based on the TraitTally scores.
 * Priority: craftsman > collaborator > lone_coder > architect > sprinter
 */
async function determineTrait(db: Database, userId: string): Promise<PetTrait> {
    const tally = await db.fetchTraitTally(userId);
    if (!tally) return 'lone_coder';

    // We use an ordered array to enforce priority in case of ties
    // craftsman (quality) > collaborator (social) > lone_coder (solo) > architect (diversity) > sprinter (streak)
    const candidates = [
        { trait: 'craftsman' as PetTrait, score: tally.qualityScore || 0 },
        { trait: 'collaborator' as PetTrait, score: tally.socialScore || 0 },
        { trait: 'lone_coder' as PetTrait, score: tally.soloCommitScore || 0 },
        { trait: 'architect' as PetTrait, score: tally.diversityScore || 0 },
        { trait: 'sprinter' as PetTrait, score: tally.streakScore || 0 },
    ];

    // Find the highest score. If tied, the first one in the list wins (priority).
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].score > best.score) {
            best = candidates[i];
        }
    }

    return best.trait;
}
