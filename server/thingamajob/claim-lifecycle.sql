PRAGMA foreign_keys = ON;
-- Additive lifecycle ledger: original claims/reviews remain immutable history.
CREATE UNIQUE INDEX thingamajob_claim_review_identity ON thingamajob_claims(workspace_id,claim_id,proposal_id,review_id);
CREATE TABLE thingamajob_claim_supersessions (
  workspace_id TEXT NOT NULL,
  obsolete_claim_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  replacement_claim_id TEXT NOT NULL,
  replacement_proposal_id TEXT NOT NULL,
  replacement_review_id TEXT NOT NULL,
  authorizing_owner_actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  execution_context TEXT NOT NULL CHECK (execution_context IN ('owner_access','operator')),
  authorization_reference TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 4000),
  request_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  expected_obsolete_version INTEGER NOT NULL CHECK (expected_obsolete_version=1),
  expected_replacement_version INTEGER NOT NULL CHECK (expected_replacement_version=1),
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (workspace_id,obsolete_claim_id),
  UNIQUE (workspace_id,event_id),
  UNIQUE (workspace_id,request_key),
  CHECK (obsolete_claim_id<>replacement_claim_id),
  CHECK ((execution_context='owner_access' AND authorization_reference='') OR
    (execution_context='operator' AND length(trim(authorization_reference)) BETWEEN 1 AND 1000)),
  FOREIGN KEY (workspace_id,obsolete_claim_id) REFERENCES thingamajob_claims(workspace_id,claim_id),
  FOREIGN KEY (workspace_id,replacement_claim_id,replacement_proposal_id,replacement_review_id)
    REFERENCES thingamajob_claims(workspace_id,claim_id,proposal_id,review_id)
);
CREATE TRIGGER thingamajob_claim_supersessions_no_update BEFORE UPDATE ON thingamajob_claim_supersessions
BEGIN SELECT RAISE(ABORT,'Immutable claim lifecycle event'); END;
CREATE TRIGGER thingamajob_claim_supersessions_no_delete BEFORE DELETE ON thingamajob_claim_supersessions
BEGIN SELECT RAISE(ABORT,'Immutable claim lifecycle event'); END;
CREATE VIEW thingamajob_active_claims AS
SELECT c.* FROM thingamajob_claims c WHERE NOT EXISTS
  (SELECT 1 FROM thingamajob_claim_supersessions s WHERE s.workspace_id=c.workspace_id AND s.obsolete_claim_id=c.claim_id);

CREATE TABLE thingamajob_claim_correction_proposals (
  workspace_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  obsolete_claim_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 4000),
  PRIMARY KEY (workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,proposal_id) REFERENCES thingamajob_proposals(workspace_id,proposal_id),
  FOREIGN KEY (workspace_id,obsolete_claim_id) REFERENCES thingamajob_claims(workspace_id,claim_id)
);
CREATE TRIGGER thingamajob_claim_corrections_no_update BEFORE UPDATE ON thingamajob_claim_correction_proposals
BEGIN SELECT RAISE(ABORT,'Immutable correction relationship'); END;
CREATE TRIGGER thingamajob_claim_corrections_no_delete BEFORE DELETE ON thingamajob_claim_correction_proposals
BEGIN SELECT RAISE(ABORT,'Immutable correction relationship'); END;
CREATE TRIGGER thingamajob_claim_supersessions_active_targets BEFORE INSERT ON thingamajob_claim_supersessions
BEGIN
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM thingamajob_active_claims WHERE workspace_id=NEW.workspace_id AND claim_id=NEW.obsolete_claim_id)
    OR NOT EXISTS (SELECT 1 FROM thingamajob_active_claims WHERE workspace_id=NEW.workspace_id AND claim_id=NEW.replacement_claim_id)
    THEN RAISE(ABORT,'Claim lifecycle conflict') END;
END;
