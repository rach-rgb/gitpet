import { D1Database } from '@cloudflare/workers-types';
import { User, Pet, TraitTally, ActivityLog } from './types';

/**
 * Helper to map DB snake_case columns to camelCase TS interfaces.
 */
function mapUser(row: any): User {
    return {
        userId: row.user_id,
        githubId: row.github_id,
        githubUsername: row.github_username,
        tokenEncrypted: row.token_encrypted,
        createdAt: row.created_at,
        lastActive: row.last_active,
        lastSync: row.last_sync,
    };
}

function mapPet(row: any): Pet {
    return {
        petId: row.pet_id,
        userId: row.user_id,
        name: row.name,
        stage: row.stage,
        trait: row.trait,
        hunger: row.hunger,
        happiness: row.happiness,
        health: row.health,
        xp: row.xp,
        streakCurrent: row.streak_current,
        streakLongest: row.streak_longest,
        streakLastDate: row.streak_last_date,
        isDormant: !!row.is_dormant,
        dormantSince: row.dormant_since,
        legendaryAchieved: !!row.legendary_achieved,
        legendaryAchievedAt: row.legendary_achieved_at,
        difficulty: row.difficulty,
        bornAt: row.born_at,
        hatchedAt: row.hatched_at,
        traitLockedAt: row.trait_locked_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export class Database {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async fetchUserByGithubId(githubId: number): Promise<User | null> {
        const row = await this.db.prepare('SELECT * FROM users WHERE github_id = ?').bind(githubId).first<any>();
        return row ? mapUser(row) : null;
    }

    async fetchUserByUserId(userId: string): Promise<User | null> {
        const row = await this.db.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first<any>();
        return row ? mapUser(row) : null;
    }

    async upsertUser(user: any): Promise<User> {
        const now = Math.floor(Date.now() / 1000);
        const userId = user.userId || crypto.randomUUID();

        await this.db.prepare(`
            INSERT INTO users (user_id, github_id, github_username, token_encrypted, created_at, last_active)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(github_id) DO UPDATE SET
                github_username = excluded.github_username,
                token_encrypted = excluded.token_encrypted,
                last_active = excluded.last_active
        `).bind(userId, user.githubId, user.githubUsername, user.tokenEncrypted, now, now)
            .run();

        return (await this.fetchUserByGithubId(user.githubId))!;
    }

    async fetchPet(userId: string): Promise<Pet | null> {
        const row = await this.db.prepare('SELECT * FROM pets WHERE user_id = ?').bind(userId).first<any>();
        return row ? mapPet(row) : null;
    }

    async fetchPetById(petId: string): Promise<Pet | null> {
        const row = await this.db.prepare('SELECT * FROM pets WHERE pet_id = ?').bind(petId).first<any>();
        return row ? mapPet(row) : null;
    }

    async createPet(pet: any): Promise<Pet> {
        const now = Math.floor(Date.now() / 1000);
        const petId = crypto.randomUUID();
        await this.db.prepare(`
            INSERT INTO pets (pet_id, user_id, name, difficulty, created_at, updated_at, born_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(petId, pet.userId, pet.name, pet.difficulty, now, now, now)
            .run();
        return (await this.fetchPetById(petId))!;
    }

    async updatePetStats(petId: string, stats: Partial<Pet>): Promise<void> {
        const mapping: Record<string, string> = {
            hunger: 'hunger', happiness: 'happiness', health: 'health', xp: 'xp',
            stage: 'stage', trait: 'trait', streakCurrent: 'streak_current',
            streakLongest: 'streak_longest', isDormant: 'is_dormant',
            updatedAt: 'updated_at'
        };

        const entries = Object.entries(stats).filter(([k]) => mapping[k]);
        if (entries.length === 0) return;

        const sets = entries.map(([k]) => `${mapping[k]} = ?`).join(', ');
        const values = entries.map(([, v]) => v);

        await this.db.prepare(`UPDATE pets SET ${sets}, updated_at = ? WHERE pet_id = ?`)
            .bind(...values, Math.floor(Date.now() / 1000), petId)
            .run();
    }

    async deletePet(petId: string): Promise<void> {
        await this.db.prepare('DELETE FROM pets WHERE pet_id = ?').bind(petId).run();
    }

    async storeOAuthState(state: string): Promise<void> {
        const now = Math.floor(Date.now() / 1000);
        await this.db.prepare('INSERT INTO oauth_states (state, created_at) VALUES (?, ?)').bind(state, now).run();
    }

    async consumeOAuthState(state: string): Promise<boolean> {
        const result = await this.db.prepare('SELECT * FROM oauth_states WHERE state = ?').bind(state).first();
        if (!result) return false;
        await this.db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
        return true;
    }

    async fetchTraitTally(userId: string): Promise<TraitTally | null> {
        const row = await this.db.prepare('SELECT * FROM trait_tally WHERE user_id = ?').bind(userId).first<any>();
        if (!row) return null;
        return {
            userId: row.user_id,
            soloCommitScore: row.solo_commit_score,
            socialScore: row.social_score,
            qualityScore: row.quality_score,
            diversityScore: row.diversity_score,
            streakScore: row.streak_score,
            trackingUntil: row.tracking_until,
            isLocked: !!row.is_locked
        };
    }

    async upsertTraitTally(userId: string, updates: Partial<TraitTally>): Promise<void> {
        const mapping: Record<string, string> = {
            soloCommitScore: 'solo_commit_score',
            socialScore: 'social_score',
            qualityScore: 'quality_score',
            diversityScore: 'diversity_score',
            streakScore: 'streak_score',
            isLocked: 'is_locked'
        };
        const entries = Object.entries(updates).filter(([k]) => mapping[k]);
        if (entries.length === 0) return;
        const sets = entries.map(([k]) => `${mapping[k]} = ?`).join(', ');
        const values = entries.map(([, v]) => v);
        await this.db.prepare(`UPDATE trait_tally SET ${sets} WHERE user_id = ?`)
            .bind(...values, userId)
            .run();
    }

    async markEventProcessed(eventId: string, userId: string): Promise<void> {
        await this.db.prepare('INSERT INTO processed_events (event_id, user_id, processed_at) VALUES (?, ?, ?)')
            .bind(eventId, userId, Math.floor(Date.now() / 1000))
            .run();
    }

    async isEventProcessed(eventId: string, userId: string): Promise<boolean> {
        const result = await this.db.prepare('SELECT 1 FROM processed_events WHERE event_id = ? AND user_id = ?')
            .bind(eventId, userId)
            .first();
        return !!result;
    }

    async addToHallOfFame(hof: any): Promise<void> {
        const historyId = crypto.randomUUID();
        await this.db.prepare(`
            INSERT INTO hall_of_fame (history_id, user_id, pet_id, name, stage, trait, difficulty, xp, streak_longest, born_at, retired_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(historyId, hof.userId, hof.petId, hof.name, hof.stage, hof.trait, hof.difficulty, hof.xp, hof.streakLongest, hof.bornAt, hof.retiredAt)
            .run();
    }

    async fetchHallOfFame(userId: string): Promise<any[]> {
        const result = await this.db
            .prepare('SELECT * FROM hall_of_fame WHERE user_id = ? ORDER BY retired_at DESC')
            .bind(userId)
            .all();
        return result.results || [];
    }

    async createNotification(userId: string, type: string, payload: any): Promise<void> {
        const notificationId = crypto.randomUUID();
        await this.db.prepare('INSERT INTO notifications (notification_id, user_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(notificationId, userId, type, JSON.stringify(payload), Math.floor(Date.now() / 1000))
            .run();
    }
}
