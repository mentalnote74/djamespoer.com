-- Additive SCRUM-81 storage foundation; no career truth or identity reassignment.
PRAGMA foreign_keys = ON;
CREATE TABLE thingamajob_originals (
  workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
  source_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length > 0 AND byte_length <= 10000000),
  version INTEGER NOT NULL CHECK (version = 1),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id, source_id),
  UNIQUE (workspace_id, request_key),
  UNIQUE (workspace_id, source_id, version)
);
CREATE TABLE thingamajob_original_history (
  workspace_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  operation TEXT NOT NULL CHECK (operation = 'created'),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id, source_id, version),
  FOREIGN KEY (workspace_id, source_id, version)
    REFERENCES thingamajob_originals(workspace_id, source_id, version)
);
