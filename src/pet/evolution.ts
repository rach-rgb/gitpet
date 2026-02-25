import { Pet, PetStage, PetTrait } from '../shared/types';
import { Database } from '../shared/db';

/**
 * Evolution and Trait Locking logic.
 * Adheres to .agent/clean-code.md conventions.
 */

const EVOLUTION_THRESHOLDS: Record<number, { days: number, xp: number }> = {
    0: { days: 3, xp: 0 },    // Egg to Hatchling
    1: { days: 7, xp: 100 },  // Hatchling to Fledgling (Trait Lock point)
    2: { days: 30, xp: 500 }, // Fledgling to Adult
    3: { days: 90, xp: 1500 },// Adult to Elder
    4: { days: 365, xp: 5000 }// Elder to Legendary
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
        }

        // Special case: Hatching
        if (nextStage === 1) {
            updates.hatchedAt = now;
        }

        await db.updatePetStats(pet.petId, updates);

        // TODO: Create notification for the user
    }
}

/**
 * Determines the pet's trait based on the TraitTally scores.
 */
async function determineTrait(db: Database, userId: string): Promise<PetTrait> {
    const tally = await db.fetchTraitTally(userId);
    if (!tally) return 'lone_coder';

    const scores = [
        { trait: 'lone_coder' as PetTrait, score: tally.soloCommitScore },
        { trait: 'collaborator' as PetTrait, score: tally.socialScore },
        // Add other traits as implemented
    ];

    scores.sort((a, b) => b.score - a.score);

    return scores[0].trait;
}
