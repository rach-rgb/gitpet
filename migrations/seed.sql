-- Seed mock data for local demo
INSERT OR REPLACE INTO users (user_id, github_id, github_username, token_encrypted, created_at, last_active, last_sync)
VALUES ('mock-user-123', 99999, 'demo_user', 'mock-token', 1708890000, 1708890000, 1708890000);

INSERT OR REPLACE INTO pets (pet_id, user_id, name, stage, trait, hunger, happiness, health, xp, born_at, difficulty, created_at, updated_at)
VALUES ('mock-pet-456', 'mock-user-123', 'BitByte', 2, 'lone_coder', 85.0, 72.0, 95.0, 250, 1708890000, 'normal', 1708890000, 1708890000);

-- Mock activity data
INSERT INTO activity_log (log_id, user_id, pet_id, event_type, github_event_id, repo_name, hunger_delta, happiness_delta, health_delta, xp_delta, multiplier, scored_at)
VALUES 
('act-1', 'mock-user-123', 'mock-pet-456', 'PushEvent', 'ge-1', 'rach-rgb/gitpet', 15.0, 5.0, 0.0, 10, 1.0, 1708891000),
('act-2', 'mock-user-123', 'mock-pet-456', 'PullRequestEvent', 'ge-2', 'rach-rgb/gitpet', 10.0, 15.0, 0.0, 15, 1.0, 1708892000),
('act-3', 'mock-user-123', 'mock-pet-456', 'IssueCommentEvent', 'ge-3', 'rach-rgb/gitpet', 5.0, 20.0, 10.0, 15, 1.0, 1708893000),
('act-4', 'mock-user-123', 'mock-pet-456', 'PushEvent', 'ge-4', 'rach-rgb/antigravity', 15.0, 5.0, 15.0, 20, 1.0, 1708894000),
('act-5', 'mock-user-123', 'mock-pet-456', 'PullRequestEvent', 'ge-5', 'rach-rgb/gitpet', 20.0, 30.0, 10.0, 25, 1.0, 1708895000);
