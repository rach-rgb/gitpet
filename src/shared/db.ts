import { D1Database } from '@cloudflare/workers-types';
import { User, Pet, TraitTally, ActivityLog } from './types';

/**
 * Database wrapper for interacting with Cloudflare D1.
 * Adheres to .agent/clean-code.md naming conventions.
 */
export class Database {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async fetchUserByGithubId(githubId: number): Promise<User | null> {
        return await this.db
            .prepare('SELECT * FROM users WHERE github_id = ?')
            .bind(githubId)
            .first<User>();
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

        const result = await this.db.prepare('SELECT * FROM users WHERE github_id = ?').bind(user.githubId).first<User>();
        if (!result) throw new Error('Failed to upsert user');
        return result;
    }

    async fetchPet(userId: string): Promise<Pet | null> {
        return await this.db
            .prepare('SELECT * FROM pets WHERE user_id = ?')
            .bind(userId)
            .first<Pet>();
    }

    async fetchPetById(petId: string): Promise<Pet | null> {
        return await this.db
            .prepare('SELECT * FROM pets WHERE pet_id = ?')
            .bind(petId)
            .first<Pet>();
    }

    async createPet(pet: any): Promise<Pet> {
        const now = Math.floor(Date.now() / 1000);
        const petId = crypto.randomUUID();
        await this.db.prepare(`
            INSERT INTO pets (pet_id, user_id, name, difficulty, created_at, updated_at, born_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(petId, pet.userId, pet.name, pet.difficulty, now, now, now)
            .run();
        const result = await this.db.prepare('SELECT * FROM pets WHERE pet_id = ?').bind(petId).first<Pet>();
        if (!result) throw new Error('Failed to create pet');
        return result;
    }

    async updatePetStats(petId: string, stats: Partial<Pet>): Promise<void> {
        const entries = Object.entries(stats);
        if (entries.length === 0) return;
        const sets = entries.map(([key]) => `${key} = ?`).join(', ');
        const values = entries.map(([, value]) => value);
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
        return await this.db
            .prepare('SELECT * FROM trait_tally WHERE user_id = ?')
            .bind(userId)
            .first<TraitTally>();
    }

    async upsertTraitTally(userId: string, updates: Partial<TraitTally>): Promise<void> {
        const entries = Object.entries(updates);
        if (entries.length === 0) return;
        const sets = entries.map(([key]) => `${key} = ?`).join(', ');
        const values = entries.map(([, value]) => value);
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

    async fetchNotifications(userId: string): Promise<any[]> {
        const result = await this.db
            .prepare('SELECT * FROM notifications WHERE user_id = ? AND seen = 0 ORDER BY created_at DESC')
            .bind(userId)
            .all();
        return result.results || [];
    }
}
