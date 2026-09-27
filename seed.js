// Run `node seed.js` once after `npm install` to pre-populate the dashboard
// with a handful of verified demo claims, useful for screenshots and for
// making the dashboard non-empty the first time you open TruthLens.
const { classifyClaimType } = require('./lib/claimExtraction');
const { searchEvidence } = require('./lib/evidenceEngine');
const { computeVerdict } = require('./lib/verdictEngine');
const repo = require('./lib/repository');
const { DEMO_CLAIMS } = require('./lib/demoData');

async function run() {
  let count = 0;
  for (const { text } of DEMO_CLAIMS) {
    const type = classifyClaimType(text);
    const claim = repo.saveClaim({ text, type });

    let result;
    let dataset = { mode: 'demo', disclaimer: null };
    if (type !== 'FACTUAL') {
      result = computeVerdict({ text, type }, []);
    } else {
      const evidence = await searchEvidence(text);
      dataset = { mode: evidence.mode, disclaimer: evidence.disclaimer };
      result = computeVerdict({ text, type }, evidence.sources, { isOutdatedTopic: evidence.isOutdatedTopic });
    }

    repo.saveVerification(claim.id, result, dataset);
    count += 1;
  }
  console.log(`Seeded ${count} demo claims with full verification results.`);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
