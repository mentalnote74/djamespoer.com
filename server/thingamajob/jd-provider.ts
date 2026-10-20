import { evaluationInstructions, evaluationSchema, EvaluationUnavailable } from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';
export interface JdReasoner {
  evaluate(jd: string, truths: EvaluationTruth[]): Promise<unknown>;
}
const observations = new WeakMap<object, Record<string, string | number | null>>();
export function providerMetadata(value: unknown) {
  return value && typeof value === 'object' ? (observations.get(value) ?? {}) : {};
}
// Reuses the existing Responses API approach. Provider config never comes from a request.
export function openAiReasoner(
  key: string,
  model: string,
  transport: typeof fetch = fetch,
): JdReasoner {
  return {
    async evaluate(jd, truths) {
      // Request-local refs avoid copying UUIDs through model output. The provider
      // schema constrains the complete choice set; only the server maps to truth IDs.
      const references = new Map(truths.map((t, i) => ['t' + (i + 1), t.truthId]));
      const sourceLines = jd
        .split('\n')
        .filter((line) => line.trim())
        .map((text, i) => ({ id: 'j' + (i + 1), text }));
      const passages = new Map(sourceLines.map((line) => [line.id, line.text]));
      const schema = structuredClone(evaluationSchema);
      schema.properties.requirements.items.properties.evidence.items.properties.truthId =
        Object.assign(
          {},
          schema.properties.requirements.items.properties.evidence.items.properties.truthId,
          { enum: [...references.keys()] },
        );
      schema.properties.requirements.items.properties.jdQuote = Object.assign(
        {},
        schema.properties.requirements.items.properties.jdQuote,
        { enum: [...passages.keys()] },
      );
      Reflect.deleteProperty(
        schema.properties.requirements.items.properties.evidence.items.properties,
        'quote',
      );
      schema.properties.requirements.items.properties.evidence.items.required = [
        'truthId',
        'relation',
      ];
      const response = await transport('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({
          model,
          instructions:
            evaluationInstructions +
            '\nTransport binding: jobDescription is supplied as sourceLines. In jdQuote, select the jN source-line reference that contains the criterion. In evidence, select a tN truth reference and relation; do not reproduce a quote. The server resolves the chosen source line and canonical statement verbatim. These reference fields are constrained by the schema. Keep all substantive evaluation rules above.',
          input: JSON.stringify({
            jobDescription: { sourceLines },
            canonicalTruths: truths.map((t, i) => ({ ...t, truthId: 't' + (i + 1) })),
          }),
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 12000,
          text: {
            format: {
              type: 'json_schema',
              name: 'canonical_jd_evaluation',
              strict: true,
              schema,
            },
          },
        }),
      });
      const requestId = response.headers.get('x-request-id')?.slice(0, 100) ?? null;
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as {
          error?: { code?: unknown };
        } | null;
        const code = failure?.error?.code;
        throw new EvaluationUnavailable('provider_http', {
          httpStatus: response.status,
          requestId,
          providerCode: typeof code === 'string' && /^[a-z0-9_-]{1,80}$/i.test(code) ? code : null,
        });
      }
      const body = (await response.json()) as {
        status?: string;
        model?: string;
        incomplete_details?: { reason?: string };
        usage?: { input_tokens?: number; output_tokens?: number };
        output?: { type: string; content?: { type: string; text?: string }[] }[];
      };
      if (body.status !== 'completed' || body.model !== model)
        throw new EvaluationUnavailable('provider_incomplete', {
          httpStatus: response.status,
          requestId,
          status: body.status ?? 'missing',
          reason: body.incomplete_details?.reason ?? null,
          outputTokens: body.usage?.output_tokens ?? 0,
        });
      const text = (body.output ?? [])
        .filter((o) => o.type === 'message')
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === 'output_text')
        .map((c) => c.text ?? '')
        .join('');
      try {
        const parsed = JSON.parse(text) as {
          requirements?: { jdQuote: string; evidence?: { truthId: string; quote?: string }[] }[];
        };
        for (const r of parsed.requirements ?? []) {
          const passage = passages.get(r.jdQuote);
          if (!passage) throw new EvaluationUnavailable('jd_reference', { requestId });
          r.jdQuote = passage;
          for (const e of r.evidence ?? []) {
            const id = references.get(e.truthId);
            if (!id) throw new EvaluationUnavailable('citation_reference', { requestId });
            e.truthId = id;
            e.quote = truths.find((t) => t.truthId === id)!.statement;
          }
        }
        observations.set(parsed, {
          requestId,
          httpStatus: response.status,
          inputTokens: body.usage?.input_tokens ?? 0,
          outputTokens: body.usage?.output_tokens ?? 0,
        });
        return parsed;
      } catch (error) {
        if (error instanceof EvaluationUnavailable) throw error;
        throw new EvaluationUnavailable('provider_output', { requestId });
      }
    },
  };
}
