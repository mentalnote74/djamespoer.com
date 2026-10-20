import type { EvaluationTruth } from './jd-contract.ts';

export interface EvaluationContext {
  professionalInventory: 'complete' | 'unconfirmed';
  authority: string | null;
}
export interface CompletenessConfiguration {
  TEST_REFERENCE_WORKSPACE?: string;
  JD_COMPLETE_CORPUS_DIGEST?: string;
}
export const incompleteInventory: EvaluationContext = {
  professionalInventory: 'unconfirmed',
  authority: null,
};

/** Stable whole-consumer-snapshot digest: omission or changed qualification invalidates completeness. */
export async function canonicalInventoryDigest(truths: EvaluationTruth[]) {
  const canonical = [...truths]
    .sort((a, b) => a.truthId.localeCompare(b.truthId))
    .map((t) => ({
      truthId: t.truthId,
      statement: t.statement,
      state: t.state,
      qualifications: t.qualifications,
    }));
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical))),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Operator configuration only. Never accept completeness from JD/client/model input. */
export async function evaluationContext(
  workspaceId: string,
  truths: EvaluationTruth[],
  config: CompletenessConfiguration = {},
): Promise<EvaluationContext> {
  if (
    workspaceId === config.TEST_REFERENCE_WORKSPACE &&
    /^[a-f0-9]{64}$/.test(config.JD_COMPLETE_CORPUS_DIGEST ?? '') &&
    (await canonicalInventoryDigest(truths)) === config.JD_COMPLETE_CORPUS_DIGEST
  ) {
    return {
      professionalInventory: 'complete',
      authority: 'Owner-approved comprehensive professional career corpus',
    };
  }
  return { ...incompleteInventory };
}
