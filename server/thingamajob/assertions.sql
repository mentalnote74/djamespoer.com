PRAGMA foreign_keys = ON;
CREATE TABLE thingamajob_proposals (
  workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
  proposal_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  statement TEXT NOT NULL,
  proposer_attribution TEXT NOT NULL,
  proposer_actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  original_version INTEGER NOT NULL DEFAULT 1 CHECK (original_version=1),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version IN (1,2)),
  disposition TEXT NOT NULL DEFAULT 'proposed' CHECK (disposition IN ('proposed','accepted','rejected','corrected')),
  final_review_id TEXT,
  proposed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,proposal_id),
  UNIQUE (workspace_id,request_key),
  UNIQUE (workspace_id,proposal_id,current_version,disposition,final_review_id),
  CHECK ((disposition='proposed' AND current_version=1 AND final_review_id IS NULL)
    OR (disposition<>'proposed' AND current_version=2 AND final_review_id IS NOT NULL))
);
CREATE TABLE thingamajob_proposal_sources (
  workspace_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  locator TEXT NOT NULL,
  PRIMARY KEY (workspace_id,proposal_id,source_id),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,source_id) REFERENCES thingamajob_evidence(workspace_id,source_id)
);
CREATE TABLE thingamajob_reviews (
  workspace_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  owner_actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  expected_version INTEGER NOT NULL CHECK (expected_version=1),
  resulting_version INTEGER NOT NULL CHECK (resulting_version=2),
  decision TEXT NOT NULL CHECK (decision IN ('accepted','rejected','corrected')),
  corrected_statement TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,review_id),
  UNIQUE (workspace_id,proposal_id),
  UNIQUE (workspace_id,request_key),
  UNIQUE (workspace_id,review_id,decision),
  FOREIGN KEY (workspace_id,proposal_id,resulting_version,decision,review_id)
    REFERENCES thingamajob_proposals(workspace_id,proposal_id,current_version,disposition,final_review_id),
  CHECK ((decision='corrected' AND length(trim(corrected_statement))>0)
    OR (decision<>'corrected' AND corrected_statement=''))
);
CREATE TABLE thingamajob_claims (
  workspace_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version=1),
  disposition TEXT NOT NULL CHECK (disposition IN ('accepted','corrected')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,claim_id),
  UNIQUE (workspace_id,review_id),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,review_id,disposition) REFERENCES thingamajob_reviews(workspace_id,review_id,decision)
);
CREATE TABLE thingamajob_claim_sources (
  workspace_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  locator TEXT NOT NULL,
  PRIMARY KEY (workspace_id,claim_id,source_id),
  FOREIGN KEY (workspace_id,claim_id) REFERENCES thingamajob_claims(workspace_id,claim_id),
  FOREIGN KEY (workspace_id,source_id) REFERENCES thingamajob_evidence(workspace_id,source_id)
);
CREATE TABLE thingamajob_assertion_history (
  workspace_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version IN (1,2)),
  operation TEXT NOT NULL CHECK (operation IN ('proposed','accepted','rejected','corrected')),
  actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  review_id TEXT,
  statement TEXT NOT NULL,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,proposal_id,version),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,review_id) REFERENCES thingamajob_reviews(workspace_id,review_id),
  CHECK ((version=1 AND operation='proposed' AND review_id IS NULL)
    OR (version=2 AND operation<>'proposed' AND review_id IS NOT NULL))
);
