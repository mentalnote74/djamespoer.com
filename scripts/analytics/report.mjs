// Read-only GA Data API requests. No tracking or account configuration changes.
// node scripts/analytics/report.mjs START END [--historical-exclude-florida --historical-through=YYYY-MM-DD]
// Prints reproducible requests by default. Set GOOGLE_ANALYTICS_ACCESS_TOKEN to execute.
import { writeFile, mkdir } from 'node:fs/promises';
const [start, end, ...flags] = process.argv.slice(2);
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(start ?? '') ||
  !/^\d{4}-\d{2}-\d{2}$/.test(end ?? '') ||
  start > end
)
  throw Error('Supply ordered ISO start/end dates');
const exclude = flags.includes('--historical-exclude-florida');
const cutoff = flags.find((f) => f.startsWith('--historical-through='))?.split('=')[1];
if (exclude && (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff ?? '') || end > cutoff))
  throw Error(
    'Historical Florida exclusion requires a cutoff and an entirely historical date range',
  );
const filter = exclude
  ? {
      notExpression: {
        filter: {
          fieldName: 'region',
          stringFilter: { matchType: 'EXACT', value: 'Florida', caseSensitive: false },
        },
      },
    }
  : undefined;
const base = {
  dateRanges: [{ startDate: start, endDate: end }],
  ...(filter ? { dimensionFilter: filter } : {}),
  limit: 100000,
};
const reports = {
  arrival: {
    ...base,
    dimensions: [
      { name: 'date' },
      { name: 'sessionSourceMedium' },
      { name: 'sessionCampaignName' },
      { name: 'landingPage' },
      { name: 'deviceCategory' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
  },
  actions: {
    ...base,
    dimensions: [
      { name: 'date' },
      { name: 'sessionSourceMedium' },
      { name: 'sessionCampaignName' },
      { name: 'eventName' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'eventCount' }],
  },
  rigby: {
    ...base,
    dimensions: [
      { name: 'date' },
      { name: 'sessionSourceMedium' },
      { name: 'eventName' },
      { name: 'customEvent:action' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'eventCount' }],
  },
  evaluator: {
    ...base,
    dimensions: [
      { name: 'date' },
      { name: 'sessionSourceMedium' },
      { name: 'eventName' },
      { name: 'customEvent:input_method' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'eventCount' }],
  },
};
const receipt = {
  property: '557271056',
  dateRange: { start, end },
  historicalFloridaExcluded: exclude,
  historicalThrough: cutoff ?? null,
  requests: reports,
  results: {},
};
const token = process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN;
if (token) {
  for (const [name, body] of Object.entries(reports)) {
    const response = await fetch(
      'https://analyticsdata.googleapis.com/v1beta/properties/557271056:runReport',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      receipt.results[name] = {
        status: response.status,
        note: 'Report unavailable; inspect dimension registration/permissions without inferring zero activity.',
      };
      continue;
    }
    receipt.results[name] = await response.json();
  }
}
await mkdir('tmp/analytics-reports', { recursive: true });
await writeFile(
  `tmp/analytics-reports/${start}-${end}${exclude ? '-historical-no-florida' : ''}.json`,
  JSON.stringify(receipt, null, 2),
);
console.log(JSON.stringify(receipt, null, 2));
