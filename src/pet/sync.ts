import { Database } from '../shared/db';
import { decryptToken } from '../shared/utils';
import { Pet, Difficulty } from '../shared/types';
import { checkEvolution } from './evolution';

/**
 * Main synchronization and decay logic.
 * Adheres to .agent/clean-code.md conventions.
 */
export async function syncAndDecay(env: { DB: D1Database; TOKEN_ENCRYPTION_KEY: string }) {
    const db = new Database(env.DB);
    const now = Math.floor(Date.now() / 1000);

    // 1. Fetch users who haven't been synced in 30 minutes
    // For MVP, we'll fetch a batch. In production, this would be more optimized.
    const users = await env.DB.prepare('SELECT * FROM users WHERE last_sync < ? LIMIT 50')
        .bind(now - 1800)
        .all();

    for (const user of users.results as any[]) {
        try {
            const pet = await db.fetchPet(user.user_id);
            if (!pet) continue;

            const accessToken = await decryptToken(user.token_encrypted, env.TOKEN_ENCRYPTION_KEY);

            // 2. Fetch events from GitHub
            const events = await fetchEvents(user.github_username, accessToken);

            // 3. Process events and calculate deltas
            let hungerBonus = 0;
            let happinessBonus = 0;
            let xpGain = 0;
            let soloScore = 0;
            let socialScore = 0;
            const xpMult = pet.difficulty === 'easy' ? 1.2 : (pet.difficulty === 'hard' ? 0.8 : 1.0);

            for (const event of events) {
                if (await db.isEventProcessed(event.id, user.user_id)) continue;

                if (event.type === 'PushEvent') {
                    hungerBonus += 15;
                    happinessBonus += 5;
                    xpGain += 10 * xpMult;
                    soloScore += 1.0;
                } else if (event.type === 'PullRequestEvent') {
                    hungerBonus += 20;
                    happinessBonus += 20;
                    xpGain += 25 * xpMult;
                    socialScore += 2.0;
                }

                await db.markEventProcessed(event.id, user.user_id);
            }

            // Save trait scores
            if (soloScore > 0 || socialScore > 0) {
                const currentTally = await db.fetchTraitTally(user.user_id) || {
                    userId: user.user_id,
                    soloCommitScore: 0,
                    socialScore: 0,
                    qualityScore: 0,
                    diversityScore: 0,
                    streakScore: 0,
                    trackingUntil: now + (86400 * 7),
                    isLocked: false,
                };

                if (!currentTally.isLocked) {
                    await db.upsertTraitTally(user.user_id, {
                        soloCommitScore: currentTally.soloCommitScore + soloScore,
                        socialScore: currentTally.socialScore + socialScore,
                    });
                }
            }

            // 4. Calculate decay
            const hoursElapsed = (now - user.last_sync) / 3600;
            const decayMult = getDifficultyMult(pet.difficulty);
            const decay = hoursElapsed * 0.4 * decayMult;

            // 5. Update pet stats
            const updatedStats = {
                hunger: Math.max(0, Math.min(100, pet.hunger + hungerBonus - decay)),
                happiness: Math.max(0, Math.min(100, pet.happiness + happinessBonus - decay)),
                health: Math.max(0, Math.min(100, pet.health - decay)),
                xp: pet.xp + xpGain
            };

            await db.updatePetStats(pet.petId, updatedStats);

            // 6. Check for evolution
            await checkEvolution(db, { ...pet, ...updatedStats });

            // 7. Update user last_sync
            await env.DB.prepare('UPDATE users SET last_sync = ? WHERE user_id = ?')
                .bind(now, user.user_id)
                .run();

        } catch (error) {
            console.error(`Sync failed for user ${user.github_username}:`, error);
        }
    }
}

async function fetchEvents(username: string, token: string): Promise<any[]> {
    const response = await fetch(`https://api.github.com/users/${username}/events/public`, {
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'Petgotchi-Sync',
            'Accept': 'application/json',
        }
    });
    if (!response.ok) return [];
    return await response.json() as any[];
}

function getDifficultyMult(difficulty: Difficulty): number {
    switch (difficulty) {
        case 'easy': return 0.5;
        case 'hard': return 2.0;
        default: return 1.0;
    }
}

function calculateActivityGains(events: any[], difficulty: Difficulty) {
    // Simplified scoring for MVP
    // Each push event: +15 hunger, +5 happy, +10 XP
    // Multiplied by XP multiplier for difficulty
    const xpMult = difficulty === 'easy' ? 1.2 : (difficulty === 'hard' ? 0.8 : 1.0);

    let hungerBonus = 0;
    let happinessBonus = 0;
    let xpGain = 0;

    for (const event of events) {
        if (event.type === 'PushEvent') {
            hungerBonus += 15;
            happinessBonus += 5;
            xpGain += 10 * xpMult;
        }
    }

    return { hungerBonus, happinessBonus, healthBonus: 0, xpGain };
}

async function updatePetStats(db: Database, pet: Pet, deltas: any) {
    const newHunger = Math.max(0, Math.min(100, pet.hunger + deltas.hunger));
    const newHappiness = Math.max(0, Math.min(100, pet.happiness + deltas.happiness));
    const newHealth = Math.max(0, Math.min(100, pet.health + deltas.health));
    const newXp = pet.xp + deltas.xp;

    // TODO: Implement actual database update call in Database class
    // For now, this is a placeholder for the logic.
}
