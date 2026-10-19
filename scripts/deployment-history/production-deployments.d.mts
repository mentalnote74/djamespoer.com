export function createProductionDeploymentAcquisition(config: {
  accountId: string | undefined;
  getToken: () => string | undefined;
  fetcher?: typeof fetch;
}): () => Promise<unknown[]>;
