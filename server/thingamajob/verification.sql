-- Isolated fictional verification D1 ONLY. Never apply to James/Erica D1.
CREATE TABLE scrum85_verification_run (
  id TEXT PRIMARY KEY CHECK (id='scrum85-fictional-only'),
  state TEXT NOT NULL CHECK (state IN ('ready','running','passed','failed')),
  report TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO scrum85_verification_run(id,state) VALUES ('scrum85-fictional-only','ready');
