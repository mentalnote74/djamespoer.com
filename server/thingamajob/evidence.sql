-- SCRUM-82 provenance belongs to the same committed, immutable original.
PRAGMA foreign_keys = ON;
CREATE TABLE thingamajob_evidence (
  workspace_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version = 1),
  filename TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf','docx','txt','markdown')),
  attribution TEXT NOT NULL,
  source_locator TEXT NOT NULL,
  acquired_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id, source_id),
  FOREIGN KEY (workspace_id, source_id, version)
    REFERENCES thingamajob_originals(workspace_id, source_id, version)
);
