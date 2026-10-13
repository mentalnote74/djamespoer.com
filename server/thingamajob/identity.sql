-- SCRUM-80 identity/ownership only. No evidence, claims, UNKNOWNs, or API resources.
PRAGMA foreign_keys = ON;
CREATE TABLE thingamajob_actors (
  actor_id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (issuer, subject)
);
CREATE TABLE thingamajob_workspaces (
  workspace_id TEXT PRIMARY KEY,
  owner_actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE TABLE thingamajob_memberships (
  actor_id TEXT NOT NULL REFERENCES thingamajob_actors(actor_id),
  workspace_id TEXT NOT NULL REFERENCES thingamajob_workspaces(workspace_id),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  PRIMARY KEY (actor_id, workspace_id)
);
