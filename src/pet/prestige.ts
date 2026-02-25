import { Database } from '../shared/db';
import { Pet } from '../shared/types';

/**
 * Prestige and Retirement logic (Hall of Fame).
 * Adheres to .agent/clean-code.md conventions.
 */

export async function retirePet(db: Database, petId: string): Promise<{ retired: boolean }> {
    // 1. Fetch pet
    const pet = await db.fetchPetById(petId);
    if (!pet) throw new Error('Pet not found');

    // 2. Verify eligibility (Stage 5 - Legendary)
    if (pet.stage < 5) {
        throw new Error('Only Legendary pets can be retired to the Hall of Fame');
    }

    // 3. Move to Hall of Fame table
    const now = Math.floor(Date.now() / 1000);
    await db.addToHallOfFame({
        userId: pet.userId,
        petId: pet.petId,
        name: pet.name,
        stage: pet.stage,
        trait: pet.trait || 'lone_coder',
        difficulty: pet.difficulty,
        xp: pet.xp,
        streakLongest: pet.streakLongest,
        bornAt: pet.bornAt,
        retiredAt: now
    });

    // 4. Delete pet from active pets table
    await db.deletePet(petId);

    return { retired: true };
}
