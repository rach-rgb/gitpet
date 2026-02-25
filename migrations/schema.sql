-- D1 Schema for Petgotchi

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id         TEXT    PRIMARY KEY,
  github_id       INTEGER NOT NULL UNIQUE,
  github_username TEXT    NOT NULL,
  token_encrypted TEXT    NOT NULL,
  created_at      INTEGER NOT NULL,
  last_active     INTEGER NOT NULL,
  last_sync       INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Oauth states table
CREATE TABLE IF NOT EXISTS oauth_states (
  state      TEXT    PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- Pets table
CREATE TABLE IF NOT EXISTS pets (
  pet_id              TEXT    PRIMARY KEY,
  user_id             TEXT    NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  name                TEXT    NOT NULL,
  stage               INTEGER NOT NULL DEFAULT 0,
  trait               TEXT,
  hunger              REAL    NOT NULL DEFAULT 100.0,
  happiness           REAL    NOT NULL DEFAULT 100.0,
  health              REAL    NOT NULL DEFAULT 100.0,
  xp                  INTEGER NOT NULL DEFAULT 0,
  streak_current      INTEGER NOT NULL DEFAULT 0,
  streak_longest      INTEGER NOT NULL DEFAULT 0,
  streak_last_date    TEXT,
  is_dormant          INTEGER NOT NULL DEFAULT 0,
  dormant_since       INTEGER,
  legendary_achieved    INTEGER NOT NULL DEFAULT 0,
  legendary_achieved_at INTEGER,
  difficulty          TEXT    NOT NULL DEFAULT 'normal',
  born_at             INTEGER NOT NULL,
  hatched_at          INTEGER,
  trait_locked_at     INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_stage ON pets(stage);

-- Hall of Fame table
CREATE TABLE IF NOT EXISTS hall_of_fame (
  history_id          TEXT    PRIMARY KEY,
  user_id             TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id              TEXT    NOT NULL,
  name                TEXT    NOT NULL,
  stage               INTEGER NOT NULL,
  trait               TEXT    NOT NULL,
  difficulty          TEXT    NOT NULL,
  xp                  INTEGER NOT NULL,
  streak_longest      INTEGER NOT NULL,
  born_at             INTEGER NOT NULL,
  retired_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hof_user_id ON hall_of_fame(user_id);

-- Trait Tally table
CREATE TABLE IF NOT EXISTS trait_tally (
  user_id          TEXT    PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  solo_commit_score  REAL NOT NULL DEFAULT 0.0,
  social_score       REAL NOT NULL DEFAULT 0.0,
  quality_score      REAL NOT NULL DEFAULT 0.0,
  diversity_score    REAL NOT NULL DEFAULT 0.0,
  streak_score       REAL NOT NULL DEFAULT 0.0,
  tracking_until   INTEGER NOT NULL,
  is_locked        INTEGER NOT NULL DEFAULT 0
);

-- Activity Log table
CREATE TABLE IF NOT EXISTS activity_log (
  log_id           TEXT    PRIMARY KEY,
  user_id          TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  pet_id           TEXT    NOT NULL REFERENCES pets(pet_id)   ON DELETE CASCADE,
  event_type       TEXT    NOT NULL,
  github_event_id  TEXT,
  repo_name        TEXT,
  hunger_delta     REAL    NOT NULL DEFAULT 0.0,
  happiness_delta  REAL    NOT NULL DEFAULT 0.0,
  health_delta     REAL    NOT NULL DEFAULT 0.0,
  xp_delta         INTEGER NOT NULL DEFAULT 0,
  commit_count     INTEGER,
  lines_changed    INTEGER,
  multiplier       REAL    NOT NULL DEFAULT 1.0,
  notes            TEXT,
  scored_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_scored ON activity_log(user_id, scored_at DESC);

-- Processed Events table
CREATE TABLE IF NOT EXISTS processed_events (
  event_id     TEXT    PRIMARY KEY,
  user_id      TEXT    NOT NULL,
  processed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_user ON processed_events(user_id, processed_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id  TEXT    PRIMARY KEY,
  user_id          TEXT    NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type             TEXT    NOT NULL,
  payload          TEXT    NOT NULL,
  seen             INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL
);
