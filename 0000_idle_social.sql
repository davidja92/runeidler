CREATE TABLE idle_profiles (
 account_id TEXT PRIMARY KEY NOT NULL,
 friend_code TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL,
 xp_json TEXT NOT NULL,
 total_level INTEGER NOT NULL,
 total_xp REAL NOT NULL,
 kills INTEGER NOT NULL DEFAULT 0,
 pets INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE idle_follows (
 owner_id TEXT NOT NULL REFERENCES idle_profiles(account_id) ON DELETE CASCADE,
 target_id TEXT NOT NULL REFERENCES idle_profiles(account_id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL,
 PRIMARY KEY (owner_id,target_id)
);
--> statement-breakpoint
CREATE INDEX idle_profiles_ranks ON idle_profiles(total_level DESC,total_xp DESC);
