PRAGMA foreign_keys = ON;
CREATE UNIQUE INDEX thingamajob_claim_proposal_identity ON thingamajob_claims(workspace_id,proposal_id,claim_id);
CREATE TABLE thingamajob_unknowns (
  workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
  unknown_id TEXT NOT NULL,
  question TEXT NOT NULL,
  reason TEXT NOT NULL,
  context TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version>=1),
  state TEXT NOT NULL CHECK (state IN ('open','resolved')),
  last_event_id TEXT NOT NULL,
  resolution_id TEXT,
  PRIMARY KEY (workspace_id,unknown_id),
  CHECK ((state='open' AND resolution_id IS NULL) OR (state='resolved' AND resolution_id IS NOT NULL))
);
CREATE TABLE thingamajob_unknown_events (
  workspace_id TEXT NOT NULL,
  unknown_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('opened','answered','proposal-linked','resolved')),
  request_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  answer_id TEXT NOT NULL DEFAULT '',
  proposal_id TEXT NOT NULL DEFAULT '',
  claim_id TEXT NOT NULL DEFAULT '',
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,event_id),
  UNIQUE (workspace_id,unknown_id,event_id),
  UNIQUE (workspace_id,unknown_id,version),
  UNIQUE (workspace_id,operation,request_key),
  FOREIGN KEY (workspace_id,unknown_id) REFERENCES thingamajob_unknowns(workspace_id,unknown_id)
);
CREATE TABLE thingamajob_unknown_answers (
  workspace_id TEXT NOT NULL,
  unknown_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  attribution TEXT NOT NULL,
  PRIMARY KEY (workspace_id,answer_id),
  UNIQUE (workspace_id,unknown_id,answer_id),
  FOREIGN KEY (workspace_id,unknown_id,event_id) REFERENCES thingamajob_unknown_events(workspace_id,unknown_id,event_id)
);
CREATE TABLE thingamajob_unknown_answer_sources (
  workspace_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  locator TEXT NOT NULL,
  PRIMARY KEY (workspace_id,answer_id,source_id),
  FOREIGN KEY (workspace_id,answer_id) REFERENCES thingamajob_unknown_answers(workspace_id,answer_id),
  FOREIGN KEY (workspace_id,source_id) REFERENCES thingamajob_evidence(workspace_id,source_id)
);
CREATE TABLE thingamajob_unknown_proposals (
  workspace_id TEXT NOT NULL,
  unknown_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  PRIMARY KEY (workspace_id,unknown_id,answer_id),
  UNIQUE (workspace_id,unknown_id,answer_id,proposal_id),
  FOREIGN KEY (workspace_id,unknown_id,answer_id) REFERENCES thingamajob_unknown_answers(workspace_id,unknown_id,answer_id),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,unknown_id,event_id) REFERENCES thingamajob_unknown_events(workspace_id,unknown_id,event_id)
);
CREATE TABLE thingamajob_unknown_resolutions (
  workspace_id TEXT NOT NULL,
  unknown_id TEXT NOT NULL,
  resolution_id TEXT NOT NULL,
  answer_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  explanation TEXT NOT NULL CHECK (length(trim(explanation))>0),
  expected_version INTEGER NOT NULL,
  resulting_version INTEGER NOT NULL CHECK (resulting_version=expected_version+1),
  PRIMARY KEY (workspace_id,resolution_id),
  UNIQUE (workspace_id,unknown_id),
  FOREIGN KEY (workspace_id,unknown_id,answer_id,proposal_id) REFERENCES thingamajob_unknown_proposals(workspace_id,unknown_id,answer_id,proposal_id),
  FOREIGN KEY (workspace_id,proposal_id,claim_id) REFERENCES thingamajob_claims(workspace_id,proposal_id,claim_id),
  FOREIGN KEY (workspace_id,unknown_id,event_id) REFERENCES thingamajob_unknown_events(workspace_id,unknown_id,event_id)
);
