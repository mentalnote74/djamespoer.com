CREATE TABLE IF NOT EXISTS thingamajob_jd_diagnostics (
 workspace_id TEXT NOT NULL,evaluation_id TEXT NOT NULL,
 stage TEXT NOT NULL,code TEXT NOT NULL,details_json TEXT NOT NULL CHECK(json_valid(details_json)),
 recorded_at INTEGER NOT NULL DEFAULT(unixepoch()),
 PRIMARY KEY(workspace_id,evaluation_id),
 FOREIGN KEY(workspace_id,evaluation_id) REFERENCES thingamajob_jd_evaluations(workspace_id,evaluation_id)
);
