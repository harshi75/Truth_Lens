// TruthLens — Claim Extraction & Classification
//
// Rule-based (no external LLM required) sentence segmentation and
// classification into FACTUAL / OPINION / PREDICTION / SUBJECTIVE. This
// keeps the hackathon MVP fully functional offline and deterministic even
// with no API key configured.
//
// When GEMINI_API_KEY is set, classifyClaimTypeSmart()/extractClaimsSmart()
// additionally ask Gemini to double-check the classification (it's often
// better than regex markers at catching sarcasm, indirect opinions, etc.).
// The rule-based classifier is always the fallback — a failed or malformed
// Gemini call never breaks classification, it just silently falls back.

const llm = require('./llm');

const OPINION_MARKERS = [
  /\bi (think|believe|feel)\b/i,
  /\bin my opinion\b/i,
  /\bshould\b/i,
  /\bought to\b/i,
  /\bbest\b/i,
  /\bworst\b/i,
];

const SUBJECTIVE_MARKERS = [
  /\bbeautiful\b/i,
  /\bugly\b/i,
  /\bamazing\b/i,
  /\bterrible\b/i,
  /\bwonderful\b/i,
  /\bdisgusting\b/i,
  /\bexciting\b/i,
];

const PREDICTION_MARKERS = [
  /\bwill\b/i,
  /\bgoing to\b/i,
  /\bexpected to\b/i,
  /\bby (20\d\d|next (year|month|week))\b/i,
  /\bforecast(s|ed)?\b/i,
  /\bprojected to\b/i,
];

const FACTUAL_HINTS = [
  /\d/, // any digit — numbers, dates, percentages, statistics
  /%/,
  /\b(confirmed|announced|launched|approved|reported|stated|died|born|founded|passed|signed|elected|won|lost)\b/i,
];

function splitIntoSentences(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  // Simple sentence splitter: split on ., !, ? followed by a space/end,
  // but avoid splitting on common abbreviations / decimals.
  const raw = normalized
    .replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  return raw;
}

function classifyClaimType(sentence) {
  if (PREDICTION_MARKERS.some((re) => re.test(sentence))) return 'PREDICTION';
  if (OPINION_MARKERS.some((re) => re.test(sentence))) return 'OPINION';
  if (SUBJECTIVE_MARKERS.some((re) => re.test(sentence))) return 'SUBJECTIVE';
  if (FACTUAL_HINTS.some((re) => re.test(sentence))) return 'FACTUAL';
  // Default: short declarative sentences with a clear subject/verb are
  // treated as factual claims unless they tripped an opinion/subjective
  // marker above — most everyday claims (e.g. "The bridge reopened Monday")
  // carry no digits but are still checkable factual statements.
  return 'FACTUAL';
}

/**
 * Extract one or more discrete claims from free text (a single claim, a
 * pasted paragraph, or a full article).
 * @returns {Array<{text: string, type: string}>}
 */
function extractClaims(text) {
  const sentences = splitIntoSentences(text);
  return sentences
    .filter((s) => s.length >= 8) // drop stray fragments
    .map((s) => ({ text: s, type: classifyClaimType(s) }));
}

const VALID_TYPES = new Set(['FACTUAL', 'OPINION', 'PREDICTION', 'SUBJECTIVE']);

/**
 * Rule-based classification, optionally double-checked by Gemini. Always
 * resolves to a valid type — any Gemini failure falls back to the
 * rule-based result rather than rejecting.
 * @returns {Promise<string>}
 */
async function classifyClaimTypeSmart(sentence) {
  const ruleBased = classifyClaimType(sentence);
  if (!llm.isConfigured()) return ruleBased;

  try {
    const prompt = `Classify the following statement into exactly one category: FACTUAL (a checkable claim about the world), OPINION (a value judgement or recommendation), PREDICTION (a claim about the future), or SUBJECTIVE (a matter of taste/aesthetics).

Statement: "${sentence}"

Respond with ONLY a JSON object: {"type": "FACTUAL" | "OPINION" | "PREDICTION" | "SUBJECTIVE"}`;
    const { text } = await llm.callGemini({ prompt, json: true });
    const parsed = llm.extractJson(text);
    return VALID_TYPES.has(parsed.type) ? parsed.type : ruleBased;
  } catch (err) {
    console.error('[claimExtraction] Gemini classification failed, using rule-based result:', err.message);
    return ruleBased;
  }
}

/**
 * Same as extractClaims, but classifies each sentence with
 * classifyClaimTypeSmart (Gemini-assisted when configured).
 * @returns {Promise<Array<{text: string, type: string}>>}
 */
async function extractClaimsSmart(text) {
  const sentences = splitIntoSentences(text).filter((s) => s.length >= 8);
  return Promise.all(
    sentences.map(async (s) => ({ text: s, type: await classifyClaimTypeSmart(s) }))
  );
}

module.exports = {
  extractClaims,
  classifyClaimType,
  splitIntoSentences,
  classifyClaimTypeSmart,
  extractClaimsSmart,
};
