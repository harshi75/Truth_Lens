// TruthLens — Data access layer. Keeps SQL out of server.js.

const db = require('../db');

function saveArticle(rawText) {
  const info = db.prepare('INSERT INTO articles (raw_text) VALUES (?)').run(rawText);
  return info.lastInsertRowid;
}

function saveClaim({ text, type, articleId = null }) {
  const info = db
    .prepare('INSERT INTO claims (article_id, text, claim_type) VALUES (?, ?, ?)')
    .run(articleId, text, type);
  return db.prepare('SELECT * FROM claims WHERE id = ?').get(info.lastInsertRowid);
}

function saveVerification(claimId, result, dataset) {
  const info = db
    .prepare(
      `INSERT INTO verifications
        (claim_id, verdict, evidence_strength, summary, what_we_know, what_we_dont_know, audit_trail, dataset_type, dataset_disclaimer)
       VALUES (@claimId, @verdict, @evidenceStrength, @summary, @whatWeKnow, @whatWeDontKnow, @auditTrail, @datasetType, @datasetDisclaimer)`
    )
    .run({
      claimId,
      verdict: result.verdict,
      evidenceStrength: result.evidenceStrength || null,
      summary: result.summary,
      whatWeKnow: JSON.stringify(result.whatWeKnow || []),
      whatWeDontKnow: JSON.stringify(result.whatWeDontKnow || []),
      auditTrail: JSON.stringify(result.auditTrail || []),
      datasetType: dataset ? dataset.mode : 'demo',
      datasetDisclaimer: dataset ? dataset.disclaimer : null,
    });

  const verificationId = info.lastInsertRowid;

  const insertSource = db.prepare(
    `INSERT INTO sources
      (verification_id, title, publisher, url, author, publication_date, retrieved_at, source_type, role, excerpt, credibility)
     VALUES (@verificationId, @title, @publisher, @url, @author, @publicationDate, @retrievedAt, @sourceType, @role, @excerpt, @credibility)`
  );

  const allSources = [
    ...(result.supportingEvidence || []),
    ...(result.contradictingEvidence || []),
    ...(result.contextEvidence || []),
  ];

  for (const s of allSources) {
    insertSource.run({
      verificationId,
      title: s.title,
      publisher: s.publisher || null,
      url: s.url || null,
      author: s.author || null,
      publicationDate: s.publicationDate || null,
      retrievedAt: s.retrievedAt || null,
      sourceType: s.sourceType || 'UNKNOWN',
      role: s.role || 'context',
      excerpt: s.excerpt || null,
      credibility: s.credibility || null,
    });
  }

  return db.prepare('SELECT * FROM verifications WHERE id = ?').get(verificationId);
}

function serializeVerification(row) {
  if (!row) return null;
  const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(row.claim_id);
  const sources = db.prepare('SELECT * FROM sources WHERE verification_id = ?').all(row.id);

  const bySources = (role) =>
    sources
      .filter((s) => s.role === role)
      .map((s) => ({
        id: s.id,
        title: s.title,
        publisher: s.publisher,
        url: s.url,
        author: s.author,
        publicationDate: s.publication_date,
        retrievedAt: s.retrieved_at,
        sourceType: s.source_type,
        role: s.role,
        excerpt: s.excerpt,
        credibility: s.credibility,
      }));

  return {
    id: row.id,
    claimId: row.claim_id,
    claim: claim ? claim.text : null,
    claimType: claim ? claim.claim_type : null,
    verdict: row.verdict,
    evidenceStrength: row.evidence_strength,
    summary: row.summary,
    whatWeKnow: JSON.parse(row.what_we_know || '[]'),
    whatWeDontKnow: JSON.parse(row.what_we_dont_know || '[]'),
    auditTrail: JSON.parse(row.audit_trail || '[]'),
    datasetType: row.dataset_type,
    datasetDisclaimer: row.dataset_disclaimer,
    supportingEvidence: bySources('supports'),
    contradictingEvidence: bySources('contradicts'),
    contextEvidence: sources
      .filter((s) => s.role === 'context' || s.role === 'neutral')
      .map((s) => ({
        id: s.id,
        title: s.title,
        publisher: s.publisher,
        url: s.url,
        author: s.author,
        publicationDate: s.publication_date,
        retrievedAt: s.retrieved_at,
        sourceType: s.source_type,
        role: s.role,
        excerpt: s.excerpt,
        credibility: s.credibility,
      })),
    createdAt: row.created_at,
  };
}

function getVerificationById(id) {
  const row = db.prepare('SELECT * FROM verifications WHERE id = ?').get(id);
  return serializeVerification(row);
}

function listRecentVerifications(limit = 20) {
  const rows = db.prepare('SELECT * FROM verifications ORDER BY id DESC LIMIT ?').all(limit);
  return rows.map(serializeVerification);
}

function getStats() {
  const rows = db.prepare('SELECT verdict FROM verifications').all();
  const counts = {
    total: rows.length,
    SUPPORTED: 0,
    CONTRADICTED: 0,
    MIXED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    OUTDATED: 0,
  };
  for (const r of rows) {
    if (counts[r.verdict] !== undefined) counts[r.verdict] += 1;
  }
  return counts;
}

function saveContactMessage({ name, email, subject, message }) {
  const info = db.prepare(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
  ).run(name, email, subject, message);
  return { id: info.lastInsertRowid };
}

module.exports = {
  saveArticle,
  saveClaim,
  saveVerification,
  getVerificationById,
  listRecentVerifications,
  getStats,
  serializeVerification,
  saveContactMessage,
};
