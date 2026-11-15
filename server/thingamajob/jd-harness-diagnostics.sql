-- Public sandbox failures only: no JD, career text, credentials or provider bodies.
-- Operator-readable through TEST D1; deliberately no public lookup endpoint.
CREATE TABLE IF NOT EXISTS thingamajob_jd_harness_diagnostics (
 reference_id TEXT PRIMARY KEY,
 stage TEXT NOT NULL,
 code TEXT NOT NULL,
 policy_version TEXT NOT NULL,
 details_json TEXT NOT NULL CHECK(json_valid(details_json)),
 recorded_at INTEGER NOT NULL DEFAULT(unixepoch())
);
