// TruthLens — Demo Evidence Dataset
//
// This file is the ONLY place fabricated-looking source data lives, and it is
// used exclusively as a clearly-labeled offline fallback ("Demo Evidence")
// for the hackathon demo when no live search API key is configured. It is
// NEVER presented to the user as live internet evidence — every caller must
// pass through evidenceEngine.js, which stamps every result with
// `datasetType: "demo"` and a disclaimer string.
//
// Each topic is matched against the incoming claim by keyword overlap
// (see evidenceEngine.js). Each source has a fixed, non-fabricated-feeling
// but clearly synthetic shape: title, publisher, url, author, a publication
// date, a source type, a role (supports/contradicts/context), a short
// excerpt, and a credibility indicator.

const TOPICS = [
  {
    id: 'india-literacy-rate',
    // "core" keywords must be specific enough that matching one means the
    // claim is actually about this topic. Generic terms (a bare country
    // name, etc.) go in "bonus" — they can raise the score once a core
    // keyword has already matched, but can never trigger a match alone.
    coreKeywords: ['literacy', 'literacy rate', 'literate'],
    bonusKeywords: ['india'],
    claimDate: '2023',
    sources: [
      {
        title: 'National Statistical Office — Periodic Labour Force Survey, Literacy Estimates',
        publisher: 'Ministry of Statistics and Programme Implementation (India)',
        url: 'https://www.mospi.gov.in/publication/periodic-labour-force-survey',
        author: null,
        publicationDate: '2023-08-01',
        sourceType: 'GOVERNMENT',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Survey-based estimates place national literacy in the mid-to-high 70s percent range, not 95%.',
      },
      {
        title: 'Census of India — Literacy and Levels of Education',
        publisher: 'Office of the Registrar General & Census Commissioner, India',
        url: 'https://censusindia.gov.in/census.website/data/census-tables',
        author: null,
        publicationDate: '2011-05-01',
        sourceType: 'OFFICIAL',
        role: 'context',
        credibility: 'HIGH',
        excerpt: 'The most recent full Census recorded a national literacy rate below 75%; a newer Census has not yet been conducted.',
      },
      {
        title: 'UNESCO Institute for Statistics — India Country Profile',
        publisher: 'UNESCO',
        url: 'https://uis.unesco.org/en/country/in',
        author: null,
        publicationDate: '2022-09-01',
        sourceType: 'ACADEMIC',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'International estimates corroborate a literacy rate well under 95%, broadly consistent with domestic survey data.',
      },
    ],
  },
  {
    id: 'alzheimers-cure',
    coreKeywords: ['alzheimer', "alzheimer's", 'dementia'],
    bonusKeywords: ['cure', 'cures alzheimer'],
    claimDate: null,
    sources: [
      {
        title: "Alzheimer's Association — Medications for Memory, Cognition and Dementia-Related Behaviors",
        publisher: "Alzheimer's Association",
        url: 'https://www.alz.org/alzheimers-dementia/treatments',
        author: null,
        publicationDate: '2024-01-15',
        sourceType: 'ACADEMIC',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Approved treatments may slow progression or ease symptoms in some patients; none is described as a complete cure.',
      },
      {
        title: 'World Health Organization — Dementia Fact Sheet',
        publisher: 'World Health Organization',
        url: 'https://www.who.int/news-room/fact-sheets/detail/dementia',
        author: null,
        publicationDate: '2023-03-15',
        sourceType: 'OFFICIAL',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'There is currently no treatment that cures dementia or reverses its progressive course.',
      },
      {
        title: 'Peer-reviewed clinical trial results on an amyloid-targeting antibody therapy',
        publisher: 'Journal of Clinical Trials (illustrative demo citation)',
        url: 'https://example-journal.demo/amyloid-trial-results',
        author: 'Demo Research Consortium',
        publicationDate: '2023-11-01',
        sourceType: 'PRIMARY',
        role: 'context',
        credibility: 'MEDIUM',
        excerpt: 'Trial results show a modest slowing of cognitive decline versus placebo, not disease reversal or cure.',
      },
    ],
  },
  {
    id: 'india-satellite-launch',
    coreKeywords: ['satellite', 'isro'],
    bonusKeywords: ['launched', 'crore', 'internet access'],
    claimDate: null,
    sources: [
      {
        title: 'ISRO Press Release — Launch Mission Update',
        publisher: 'Indian Space Research Organisation',
        url: 'https://www.isro.gov.in/press-releases',
        author: null,
        publicationDate: '2024-02-10',
        sourceType: 'PRIMARY',
        role: 'supports',
        credibility: 'HIGH',
        excerpt: 'Confirms the satellite launch and that it is intended to extend internet access to underserved regions, corroborating the core of the claim.',
      },
      {
        title: 'Government budget briefing on space-mission expenditure',
        publisher: 'Demo Finance Ministry Briefing',
        url: 'https://example-finance.demo/space-budget-briefing',
        author: null,
        publicationDate: '2024-02-09',
        sourceType: 'GOVERNMENT',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Lists the mission\'s approved budget at a figure noticeably lower than the ₹500 crore stated in the claim.',
      },
      {
        title: 'Wire service report on satellite mission cost and objectives',
        publisher: 'Demo Newswire',
        url: 'https://example-news.demo/satellite-mission-cost',
        author: 'Staff Reporter',
        publicationDate: '2024-02-11',
        sourceType: 'NEWS',
        role: 'context',
        credibility: 'MEDIUM',
        excerpt: 'Notes that the 10-million-user figure originates from a company estimate rather than an independently verified count.',
      },
    ],
  },
  {
    id: 'city-council-transit-budget',
    coreKeywords: ['transit budget', 'city council'],
    bonusKeywords: ['public hearing', 'approved'],
    claimDate: null,
    sources: [
      {
        title: 'City Council Meeting Minutes — Transit Budget Vote',
        publisher: 'City Clerk\'s Office (demo municipality)',
        url: 'https://example-city.demo/council/minutes',
        author: null,
        publicationDate: '2024-05-14',
        sourceType: 'OFFICIAL',
        role: 'supports',
        credibility: 'HIGH',
        excerpt: 'Minutes confirm the transit budget was approved by council vote following a scheduled public hearing.',
      },
      {
        title: 'Local news coverage of the council vote',
        publisher: 'Demo Local Times',
        url: 'https://example-local.demo/transit-budget-approved',
        author: 'City Desk',
        publicationDate: '2024-05-15',
        sourceType: 'NEWS',
        role: 'supports',
        credibility: 'MEDIUM',
        excerpt: 'Independently reports the same vote outcome and date as the official minutes.',
      },
    ],
  },
  {
    id: 'flat-earth',
    coreKeywords: ['flat earth', 'earth is flat'],
    bonusKeywords: [],
    claimDate: null,
    sources: [
      {
        title: 'NASA — Earth Observatory overview',
        publisher: 'NASA',
        url: 'https://earthobservatory.nasa.gov/',
        author: null,
        publicationDate: '2022-06-01',
        sourceType: 'GOVERNMENT',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Satellite imagery and centuries of geodetic measurement consistently show Earth as an oblate spheroid.',
      },
      {
        title: 'Peer-reviewed geodesy overview of planetary shape measurement',
        publisher: 'Demo Geophysics Review',
        url: 'https://example-journal.demo/geodesy-overview',
        author: 'Demo Research Consortium',
        publicationDate: '2021-01-01',
        sourceType: 'ACADEMIC',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Independent geodetic and gravimetric measurements converge on the same oblate-spheroid shape.',
      },
    ],
  },
  {
    id: 'covid-vaccine-approval-2020',
    coreKeywords: ['covid vaccine', 'covid-19 vaccine', 'coronavirus vaccine'],
    bonusKeywords: ['vaccine', 'covid', 'not approved', 'no vaccine', 'trial'],
    claimDate: '2020',
    isOutdatedTopic: true,
    sources: [
      {
        title: 'Regulatory authorization records for COVID-19 vaccines',
        publisher: 'Demo Health Regulatory Archive',
        url: 'https://example-health.demo/vaccine-authorizations',
        author: null,
        publicationDate: '2020-11-01',
        sourceType: 'GOVERNMENT',
        role: 'supports',
        credibility: 'HIGH',
        excerpt: 'As of late 2020, no COVID-19 vaccine had yet received full regulatory authorization; several were still in late-stage trials.',
      },
      {
        title: 'Subsequent regulatory authorization announcement',
        publisher: 'Demo Health Regulatory Archive',
        url: 'https://example-health.demo/vaccine-authorizations-update',
        author: null,
        publicationDate: '2021-01-01',
        sourceType: 'GOVERNMENT',
        role: 'contradicts',
        credibility: 'HIGH',
        excerpt: 'Multiple COVID-19 vaccines subsequently received emergency or full authorization beginning in December 2020, superseding the earlier state of affairs.',
      },
    ],
  },
];

// A topic only ever matches if at least one CORE (topic-specific) keyword is
// present — bonus keywords (often a bare country/product name) can add to
// the score but can never cause a match on their own. This is what stops a
// claim like "there are women in india" from pulling in literacy-rate
// evidence just because it contains the word "india".
function scoreTopic(topic, queryLower) {
  const core = topic.coreKeywords || topic.keywords || [];
  const bonus = topic.bonusKeywords || [];

  const coreHit = core.some((kw) => queryLower.includes(kw));
  if (!coreHit) return 0;

  let score = 0;
  for (const kw of core) if (queryLower.includes(kw)) score += kw.split(' ').length;
  for (const kw of bonus) if (queryLower.includes(kw)) score += kw.split(' ').length;
  return score;
}

function findBestTopic(query) {
  const queryLower = query.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const score = scoreTopic(topic, queryLower);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

// The 5 curated claims used for "Explore Demo" — one per verdict type.
const DEMO_CLAIMS = [
  { text: "India's literacy rate is 95%.", expectedVerdict: 'CONTRADICTED' },
  { text: 'Scientists have confirmed that a new treatment completely cures Alzheimer\'s disease.', expectedVerdict: 'CONTRADICTED' },
  { text: 'City council approved the new transit budget on Tuesday after a public hearing.', expectedVerdict: 'SUPPORTED' },
  { text: "India's newly launched satellite provided internet access to 10 million people at a cost of ₹500 crore.", expectedVerdict: 'MIXED' },
  { text: 'No COVID-19 vaccine has been approved for use anywhere in the world.', expectedVerdict: 'OUTDATED' },
  { text: 'A rare triple rainbow was photographed over Lagos this week.', expectedVerdict: 'INSUFFICIENT_EVIDENCE' },
];

module.exports = { TOPICS, findBestTopic, DEMO_CLAIMS };
