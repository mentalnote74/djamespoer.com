import { DeploymentHistoryInput } from './deployment-history-data';

/** Illustrative development fixtures only. These are not actual portfolio pipeline attempts. */
export const SAMPLE_DEPLOYMENTS: readonly DeploymentHistoryInput[] = [
  {
    id: 'attempt-' + 'c'.repeat(64),
    summary: 'Sample: improve keyboard navigation',
    createdAt: '2026-10-05T14:30:00.000Z',
    revision: 'c'.repeat(7),
    environment: 'production',
    status: 'succeeded',
  },
  {
    id: 'attempt-' + 'b'.repeat(64),
    summary: 'Sample: check responsive table layout',
    createdAt: '2026-10-05T13:00:00.000Z',
    revision: 'b'.repeat(7),
    environment: 'preview',
    status: 'failed',
  },
  {
    id: 'attempt-' + 'a'.repeat(64),
    summary: 'Sample: prepare table presentation',
    createdAt: '2026-10-04T16:00:00.000Z',
    revision: 'a'.repeat(7),
    environment: 'preview',
    status: 'succeeded',
  },
];
