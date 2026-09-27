// TruthLens — Gemini client
//
// Thin wrapper around Google's Generative Language API (Gemini). Every
// caller in this project treats Gemini as OPTIONAL: if GEMINI_API_KEY is not
// set, or any call to Gemini fails, callers must fall back to the
// deterministic rule-based logic that already exists (see claimExtraction.js,
// evidenceEngine.js, verdictEngine.js). This file never decides that
// fallback itself — it only throws, and callers catch it.

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {boolean} [opts.useSearch] - attach the Google Search grounding tool
 * @param {boolean} [opts.json] - ask for a bare JSON response (no ```fences)
 * @param {number} [opts.timeoutMs]
 */
async function callGemini({ prompt, useSearch = false, json = false, timeoutMs = 15000 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  // Google's API does not allow response_mime_type together with tools, so
  // JSON mode and search-grounding mode are mutually exclusive per call.
  if (useSearch) {
    body.tools = [{ google_search: {} }];
  } else if (json) {
    body.generationConfig = { responseMimeType: 'application/json' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) throw new Error('Gemini returned no candidates');

  const text = (candidate.content?.parts || []).map((p) => p.text || '').join('\n');
  const groundingChunks = candidate.groundingMetadata?.groundingChunks || [];

  return { text, groundingChunks };
}

/** Pulls the first {...} JSON object out of a model response, tolerating
 * stray prose or ```json fences around it. */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in Gemini response');
  return JSON.parse(match[0]);
}

module.exports = { isConfigured, callGemini, extractJson, MODEL };
