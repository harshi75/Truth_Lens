// TruthLens — Verdict Engine
//
// Turns a claim + a set of evidence sources into a neutral verdict. This is
// the module that encodes the project's core promise: TruthLens checks
// INFORMATION, not IDEOLOGIES, never treats "no evidence" as "false", and
// never fabricates a verdict beyond what the supplied evidence supports.
//
// The verdict label, evidence strength, and audit trail below are ALWAYS
// computed deterministically by computeVerdict() — that never changes, keys
// or no keys. When GEMINI_API_KEY is configured, computeVerdictSmart() takes
// that same rule-based result and asks Gemini only to rewrite the `summary`
// into a clearer explanation grounded strictly in the given verdict and
// evidence list; Gemini is never allowed to change the verdict, evidence
// strength, or which sources support/contradict/contextualize the claim.

const llm = require('./llm');

const SOURCE_QUALITY_RANK = {
  OFFICIAL: 5,
  GOVERNMENT: 5,
  PRIMARY: 4,
  ACADEMIC: 4,
  FACT_CHECK: 3,
  NEWS: 2,
  SECONDARY: 2,
  UNKNOWN: 1,
};

const VERDICTS = {
  SUPPORTED: 'SUPPORTED',
  CONTRADICTED: 'CONTRADICTED',
  MIXED: 'MIXED',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  OUTDATED: 'OUTDATED',
};

function nonFactualResult(claimType) {
  const explanations = {
    OPINION: 'This appears to be an opinion or subjective statement rather than a directly verifiable factual claim.',
    SUBJECTIVE: 'This appears to be an opinion or subjective statement rather than a directly verifiable factual claim.',
    PREDICTION: 'This is a prediction about the future. TruthLens can surface relevant context, but a forecast cannot be verified as true or false today.',
  };
  return {
    verdict: 'NOT_VERIFIABLE',
    evidenceStrength: null,
    summary: explanations[claimType] || explanations.OPINION,
    whatWeKnow: [],
    whatWeDontKnow: ['This statement is not a directly checkable factual claim.'],
    supportingEvidence: [],
    contradictingEvidence: [],
    contextEvidence: [],
    auditTrail: [
      'Claim received.',
      `Claim classified as ${claimType}.`,
      'Verification skipped — not a directly verifiable factual claim.',
    ],
  };
}

function rankSource(source) {
  const quality = SOURCE_QUALITY_RANK[source.sourceType] || 1;
  const credibilityBonus = source.credibility === 'HIGH' ? 1 : source.credibility === 'LOW' ? -1 : 0;
  return quality + credibilityBonus;
}

function computeEvidenceStrength({ supporting, contradicting, context, agreementConflict }) {
  const total = supporting.length + contradicting.length;
  const independentQualitySources = [...supporting, ...contradicting].filter((s) => rankSource(s) >= 4);

  const reasons = [];
  let strength;

  if (total === 0) {
    return { strength: null, reasons: ['No supporting or contradicting sources were found.'] };
  }

  if (independentQualitySources.length >= 2 && !agreementConflict) {
    strength = 'HIGH';
    reasons.push('Multiple independent sources agree.');
    reasons.push('Evidence includes primary, official, government, or academic sources.');
  } else if (total >= 2 && (independentQualitySources.length >= 1 || !agreementConflict)) {
    strength = 'MEDIUM';
    reasons.push('Evidence exists but is limited in quantity or source diversity.');
    if (agreementConflict) reasons.push('Some disagreement exists between sources.');
  } else {
    strength = 'LOW';
    reasons.push('Little reliable evidence was found, or sources are weak / indirect.');
  }

  return { strength, reasons };
}

function buildWhatWeKnow(sources) {
  return sources.map((s) => `${s.excerpt} (${s.publisher}${s.publicationDate ? ', ' + s.publicationDate.slice(0, 4) : ''})`);
}

function buildWhatWeDontKnow({ supporting, contradicting, context, claimType }) {
  const unknowns = [];
  if (supporting.length === 0 && contradicting.length === 0) {
    unknowns.push('No sources directly supporting or contradicting this specific claim were found in the evidence available to TruthLens.');
  }
  if (supporting.length > 0 && contradicting.length > 0) {
    unknowns.push('Sources disagree — TruthLens could not fully reconcile the conflicting evidence below.');
  }
  if (context.length === 0 && supporting.length + contradicting.length <= 1) {
    unknowns.push('Little independent corroboration was available beyond the source(s) listed above.');
  }
  return unknowns;
}

/**
 * @param {{text: string, type: string}} claim
 * @param {Array} sources - evidence sources from evidenceEngine
 * @param {object} [options]
 * @param {boolean} [options.isOutdatedTopic] - demo-data hint that the newest
 *   evidence supersedes older evidence for this specific claim.
 */
function computeVerdict(claim, sources, options = {}) {
  const auditTrail = ['Claim received.', `Claim classified as ${claim.type}.`];

  if (claim.type !== 'FACTUAL') {
    return nonFactualResult(claim.type);
  }

  auditTrail.push('Search performed for relevant evidence.');
  auditTrail.push(`${sources.length} source(s) identified.`);

  if (sources.length === 0) {
    auditTrail.push('No sources found — verdict set to INSUFFICIENT EVIDENCE.');
    return {
      verdict: VERDICTS.INSUFFICIENT_EVIDENCE,
      evidenceStrength: 'LOW',
      summary: 'TruthLens could not find reliable evidence to confirm or dispute this claim. This does not mean the claim is false — only that sufficient evidence was not available for review.',
      whatWeKnow: [],
      whatWeDontKnow: ['No reliable evidence was found for this specific claim.'],
      supportingEvidence: [],
      contradictingEvidence: [],
      contextEvidence: [],
      auditTrail,
    };
  }

  const supporting = sources.filter((s) => s.role === 'supports').sort((a, b) => rankSource(b) - rankSource(a));
  const contradicting = sources.filter((s) => s.role === 'contradicts').sort((a, b) => rankSource(b) - rankSource(a));
  const context = sources.filter((s) => s.role === 'context' || s.role === 'neutral');

  auditTrail.push(`${supporting.length} supporting source(s).`);
  auditTrail.push(`${contradicting.length} contradicting source(s).`);
  auditTrail.push(`${context.length} contextual source(s).`);
  auditTrail.push('Evidence compared by source quality, recency, and agreement.');

  let verdict;
  let summary;

  if (options.isOutdatedTopic) {
    verdict = VERDICTS.OUTDATED;
    summary = 'This claim may have been accurate at an earlier point in time, but more recent evidence indicates circumstances have since changed.';
  } else if (supporting.length > 0 && contradicting.length === 0) {
    verdict = VERDICTS.SUPPORTED;
    summary = 'Available evidence substantially supports this claim.';
  } else if (contradicting.length > 0 && supporting.length === 0) {
    verdict = VERDICTS.CONTRADICTED;
    summary = 'Available evidence directly conflicts with this claim.';
  } else {
    verdict = VERDICTS.MIXED;
    summary = 'Parts of this claim are supported while other parts are contradicted, incomplete, or not fully corroborated.';
  }

  const { strength, reasons } = computeEvidenceStrength({
    supporting,
    contradicting,
    context,
    agreementConflict: supporting.length > 0 && contradicting.length > 0,
  });

  auditTrail.push(`Evidence strength assessed as ${strength}: ${reasons.join(' ')}`);
  auditTrail.push(`Final verdict: ${verdict}.`);

  return {
    verdict,
    evidenceStrength: strength,
    evidenceStrengthReasons: reasons,
    summary,
    whatWeKnow: buildWhatWeKnow([...supporting, ...contradicting]),
    whatWeDontKnow: buildWhatWeDontKnow({ supporting, contradicting, context, claimType: claim.type }),
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    contextEvidence: context,
    auditTrail,
  };
}

/**
 * Runs computeVerdict() (always) and, when GEMINI_API_KEY is configured,
 * asks Gemini to rewrite only the `summary` field into a clearer,
 * plain-language explanation — strictly constrained to the verdict and
 * evidence computeVerdict() already produced. Never changes the verdict,
 * evidenceStrength, or any evidence list. Falls back silently to the
 * rule-based summary on any error.
 * @returns {Promise<object>} same shape as computeVerdict()
 */
async function computeVerdictSmart(claim, sources, options = {}) {
  const result = computeVerdict(claim, sources, options);

  if (!llm.isConfigured() || claim.type !== 'FACTUAL') return result;

  try {
    const prompt = `You are writing the plain-language explanation for a fact-checking tool. You must NOT change the verdict below or introduce any new facts — only explain, in 2-3 neutral sentences, why this verdict follows from this evidence.

Claim: "${claim.text}"
Verdict (fixed, do not change): ${result.verdict}
Evidence strength (fixed, do not change): ${result.evidenceStrength}
Supporting sources: ${result.supportingEvidence.map((s) => s.excerpt).join(' | ') || 'none'}
Contradicting sources: ${result.contradictingEvidence.map((s) => s.excerpt).join(' | ') || 'none'}
Context sources: ${result.contextEvidence.map((s) => s.excerpt).join(' | ') || 'none'}

Respond with ONLY a JSON object: {"summary": "your 2-3 sentence neutral explanation"}`;
    const { text } = await llm.callGemini({ prompt, json: true });
    const parsed = llm.extractJson(text);
    if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
      result.summary = parsed.summary.trim();
      result.auditTrail = [...result.auditTrail, 'Explanation rewritten by Gemini for clarity (verdict unchanged).'];
    }
  } catch (err) {
    console.error('[verdictEngine] Gemini summary enrichment failed, using rule-based summary:', err.message);
  }

  return result;
}

module.exports = { computeVerdict, computeVerdictSmart, VERDICTS, rankSource };
