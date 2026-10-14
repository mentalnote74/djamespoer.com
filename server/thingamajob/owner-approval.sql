-- SCRUM-80 trusted TEST onboarding only. No cookie, OTP, email or career material.
CREATE TABLE IF NOT EXISTS thingamajob_pending_identities (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  PRIMARY KEY (issuer, subject)
);
CREATE TABLE IF NOT EXISTS thingamajob_owner_approvals (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  PRIMARY KEY (issuer, subject),
  FOREIGN KEY (issuer, subject) REFERENCES thingamajob_pending_identities (issuer, subject)
);
