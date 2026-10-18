export interface Metric {
  value: number | null;
  unit: string;
  reason: string | null;
}
export interface Point {
  date: string;
  value: number;
}
export interface Source {
  status: 'live' | 'snapshot' | 'stale' | 'unavailable';
  fetchedAt: string | null;
  message: string;
}
export interface BuildometerData {
  schemaVersion: 1;
  generatedAt: string;
  sources: { jira: Source; deployments: Source };
  metrics: {
    completion: Metric;
    done: Metric;
    remaining: Metric;
    velocity: Metric;
    throughput: Metric;
    deployments: Metric;
    scopeChange: Metric;
    burndown: Metric;
    bugHealth: Metric;
    bugCreated: Metric;
    bugEliminated: Metric;
    bugDuration: Metric;
    reopens: Metric;
    rework: Metric;
  };
  series: {
    burndown: Point[];
    velocity: Point[];
    throughput: Point[];
    deployments: Point[];
    scope: Point[];
    bugCreated: Point[];
    bugEliminated: Point[];
    bugOpen: Point[];
    bugLifecycle: Point[];
  };
  journal: {
    date: string;
    generatedDate: string;
    publishedDate: string;
    brief: {
      date: string;
      sections: { heading: string; paragraph?: string; items?: string[] }[];
      provenance: { sourceCommit: string; method: string };
    };
  }[];
  supportingFacts: {
    inventory: number | null;
    excludedSamples: number | null;
    historyComplete: boolean;
    pointCoverage: string;
    scope: string;
    bugPolicy: string;
    shippingCheckedAt: string | null;
  };
}
