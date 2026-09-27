// TruthLens — Report Generator
//
// Renders a self-contained, printable HTML report for a verification. The
// browser's native "Print > Save as PDF" gives a clean PDF without adding a
// PDF-generation dependency to this hackathon MVP (see README > Limitations
// for the future-improvement note about generating PDF server-side).

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sourceListHtml(sources, label) {
  if (!sources || sources.length === 0) return `<p class="muted">None identified.</p>`;
  return `<ul class="source-list">${sources
    .map(
      (s) => `<li>
        <strong>${esc(s.title)}</strong><br/>
        <span class="muted">${esc(s.publisher || 'Unknown publisher')} · ${esc(s.sourceType)} · ${esc(s.publicationDate || 'date unknown')}</span><br/>
        <span>${esc(s.excerpt || '')}</span><br/>
        ${s.url ? `<a href="${esc(s.url)}">${esc(s.url)}</a>` : ''}
      </li>`
    )
    .join('')}</ul>`;
}

function renderReportHtml(v) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>TruthLens Verification Report</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 760px; margin: 40px auto; color: #1a1f2b; line-height: 1.5; padding: 0 20px; }
  h1 { font-size: 22px; border-bottom: 3px solid #0f2440; padding-bottom: 10px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #0f2440; margin-top: 28px; }
  .verdict-badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-weight: bold; font-size: 13px; color: #fff; }
  .muted { color: #666; font-size: 13px; }
  .source-list { list-style: none; padding: 0; }
  .source-list li { margin-bottom: 14px; padding-left: 12px; border-left: 3px solid #ddd; }
  .disclaimer { margin-top: 36px; padding: 14px; background: #f4f4f4; border-radius: 6px; font-size: 13px; color: #444; }
  ul.plain li { margin-bottom: 6px; }
  @media print { a { color: inherit; text-decoration: none; } }
</style>
</head>
<body>
  <h1>TruthLens Verification Report</h1>

  <h2>Claim</h2>
  <p>${esc(v.claim)}</p>

  <h2>Verdict</h2>
  <p><span class="verdict-badge" style="background:${verdictColor(v.verdict)}">${esc(v.verdict.replace(/_/g, ' '))}</span></p>

  <h2>Evidence strength</h2>
  <p>${esc(v.evidenceStrength || 'N/A')}</p>

  <h2>Summary</h2>
  <p>${esc(v.summary)}</p>

  <h2>What we know</h2>
  ${v.whatWeKnow.length ? `<ul class="plain">${v.whatWeKnow.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">Nothing established.</p>'}

  <h2>What we don't know</h2>
  ${v.whatWeDontKnow.length ? `<ul class="plain">${v.whatWeDontKnow.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">No open questions noted.</p>'}

  <h2>Supporting sources</h2>
  ${sourceListHtml(v.supportingEvidence)}

  <h2>Contradicting sources</h2>
  ${sourceListHtml(v.contradictingEvidence)}

  <h2>Context sources</h2>
  ${sourceListHtml(v.contextEvidence)}

  <h2>Verification timestamp</h2>
  <p>${esc(v.createdAt)}</p>

  <div class="disclaimer">
    <strong>TruthLens disclaimer:</strong> This result reflects the evidence available to TruthLens at the time of
    verification. It is not a guarantee of absolute truth.
    ${v.datasetType === 'demo' ? `<br/><br/><strong>Note:</strong> ${esc(v.datasetDisclaimer || 'This result used TruthLens\'s offline demo evidence dataset, not a live internet search.')}` : ''}
  </div>

  <script>window.onload = () => { if (location.hash === '#print') window.print(); };</script>
</body>
</html>`;
}

function verdictColor(verdict) {
  switch (verdict) {
    case 'SUPPORTED':
      return '#1f9d55';
    case 'CONTRADICTED':
      return '#d64545';
    case 'MIXED':
      return '#d99a1b';
    case 'OUTDATED':
      return '#d9701b';
    case 'INSUFFICIENT_EVIDENCE':
    default:
      return '#6b7280';
  }
}

module.exports = { renderReportHtml };
