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
            let xpGain = 0;

            let soloScore = 0;
            let socialScore = 0;
            let qualityScore = 0;
            let diversityScore = 0;

            let xpMult = pet.difficulty === 'easy' ? 1.2 : (pet.difficulty === 'hard' ? 0.8 : 1.0);
            
            // Apply Hungry/Sad penalty to XP gain
            if (pet.hunger < 40 || pet.happiness < 30) {
                xpMult *= 0.5;
            }

            const repoNames = new Set<string>();
            let addedStreakScore = 0;

            for (const event of events) {
                if (await db.isEventProcessed(event.id, user.user_id)) continue;
                
                // Ignore events that occurred before the pet was created
                const eventTime = new Date(event.created_at).getTime() / 1000;
                if (eventTime < pet.bornAt) {
                    await db.markEventProcessed(event.id, user.user_id);
                    continue;
                }

                let eHunger = 0;
                let eHappiness = 0;
                let eXp = 0;
                let soloE = 0, socialE = 0, qualityE = 0, diversityE = 0;

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
                        eHunger = 15;
                        eHappiness = 5;
                        eXp = 15 * xpMult;
                        qualityE = 2.0;
                    } else {
                        eHunger = 15;
                        eHappiness = 5;
                        eXp = 10 * xpMult;
                        soloE = 1.0;
                    }

                    if (hasDescriptiveMsg) {
                        eHunger += 5;
                        eXp += 5 * xpMult;
                        qualityE += 0.5;
                    }

                    if (event.repo?.name) repoNames.add(event.repo.name);
                } else if (event.type === 'PullRequestEvent') {
                    const action = event.payload.action;
                    const merged = event.payload.pull_request?.merged;

                    if (action === 'opened') {
                        eHunger = 10;
                        eHappiness = 15;
                        eXp = 15 * xpMult;
                        socialE = 1.0;
                    } else if (action === 'closed' && merged) {
                        eHunger = 15;
                        eHappiness = 30;
                        eXp = 25 * xpMult;
                        socialE = 2.0;
                    }
                } else if (event.type === 'IssueCommentEvent' || event.type === 'PullRequestReviewCommentEvent') {
                        eHunger = 5;
                        eHappiness = 20;
                        eXp = 15 * xpMult;
                    socialE = 1.5;
                } else if (event.type === 'IssuesEvent' && event.payload.action === 'closed') {
                    eHappiness = 15;
                    eXp = 10 * xpMult;
                    diversityE = 1.5;
                }

                if (eHunger > 0 || eHappiness > 0 || eXp > 0) {
                    await db.logActivity({
                        userId: user.user_id,
                        petId: pet.petId,
                        eventType: event.type,
                        githubEventId: event.id,
                        repoName: event.repo?.name || null,
                        hungerDelta: eHunger,
                        happinessDelta: eHappiness,
                        xpDelta: Math.floor(eXp),
                        multiplier: xpMult,
                        scoredAt: eventTime,
                        logId: crypto.randomUUID(),
                        commitCount: null,
                        linesChanged: null,
                        notes: null
                    });

                    hungerBonus += eHunger;
                    happinessBonus += eHappiness;
                    xpGain += eXp;
                    soloScore += soloE;
                    socialScore += socialE;
                    qualityScore += qualityE;
                    diversityScore += diversityE;
                }

                await db.markEventProcessed(event.id, user.user_id);
            }

            if (repoNames.size >= 2) {
                hungerBonus += 8;
                happinessBonus += 14;
                xpGain += 20 * xpMult;
                diversityScore += 1.0;
            }

            // Streak Calculation
            let newStreakCurrent = pet.streakCurrent;
            let newStreakLongest = pet.streakLongest;
            let newStreakLastDate = pet.streakLastDate;

            if (xpGain > 0) {
                // If there was any activity scoring XP, evaluate streak
                const today = new Date(now * 1000).toISOString().split('T')[0];
                if (today !== pet.streakLastDate) {
                    const yesterdayDate = new Date((now - 86400) * 1000).toISOString().split('T')[0];
                    if (pet.streakLastDate === yesterdayDate) {
                        newStreakCurrent += 1;
                    } else {
                        newStreakCurrent = 1; // broken streak, reset to 1
                    }
                    newStreakLastDate = today;
                    if (newStreakCurrent > newStreakLongest) {
                        newStreakLongest = newStreakCurrent;
                    }
                    
                    // Accumulate streak score only on the first activity of a new day
                    addedStreakScore = newStreakCurrent * 0.5;
                    
                    if (newStreakCurrent > 0 && newStreakCurrent % 5 === 0) {
                        hungerBonus += 15;
                        happinessBonus += 15;
                        xpGain += 30 * xpMult;
                        
                        await db.logActivity({
                            userId: user.user_id,
                            petId: pet.petId,
                            eventType: 'streak_bonus',
                            githubEventId: null,
                            repoName: null,
                            hungerDelta: 15,
                            happinessDelta: 15,
                            xpDelta: Math.floor(30 * xpMult),
                            multiplier: xpMult,
                            scoredAt: now,
                            logId: crypto.randomUUID(),
                            commitCount: null,
                            linesChanged: null,
                            notes: `5-day streak (${newStreakCurrent} days)`
                        });
                    }
                }
            } else {
                // Check if streak is broken by inactivity
                const today = new Date(now * 1000).toISOString().split('T')[0];
                const yesterdayDate = new Date((now - 86400) * 1000).toISOString().split('T')[0];
                if (pet.streakLastDate && pet.streakLastDate !== today && pet.streakLastDate !== yesterdayDate) {
                    newStreakCurrent = 0; // broken streak
                }
            }

            // Save trait scores
            const currentTally = await db.fetchTraitTally(user.user_id);
            if (currentTally && !currentTally.isLocked) {
                await db.upsertTraitTally(user.user_id, {
                    soloCommitScore: (currentTally.soloCommitScore || 0) + soloScore,
                    socialScore: (currentTally.socialScore || 0) + socialScore,
                    qualityScore: (currentTally.qualityScore || 0) + qualityScore,
                    diversityScore: (currentTally.diversityScore || 0) + diversityScore,
                    streakScore: (currentTally.streakScore || 0) + addedStreakScore
                });
            }

            // 4. Calculate decay (10 points per 24 hours)
            const hoursElapsed = (now - user.last_sync) / 3600;
            const decayMult = getDifficultyMult(pet.difficulty);
            const decay = (hoursElapsed / 24) * 10 * decayMult;

            const updatedStats: Partial<Pet> = {
                hunger: Math.max(0, Math.min(100, pet.hunger + hungerBonus - decay)),
                happiness: Math.max(0, Math.min(100, pet.happiness + happinessBonus - decay)),
                xp: pet.xp + xpGain,
                streakCurrent: newStreakCurrent,
                streakLongest: newStreakLongest,
                streakLastDate: newStreakLastDate
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
