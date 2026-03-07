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
            let healthBonus = 0;
            let xpGain = 0;

            let soloScore = 0;
            let socialScore = 0;
            let qualityScore = 0;
            let diversityScore = 0;

            const xpMult = pet.difficulty === 'easy' ? 1.2 : (pet.difficulty === 'hard' ? 0.8 : 1.0);
            const repoNames = new Set<string>();

            for (const event of events) {
                if (await db.isEventProcessed(event.id, user.user_id)) continue;

                if (event.type === 'PushEvent') {
                    const commits = event.payload.commits || [];
                    let hasTests = false;
                    let hasDescriptiveMsg = false;

                    for (const commit of commits) {
                        const msg = commit.message.toLowerCase();
                        if (msg.includes('test') || msg.includes('spec') || msg.includes('fix')) {
                            hasTests = true;
                        }
                        if (commit.message.length > 20) {
                            hasDescriptiveMsg = true;
                        }
                    }

                    if (hasTests) {
                        hungerBonus += 15;
                        happinessBonus += 5;
                        healthBonus += 15;
                        xpGain += 15 * xpMult;
                        qualityScore += 2.0;
                    } else {
                        hungerBonus += 15;
                        happinessBonus += 5;
                        xpGain += 10 * xpMult;
                        soloScore += 1.0;
                    }

                    if (hasDescriptiveMsg) {
                        hungerBonus += 5;
                        xpGain += 5 * xpMult;
                        qualityScore += 0.5;
                    }

                    if (event.repo?.name) repoNames.add(event.repo.name);
                } else if (event.type === 'PullRequestEvent') {
                    const action = event.payload.action;
                    const merged = event.payload.pull_request?.merged;

                    if (action === 'opened') {
                        hungerBonus += 10;
                        happinessBonus += 15;
                        xpGain += 15 * xpMult;
                        socialScore += 1.0;
                    } else if (action === 'closed' && merged) {
                        hungerBonus += 15;
                        happinessBonus += 30;
                        healthBonus += 10;
                        xpGain += 25 * xpMult;
                        socialScore += 2.0;
                    }
                } else if (event.type === 'IssueCommentEvent' || event.type === 'PullRequestReviewCommentEvent') {
                    hungerBonus += 5;
                    happinessBonus += 20;
                    healthBonus += 10;
                    xpGain += 15 * xpMult;
                    socialScore += 1.5;
                } else if (event.type === 'IssuesEvent' && event.payload.action === 'closed') {
                    happinessBonus += 15;
                    xpGain += 10 * xpMult;
                    diversityScore += 1.5;
                }

                await db.markEventProcessed(event.id, user.user_id);
            }

            // Diverse Repos Bonus
            if (repoNames.size >= 2) {
                hungerBonus += 8;
                happinessBonus += 14;
                healthBonus += 8;
                xpGain += 20 * xpMult;
                diversityScore += 1.0;
            }

            // Save trait scores
            const currentTally = await db.fetchTraitTally(user.user_id);
            if (currentTally && !currentTally.isLocked) {
                // Streak score calculation: 연속 일수 × 0.3
                // We'll update streakScore based on pet.streakCurrent
                const streakScore = pet.streakCurrent * 0.3;

                await db.upsertTraitTally(user.user_id, {
                    soloCommitScore: (currentTally.soloCommitScore || 0) + soloScore,
                    socialScore: (currentTally.socialScore || 0) + socialScore,
                    qualityScore: (currentTally.qualityScore || 0) + qualityScore,
                    diversityScore: (currentTally.diversityScore || 0) + diversityScore,
                    streakScore: streakScore // Updated based on current streak
                });
            }

            // 4. Calculate decay
            const hoursElapsed = (now - user.last_sync) / 3600;
            const decayMult = getDifficultyMult(pet.difficulty);
            const decay = hoursElapsed * 0.4 * decayMult;

            // 5. Update pet stats
            const updatedStats = {
                hunger: Math.max(0, Math.min(100, pet.hunger + hungerBonus - decay)),
                happiness: Math.max(0, Math.min(100, pet.happiness + happinessBonus - decay)),
                health: Math.max(0, Math.min(100, pet.health + healthBonus - decay)),
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
            if ((error as Error).message.includes('AUTH_ERROR')) {
                // Potential placeholder for token invalidation logic
                console.warn(`User ${user.github_username} has invalid/revoked token.`);
            }
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

    if (response.status === 401 || response.status === 403) {
        throw new Error(`GitHub AUTH_ERROR: ${response.status}`);
    }

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
