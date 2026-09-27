const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'truthlens.db'));

db.pragma('journal_mode = WAL');

// Schema for TruthLens claim-verification MVP.
//
// articles: an optional raw submission (pasted article/paragraph) that one
//   or more claims were extracted from.
// claims: an individual factual/opinion/prediction/subjective statement.
// verifications: the result of running the verdict engine on a claim.
//   One claim can in principle be re-verified; we keep the latest.
// sources: evidence sources attached to a verification, with role
//   (supports/contradicts/context) and full citation metadata.
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER REFERENCES articles(id),
    text TEXT NOT NULL,
    claim_type TEXT NOT NULL DEFAULT 'FACTUAL',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    verdict TEXT NOT NULL,
    evidence_strength TEXT,
    summary TEXT NOT NULL,
    what_we_know TEXT NOT NULL DEFAULT '[]',
    what_we_dont_know TEXT NOT NULL DEFAULT '[]',
    audit_trail TEXT NOT NULL DEFAULT '[]',
    dataset_type TEXT NOT NULL DEFAULT 'demo',
    dataset_disclaimer TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verification_id INTEGER NOT NULL REFERENCES verifications(id),
    title TEXT NOT NULL,
    publisher TEXT,
    url TEXT,
    author TEXT,
    publication_date TEXT,
    retrieved_at TEXT,
    source_type TEXT NOT NULL DEFAULT 'UNKNOWN',
    role TEXT NOT NULL DEFAULT 'context',
    excerpt TEXT,
    credibility TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_verifications_claim ON verifications(claim_id);
  CREATE INDEX IF NOT EXISTS idx_sources_verification ON sources(verification_id);

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

module.exports = db;
