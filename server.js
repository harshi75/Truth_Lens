const express = require('express');
const path = require('path');

const { extractClaims, classifyClaimType, extractClaimsSmart, classifyClaimTypeSmart } = require('./lib/claimExtraction');
const { searchEvidence } = require('./lib/evidenceEngine');
const { computeVerdict, computeVerdictSmart } = require('./lib/verdictEngine');
const repo = require('./lib/repository');
const { DEMO_CLAIMS } = require('./lib/demoData');
const { renderReportHtml } = require('./lib/report');

const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TruthLens' });
});

// ---------------------------------------------------------------------------
// Claim extraction — split free text (a claim, a paragraph, or an article)
// into individually-checkable claims with a provisional type classification.
// Does not run verification and does not write to the database.
// ---------------------------------------------------------------------------
async function handleExtract(req, res) {
  const { text } = req.body || {};
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (text.length > 8000) {
    return res.status(400).json({ error: 'text is too long (max 8000 characters)' });
  }

  // extractClaimsSmart uses Gemini classification when GEMINI_API_KEY is
  // configured, and silently falls back to the rule-based classifier
  // per-sentence on any failure — so this never throws for that reason.
  const claims = await extractClaimsSmart(text.trim());
  if (claims.length === 0) {
    return res.status(400).json({ error: 'no checkable statement was found in the submitted text' });
  }

  res.json({ claims });
}

app.post('/api/claims/extract', handleExtract);
app.post('/api/claims/analyze', handleExtract);

// ---------------------------------------------------------------------------
// URL mode: fetch a page's visible text server-side, then run the same
// extraction as Article/Text. Best-effort HTML stripping — no headless
// browser, so JS-rendered pages may yield thin results.
// ---------------------------------------------------------------------------
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(p|br|div|li|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

app.post('/api/url/extract', async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ error: 'url is required' });
  }
  let parsed;
  try {
    parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
  } catch {
    return res.status(400).json({ error: 'please enter a valid http(s) URL' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'TruthLensBot/1.0 (+hackathon demo)' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(502).json({ error: `could not fetch that URL (server responded ${resp.status})` });
    }
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text')) {
      return res.status(422).json({ error: 'that URL did not return a readable text/HTML page' });
    }

    const html = await resp.text();
    const text = stripHtml(html).slice(0, 8000);
    if (text.trim().length < 20) {
      return res.status(422).json({ error: 'could not extract readable text from that page — try pasting the article text instead' });
    }

    const claims = await extractClaimsSmart(text);
    if (claims.length === 0) {
      return res.status(400).json({ error: 'no checkable statement was found on that page' });
    }
    const articleId = repo.saveArticle(text);
    res.json({ articleId, sourceUrl: parsed.toString(), claims });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'fetching that URL timed out' });
    }
    console.error(err);
    res.status(502).json({ error: 'could not fetch or read that URL' });
  }
});

// ---------------------------------------------------------------------------
// Verify a single claim end-to-end: classify -> search evidence -> verdict
// -> persist -> return the full result.
// ---------------------------------------------------------------------------
app.post('/api/verify', async (req, res) => {
  try {
    const { claim, articleId } = req.body || {};
    if (typeof claim !== 'string' || claim.trim().length === 0) {
      return res.status(400).json({ error: 'claim is required' });
    }
    if (claim.length > 2000) {
      return res.status(400).json({ error: 'claim is too long (max 2000 characters)' });
    }

    const claimText = claim.trim();
    const claimType = await classifyClaimTypeSmart(claimText);
    const savedClaim = repo.saveClaim({ text: claimText, type: claimType, articleId: articleId || null });

    let result;
    let dataset = { mode: 'demo', disclaimer: null };

    if (claimType !== 'FACTUAL') {
      result = await computeVerdictSmart({ text: claimText, type: claimType }, []);
    } else {
      let evidence;
      try {
        evidence = await searchEvidence(claimText);
      } catch (err) {
        return res.status(502).json({ error: 'evidence search is temporarily unavailable' });
      }
      dataset = { mode: evidence.mode, disclaimer: evidence.disclaimer };
      result = await computeVerdictSmart(
        { text: claimText, type: claimType },
        evidence.sources,
        { isOutdatedTopic: evidence.isOutdatedTopic }
      );
    }

    const verificationRow = repo.saveVerification(savedClaim.id, result, dataset);
    const full = repo.getVerificationById(verificationRow.id);
    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'something went wrong while verifying this claim' });
  }
});

// ---------------------------------------------------------------------------
// Submit a full article/paragraph: saves it, extracts claims, but leaves
// verification of each claim to individual /api/verify calls from the UI
// (so the user can choose which extracted claims to check).
// ---------------------------------------------------------------------------
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (![name, email, subject, message].every(v => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ error: 'name, email, subject and message are required' });
    }
    if (name.length > 100 || email.length > 200 || subject.length > 200 || message.length > 5000) {
      return res.status(400).json({ error: 'one or more fields are too long' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'please enter a valid email address' });
    }
    const saved = repo.saveContactMessage({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
    res.status(201).json({ ok: true, message: 'Your message was received.', id: saved.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'could not save contact message' });
  }
});

// ---------------------------------------------------------------------------
// Submit an article/paragraph.
// ---------------------------------------------------------------------------
app.post('/api/articles', (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }
  const claims = extractClaims(text.trim());
  if (claims.length === 0) {
    return res.status(400).json({ error: 'no checkable statement was found in the submitted text' });
  }
  const articleId = repo.saveArticle(text.trim());
  res.status(201).json({ articleId, claims });
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  res.json(repo.getStats());
});

app.get('/api/claims', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  res.json(repo.listRecentVerifications(limit));
});

app.get('/api/claims/:id', (req, res) => {
  const result = repo.getVerificationById(req.params.id);
  if (!result) return res.status(404).json({ error: 'verification not found' });
  res.json(result);
});

app.get('/api/claims/:id/report', (req, res) => {
  const result = repo.getVerificationById(req.params.id);
  if (!result) return res.status(404).json({ error: 'verification not found' });
  res.setHeader('Content-Type', 'text/html');
  res.send(renderReportHtml(result));
});

// ---------------------------------------------------------------------------
// Demo mode — curated claims spanning all five verdicts, for a reliable
// offline hackathon presentation.
// ---------------------------------------------------------------------------
app.get('/api/demo-claims', (req, res) => {
  res.json(DEMO_CLAIMS);
});

// ---------------------------------------------------------------------------
// Fallback error handler — never leak stack traces.
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TruthLens running on port ${PORT}`));
