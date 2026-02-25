-- Seed mock data for local demo
INSERT OR REPLACE INTO users (user_id, github_id, github_username, token_encrypted, created_at, last_active, last_sync)
VALUES ('mock-user-123', 99999, 'demo_user', 'mock-token', 1708890000, 1708890000, 1708890000);

INSERT OR REPLACE INTO pets (pet_id, user_id, name, stage, trait, hunger, happiness, health, xp, born_at, difficulty, created_at, updated_at)
VALUES ('mock-pet-456', 'mock-user-123', 'BitByte', 2, 'lone_coder', 85.0, 72.0, 95.0, 250, 1708890000, 'normal', 1708890000, 1708890000);
