import { evaluationInstructions, evaluationSchema, EvaluationUnavailable } from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';
export interface JdReasoner {
  evaluate(jd: string, truths: EvaluationTruth[]): Promise<unknown>;
}
// Reuses the existing Responses API approach. Provider config never comes from a request.
export function openAiReasoner(
  key: string,
  model: string,
  transport: typeof fetch = fetch,
): JdReasoner {
  return {
    async evaluate(jd, truths) {
      const response = await transport('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({
          model,
          instructions: evaluationInstructions,
          input: JSON.stringify({ jobDescription: jd, canonicalTruths: truths }),
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 12000,
          text: {
            format: {
              type: 'json_schema',
              name: 'canonical_jd_evaluation',
              strict: true,
              schema: evaluationSchema,
            },
          },
        }),
      });
      if (!response.ok) throw new EvaluationUnavailable();
      const body = (await response.json()) as {
        status?: string;
        model?: string;
        output?: { type: string; content?: { type: string; text?: string }[] }[];
      };
      if (body.status !== 'completed' || body.model !== model) throw new EvaluationUnavailable();
      const text = (body.output ?? [])
        .filter((o) => o.type === 'message')
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === 'output_text')
        .map((c) => c.text ?? '')
        .join('');
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new EvaluationUnavailable();
      }
    },
  };
}
