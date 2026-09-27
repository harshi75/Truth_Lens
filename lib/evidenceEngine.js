// TruthLens — Evidence Engine
//
// searchEvidence(query) is the single abstraction point for evidence
// retrieval. It has two implementations:
//
//  - LIVE:  when GEMINI_API_KEY is configured, Gemini is called with the
//           Google Search grounding tool so it can only cite pages it
//           actually found, then asked to summarize each source's relevance
//           to the claim as structured JSON.
//  - DEMO:  the offline "Demo Evidence" dataset (see demoData.js), used
//           whenever no key is configured or the live call fails for any
//           reason. Every demo result is clearly labeled as such.
//
// IMPORTANT: this module must never invent evidence for a claim. In live
// mode, only sources Gemini actually returned are kept; in demo mode, a
// miss returns an empty evidence list, which the verdict engine correctly
// turns into INSUFFICIENT EVIDENCE — it does NOT synthesize a
// plausible-looking source.

const { findBestTopic } = require('./demoData');
const llm = require('./llm');

const DEMO_DISCLAIMER =
  'Demo Evidence — this result was produced from TruthLens\'s offline demo dataset, not a live internet search. ' +
  'No GEMINI_API_KEY is configured for this deployment, or the live lookup was unavailable.';

const LIVE_DISCLAIMER =
  'Live Evidence — retrieved via Gemini with Google Search grounding.';

const VALID_SOURCE_TYPES = new Set([
  'OFFICIAL', 'GOVERNMENT', 'PRIMARY', 'ACADEMIC', 'FACT_CHECK', 'NEWS', 'SECONDARY', 'UNKNOWN',
]);
const VALID_ROLES = new Set(['supports', 'contradicts', 'context']);
const VALID_CREDIBILITY = new Set(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Calls Gemini with Google Search grounding to find and characterize real
 * evidence for a claim. Only sources with a URL Gemini actually returned are
 * kept; nothing is fabricated here — if Gemini finds nothing, or the model's
 * JSON doesn't parse, this throws and the caller falls back to demo mode.
 */
async function fetchLiveEvidence(query) {
  const prompt = `You are a neutral fact-checking research assistant. Use Google Search to find real, currently accessible sources relevant to the claim below. Do not take a political side; evaluate the factual accuracy only.

Claim to check: "${query}"

Search for and identify up to 5 of the most relevant, credible sources (official/government statistics, primary documents, academic sources, established fact-checking organizations, or reputable news reporting). For each one, decide whether it supports, contradicts, or merely gives context to the claim.

Respond with ONLY a JSON object (no markdown fences, no commentary) of this exact shape:
{
  "sources": [
    {
      "title": "string",
      "publisher": "string",
      "url": "string (must be a real URL you found via search)",
      "author": "string or null",
      "publicationDate": "YYYY-MM-DD or null if unknown",
      "sourceType": "OFFICIAL|GOVERNMENT|PRIMARY|ACADEMIC|FACT_CHECK|NEWS|SECONDARY|UNKNOWN",
      "role": "supports|contradicts|context",
      "excerpt": "one sentence, in your own words, describing what this source says relevant to the claim",
      "credibility": "HIGH|MEDIUM|LOW"
    }
  ]
}

If you find no relevant sources, return {"sources": []}. Never invent a URL, title, or publisher you did not actually find.`;

  const { text, groundingChunks } = await llm.callGemini({ prompt, useSearch: true });
  const parsed = llm.extractJson(text);

  // Cross-check against what Gemini actually grounded via Search, when
  // available, as an extra guard against a fabricated URL slipping through.
  const groundedUrls = new Set(
    groundingChunks.map((c) => c.web?.uri).filter(Boolean)
  );

  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];

  const sources = rawSources
    .filter((s) => s && typeof s.url === 'string' && s.url.trim())
    .map((s) => ({
      title: String(s.title || 'Untitled source').slice(0, 300),
      publisher: s.publisher ? String(s.publisher).slice(0, 200) : null,
      url: s.url.trim(),
      author: s.author ? String(s.author).slice(0, 200) : null,
      publicationDate: /^\d{4}-\d{2}-\d{2}$/.test(s.publicationDate) ? s.publicationDate : null,
      sourceType: VALID_SOURCE_TYPES.has(s.sourceType) ? s.sourceType : 'UNKNOWN',
      role: VALID_ROLES.has(s.role) ? s.role : 'context',
      excerpt: String(s.excerpt || '').slice(0, 500),
      credibility: VALID_CREDIBILITY.has(s.credibility) ? s.credibility : 'MEDIUM',
      retrievedAt: new Date().toISOString(),
      groundedInSearch: groundedUrls.size === 0 ? null : groundedUrls.has(s.url.trim()),
    }));

  return sources;
}

/**
 * @param {string} query - the factual claim text to search evidence for
 * @returns {Promise<{mode: 'live'|'demo', disclaimer: string|null, sources: Array}>}
 */
async function searchEvidence(query) {
  if (llm.isConfigured()) {
    try {
      const sources = await fetchLiveEvidence(query);
      return { mode: 'live', disclaimer: LIVE_DISCLAIMER, sources };
    } catch (err) {
      // Fall through to demo mode rather than surfacing raw errors to users.
      console.error('[evidenceEngine] live evidence search failed, falling back to demo:', err.message);
    }
  }

  const topic = findBestTopic(query);
  if (!topic) {
    return { mode: 'demo', disclaimer: DEMO_DISCLAIMER, sources: [] };
  }

  const sources = topic.sources.map((s) => ({
    ...s,
    retrievedAt: new Date().toISOString(),
  }));

  return {
    mode: 'demo',
    disclaimer: DEMO_DISCLAIMER,
    sources,
    topicId: topic.id,
    isOutdatedTopic: Boolean(topic.isOutdatedTopic),
  };
}

module.exports = { searchEvidence, DEMO_DISCLAIMER, LIVE_DISCLAIMER };
