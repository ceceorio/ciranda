-- Ciranda video module schema.
-- Safe initial migration: creates tables only when they do not exist.

CREATE TABLE IF NOT EXISTS video_rooms (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  project_name TEXT,
  primary_language TEXT NOT NULL DEFAULT 'pt-BR',
  caption_languages TEXT NOT NULL DEFAULT '["pt-BR","en"]',
  recording_policy TEXT NOT NULL DEFAULT 'manual',
  drive_folder_id TEXT,
  storage_status TEXT NOT NULL DEFAULT 'local_pending_sync',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS video_room_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES video_rooms(id),
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  is_fixed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS video_sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES video_rooms(id),
  technical_room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS video_session_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id),
  user_id TEXT,
  peer_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  participant_type TEXT NOT NULL DEFAULT 'guest',
  joined_at TIMESTAMP NOT NULL,
  left_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_recordings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  local_path TEXT,
  drive_file_id TEXT,
  error_message TEXT,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS video_transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id),
  provider TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  content TEXT,
  local_path TEXT,
  drive_file_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS video_captions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES video_sessions(id),
  participant_id TEXT,
  language TEXT NOT NULL,
  translated_language TEXT,
  text TEXT NOT NULL,
  translated_text TEXT,
  started_at_ms INTEGER,
  ended_at_ms INTEGER,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_rooms_slug ON video_rooms(slug);
CREATE INDEX IF NOT EXISTS idx_video_sessions_room_id ON video_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_session_id ON video_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_session_id ON video_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_video_captions_session_id ON video_captions(session_id);
