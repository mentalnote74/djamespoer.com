-- SCRUM-141: public telemetry is deliberately separate from permanent career/history rows.
CREATE TABLE IF NOT EXISTS thingamajob_public_attempts (
  attempt_id TEXT PRIMARY KEY,
  session_id TEXT,
  input_method TEXT NOT NULL CHECK(input_method IN ('text','url','file','unknown')),
  status TEXT NOT NULL CHECK(status IN ('preparing','prepared','evaluating','complete','failed','rejected')),
  stage TEXT NOT NULL,
  code TEXT,
  policy_version TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS thingamajob_public_attempt_expiry ON thingamajob_public_attempts(expires_at);
CREATE INDEX IF NOT EXISTS thingamajob_public_attempt_session ON thingamajob_public_attempts(session_id,created_at);
CREATE TABLE IF NOT EXISTS thingamajob_public_events (
  attempt_id TEXT NOT NULL REFERENCES thingamajob_public_attempts(attempt_id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  context TEXT NOT NULL,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY(attempt_id,event,context)
);
