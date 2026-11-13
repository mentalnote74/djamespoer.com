import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { EvaluationUnavailable } from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';
import { boundedBytes } from './evidence-validation.ts';

/** SCRUM-194: a JD-tailored résumé composed ONLY from canonical truths. The model selects,
 * orders and words; the server keeps only what canonical statements support. */
export const RESUME_POLICY = 'scrum-194-v1';

export const RESUME_CONTACT = {
  name: 'D. James Poer',
  line: 'djamespoer@djamespoer.com  |  djamespoer.com  |  linkedin.com/in/djamespoer',
};

export interface TailoredResume {
  headline: string;
  summary: string;
  skills: string[];
  roles: { employer: string; title: string; dates: string; bullets: string[] }[];
}

const refs = { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 };
export const resumeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'summary', 'summaryRefs', 'skills', 'roles'],
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    summaryRefs: refs,
    skills: { type: 'array', items: { type: 'string' }, maxItems: 24 },
    roles: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['employer', 'title', 'dates', 'headingRefs', 'bullets'],
        properties: {
          employer: { type: 'string' },
          title: { type: 'string' },
          dates: { type: 'string' },
          headingRefs: refs,
          bullets: {
            type: 'array',
            maxItems: 6,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'refs'],
              properties: { text: { type: 'string' }, refs: refs },
            },
          },
        },
      },
    },
  },
};

export const resumeInstructions = `You write a one-to-two page résumé for James that sells him for the supplied job description. Its purpose is to get James the interview.
Present James as a senior practitioner, never as a junior or a slouch. Lead with his judgment across the whole development process (problem, people, architecture, implementation, delivery, maintenance); treat specific frameworks and tools as supporting evidence, not his identity. Where the job names technology he has not used, the summary may draw on his documented record of learning new technology to a professional level.
Use ONLY the supplied canonical truths about James. Every fact must come from them. You may select, order, combine and reword truths in strong, concise résumé language that mirrors the job description's vocabulary where the truths support it.
Never invent employers, titles, dates, durations, metrics, numbers, technologies, credentials or outcomes. Copy employer names, job titles and date ranges exactly as written in the truths you cite in headingRefs. Any number in a bullet or summary must appear in a cited truth.
Order roles reverse-chronologically with current work first. Keep any documented career pause as its own dated entry exactly as the truths state it; never hide or invent gaps.
headline: a short professional title that fits the target role and is supported by the truths. summary: two or three sentences aimed at this role; cite its truths in summaryRefs.
skills: up to 24 skills, most relevant to the job first; use only skills named in the truths.
For each bullet, cite every truth it relies on in refs (tN references). Prefer accomplishments and concrete implementation over duties. Up to 6 bullets per role, most relevant first. Return only the strict schema.`;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const numbers = (s: string) => s.match(/\d+(?:[.,]\d+)?/g) ?? [];

/** Truth guard: drop anything the cited canonical statements do not literally support. */
export function validateResume(raw: unknown, truths: EvaluationTruth[]): TailoredResume {
  const value = raw as {
    headline?: unknown;
    summary?: unknown;
    summaryRefs?: unknown;
    skills?: unknown;
    roles?: unknown;
  };
  const byId = new Map(truths.map((t) => [t.truthId, t.statement]));
  const cited = (ids: unknown) =>
    Array.isArray(ids) ? ids.map((id) => byId.get(String(id))).filter((s): s is string => !!s) : [];
  const supported = (text: string, sources: string[]) => {
    if (!sources.length) return false;
    const available = new Set(numbers(sources.join(' ')));
    return numbers(text).every((n) => available.has(n));
  };
  const corpus = norm(truths.map((t) => t.statement).join(' '));
  const line = (v: unknown, max = 400) =>
    typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

  const summaryText = line(value.summary, 900);
  const summary = supported(summaryText, cited(value.summaryRefs)) ? summaryText : '';
  const skills = (Array.isArray(value.skills) ? value.skills : [])
    .map((s) => line(s, 60))
    .filter((s, i, all) => s && corpus.includes(norm(s)) && all.indexOf(s) === i);
  const roles = (Array.isArray(value.roles) ? value.roles : [])
    .map((r: Record<string, unknown>) => {
      const heading = norm(cited(r?.['headingRefs']).join(' '));
      const employer = line(r?.['employer'], 120);
      const title = line(r?.['title'], 120);
      const dates = line(r?.['dates'], 60);
      if (!heading || !employer || !heading.includes(norm(employer))) return null;
      const bullets = (Array.isArray(r['bullets']) ? r['bullets'] : [])
        .map((b: Record<string, unknown>) => {
          const text = line(b?.['text']);
          return text && supported(text, cited(b?.['refs'])) ? text : '';
        })
        .filter(Boolean);
      return {
        employer,
        title: title && heading.includes(norm(title)) ? title : '',
        dates: dates && heading.includes(norm(dates)) ? dates : '',
        bullets,
      };
    })
    .filter((r): r is TailoredResume['roles'][number] => !!r && r.bullets.length > 0);
  const headline = line(value.headline, 120);
  if (!roles.length) throw new EvaluationUnavailable('resume_unsupported');
  return { headline, summary, skills, roles };
}

/** One structured call through the existing Responses API pattern. */
export async function composeResume(
  key: string,
  model: string,
  jd: string,
  truths: EvaluationTruth[],
  audit: (metadata: Record<string, string | number | null>, body: unknown) => Promise<void>,
  transport: typeof fetch = fetch,
): Promise<unknown> {
  const references = new Map(truths.map((t, i) => ['t' + (i + 1), t.truthId]));
  const schema = structuredClone(resumeSchema) as typeof resumeSchema;
  const constrained = { type: 'array', items: { type: 'string', enum: [...references.keys()] }, minItems: 1, maxItems: 6 };
  Object.assign(schema.properties, { summaryRefs: constrained });
  Object.assign(schema.properties.roles.items.properties, { headingRefs: constrained });
  Object.assign(schema.properties.roles.items.properties.bullets.items.properties, { refs: constrained });
  const response = await transport('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(150000),
    body: JSON.stringify({
      model,
      instructions: resumeInstructions,
      input: JSON.stringify({
        jobDescription: jd,
        canonicalTruths: truths.map((t, i) => ({ ...t, truthId: 't' + (i + 1) })),
      }),
      store: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 12000,
      text: { format: { type: 'json_schema', name: 'tailored_resume', strict: true, schema } },
    }),
  });
  const requestId = response.headers.get('x-request-id')?.slice(0, 100) ?? null;
  if (!response.ok) {
    const metadata = { httpStatus: response.status, requestId, model };
    await audit(metadata, null);
    throw new EvaluationUnavailable('provider_http', metadata);
  }
  const body = JSON.parse(new TextDecoder().decode(await boundedBytes(response.body, 2_000_000))) as {
    status?: string;
    model?: string;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  const metadata = {
    requestId,
    model: body.model ?? model,
    status: body.status ?? 'missing',
    inputTokens: body.usage?.input_tokens ?? null,
    outputTokens: body.usage?.output_tokens ?? null,
    totalTokens: body.usage?.total_tokens ?? null,
  };
  await audit(metadata, body);
  if (body.status !== 'completed') throw new EvaluationUnavailable('provider_incomplete', metadata);
  const text = (body.output ?? [])
    .filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text ?? '')
    .join('');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new EvaluationUnavailable('provider_output', metadata);
  }
  // Map request-local tN references back to canonical truth IDs.
  const map = (ids: unknown) => (Array.isArray(ids) ? ids.map((id) => references.get(String(id)) ?? '') : []);
  parsed['summaryRefs'] = map(parsed['summaryRefs']);
  for (const role of (parsed['roles'] as Record<string, unknown>[]) ?? []) {
    role['headingRefs'] = map(role['headingRefs']);
    for (const bullet of (role['bullets'] as Record<string, unknown>[]) ?? [])
      bullet['refs'] = map(bullet['refs']);
  }
  return parsed;
}

// WinAnsi-safe text for the standard PDF fonts.
const ansi = (s: string) =>
  s
    .replace(/[‐-―]/g, (c) => (c === '—' ? '—' : c === '–' ? '–' : '-'))
    .replace(/[→➔]/g, '->')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[^\x20-\x7e -ÿ–—‘’“”•…€]/g, '');

export async function renderResumePdf(resume: TailoredResume): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(RESUME_CONTACT.name + ' — Résumé');
  pdf.setAuthor(RESUME_CONTACT.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [width, height, margin] = [612, 792, 54];
  const ink = rgb(0.1, 0.1, 0.12);
  const accent = rgb(0.13, 0.33, 0.55);
  let page: PDFPage = pdf.addPage([width, height]);
  let y = height - margin;
  const room = (needed: number) => {
    if (y - needed >= margin) return;
    page = pdf.addPage([width, height]);
    y = height - margin;
  };
  const wrap = (text: string, font: PDFFont, size: number, max: number) => {
    const lines: string[] = [];
    let current = '';
    for (const word of ansi(text).split(' ')) {
      const next = current ? current + ' ' + word : word;
      if (font.widthOfTextAtSize(next, size) > max && current) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    return lines;
  };
  const write = (text: string, font: PDFFont, size: number, options: { x?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const x = options.x ?? margin;
    for (const l of wrap(text, font, size, width - margin - x)) {
      room(size + 3);
      page.drawText(l, { x, y: y - size, size, font, color: options.color ?? ink });
      y -= size + 3;
    }
    y -= options.gap ?? 0;
  };
  const section = (title: string) => {
    room(30);
    y -= 8;
    write(title.toUpperCase(), bold, 10.5, { color: accent });
    page.drawLine({ start: { x: margin, y: y + 1 }, end: { x: width - margin, y: y + 1 }, thickness: 0.8, color: accent });
    y -= 6;
  };

  write(RESUME_CONTACT.name, bold, 22, { gap: 2 });
  if (resume.headline) write(resume.headline, regular, 12.5, { color: accent, gap: 2 });
  write(RESUME_CONTACT.line, regular, 9.5, { gap: 4 });
  if (resume.summary) {
    section('Summary');
    write(resume.summary, regular, 10.5, { gap: 2 });
  }
  if (resume.skills.length) {
    section('Skills');
    write(resume.skills.join('  •  '), regular, 10, { gap: 2 });
  }
  section('Experience');
  for (const role of resume.roles) {
    room(40);
    const heading = [role.title, role.employer].filter(Boolean).join(' — ');
    const dates = ansi(role.dates);
    const dateWidth = dates ? regular.widthOfTextAtSize(dates, 10) : 0;
    const headingLines = wrap(heading, bold, 11, width - 2 * margin - dateWidth - 12);
    headingLines.forEach((l, i) => {
      room(14);
      page.drawText(l, { x: margin, y: y - 11, size: 11, font: bold, color: ink });
      if (i === 0 && dates)
        page.drawText(dates, { x: width - margin - dateWidth, y: y - 11, size: 10, font: regular, color: ink });
      y -= 14;
    });
    for (const bullet of role.bullets) {
      const lines = wrap(bullet, regular, 10, width - 2 * margin - 14);
      lines.forEach((l, i) => {
        room(13);
        if (i === 0) page.drawText('•', { x: margin + 2, y: y - 10, size: 10, font: regular, color: ink });
        page.drawText(l, { x: margin + 14, y: y - 10, size: 10, font: regular, color: ink });
        y -= 13;
      });
    }
    y -= 6;
  }
  return pdf.save();
}

export function resumeFileName(headline: string) {
  const role = headline.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return 'D-James-Poer-Resume' + (role ? '-' + role : '') + '.pdf';
}
