import { boundedBytes, jdDocxXml } from './evidence-validation.ts';
export class JdIntakeError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'JdIntakeError';
    this.status = status;
  }
}
export interface PreparedJd {
  method: 'text' | 'url' | 'file';
  sourceLabel: string;
  jobDescription: string;
  notices: string[];
  removedLines: number;
  originalCharacters: number;
}
function entities(text: string) {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    rsquo: '’',
    lsquo: '‘',
    rdquo: '”',
    ldquo: '“',
    ndash: '–',
    mdash: '—',
    bull: '•',
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, key: string) => {
    if (key[0] !== '#') return named[key] ?? original;
    const n =
      key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : original;
  });
}
export function htmlText(html: string) {
  const chunks: string[] = [];
  let at = 0,
    skip = '';
  while (at < html.length) {
    const open = html.indexOf('<', at);
    if (open < 0) {
      if (!skip) chunks.push(html.slice(at));
      break;
    }
    if (!skip) chunks.push(html.slice(at, open));
    if (html.startsWith('<!--', open)) {
      const end = html.indexOf('-->', open + 4);
      at = end < 0 ? html.length : end + 3;
      continue;
    }
    const end = html.indexOf('>', open + 1);
    if (end < 0) break;
    const tag = html.slice(open, end + 1);
    const match = /^<\/?\s*([a-z][\w:-]*)/i.exec(tag),
      name = match?.[1].toLowerCase();
    const closing = tag.startsWith('</');
    if (skip) {
      if (closing && name === skip) skip = '';
    } else if (name && /^(script|style|nav|footer|header|aside|form)$/.test(name) && !closing)
      skip = name;
    else if (name && /^(br|p|div|li|h[1-6]|section|tr)$/.test(name)) chunks.push('\n');
    at = end + 1;
  }
  return entities(chunks.join('')).trim();
}
export function normalizeJd(raw: string): Omit<PreparedJd, 'method' | 'sourceLabel'> {
  if (!raw || raw.length > 100000)
    throw new JdIntakeError(
      'This input is too large. Paste only the intended job posting (up to 100,000 input characters).',
    );
  const originalCharacters = raw.length;
  let text = raw.replace(/\r\n?/g, '\n').replace(/[\uFEFF\u200B]/g, '');
  if (/<(?:html|body|article|p|div)\b/i.test(text)) text = htmlText(text);
  let lines = text.split('\n').map((s) => s.trim());
  const initial = lines.filter(Boolean).length;
  const anchor = lines.findIndex((s) =>
    /^(the role|job description|about (?:this|the) (?:role|job|position)|responsibilities|what you(?:['’]ll| will) (?:do|bring)|qualifications)\b/i.test(
      s,
    ),
  );
  if (
    anchor > 8 &&
    lines
      .slice(0, anchor)
      .some((s) => /^(?:opt-out signal honored|built in logo|log in|privacy policy)$/i.test(s))
  ) {
    const prefix = lines.slice(0, anchor);
    let title = -1;
    for (let i = 0; i < prefix.length; i++)
      if (
        /\b(?:senior|staff|lead|principal|junior)\b.*\b(?:engineer|designer|developer|manager|analyst|nurse|architect)\b/i.test(
          prefix[i],
        )
      )
        title = i;
    lines = lines.slice(title >= 0 ? Math.max(0, title - 2) : Math.max(0, anchor - 8));
  }
  const end = lines.findIndex(
    (s, i) =>
      i > 3 &&
      /^(?:similar jobs|related jobs|recommended jobs|similar companies hiring|view all jobs at\b|view .+ profile$|report job$|our sites$|©)/i.test(
        s,
      ),
  );
  if (end >= 0) lines = lines.slice(0, end);
  lines = lines.filter(
    (s) =>
      !(
        /^(?:opt-out signal honored|accept|reject|built in logo|companies|jobs|articles|join|log in|apply(?: now)?|save(?: job)?|share|privacy policy|terms of use|your privacy choices.*|https?:\/\/\S+\s+logo)$/i.test(
          s,
        ) || /^we and our third-party partners use cookies\b/i.test(s)
      ),
  );
  const clean: string[] = [];
  for (const line of lines) if (line && line !== clean.at(-1)) clean.push(line);
  const jobDescription = clean.join('\n');
  if (jobDescription.length < 20)
    throw new JdIntakeError(
      'No usable job description was found. Paste the job’s title, responsibilities and qualifications.',
    );
  if (jobDescription.length > 24000)
    throw new JdIntakeError(
      'The remaining content exceeds 24,000 characters. Paste only the intended posting; nothing was silently truncated.',
    );
  const notices: string[] = [];
  const removedLines = Math.max(0, initial - clean.length);
  if (removedLines)
    notices.push(
      'Obvious navigation, repeated lines or content outside the intended posting was removed. Review the extracted text before evaluating.',
    );
  if (
    /sorry, this job was removed|posting (?:has )?expired|job is no longer available/i.test(
      jobDescription,
    )
  )
    notices.push(
      'The supplied page says this posting was removed or expired. Its requirements can still be evaluated, but availability is not confirmed.',
    );
  return { jobDescription, notices, removedLines, originalCharacters };
}
function jsonJob(html: string): string | null {
  const jobs: Record<string, unknown>[] = [];
  function visit(v: unknown) {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (!v || typeof v !== 'object') return;
    const obj = v as Record<string, unknown>;
    if (
      obj['@type'] === 'JobPosting' ||
      (Array.isArray(obj['@type']) && obj['@type'].includes('JobPosting'))
    )
      jobs.push(obj);
    if (obj['@graph']) visit(obj['@graph']);
    if (obj['mainEntity']) visit(obj['mainEntity']);
  }
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([^]*?)<\/script\s*>/gi,
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      /* HTML fallback remains available for malformed third-party metadata. */
    }
  }
  if (jobs.length > 1)
    throw new JdIntakeError(
      'This page contains multiple job postings. Open the specific posting or paste the intended job description.',
    );
  if (!jobs.length) return null;
  const j = jobs[0];
  if (typeof j['description'] !== 'string') return null;
  const values: string[] = [];
  for (const [key, label] of [
    ['title', 'Title'],
    ['hiringOrganization', 'Employer'],
    ['description', 'Description'],
    ['employmentType', 'Employment type'],
    ['jobLocation', 'Location'],
    ['jobLocationType', 'Work mode'],
    ['applicantLocationRequirements', 'Applicant location requirements'],
    ['eligibilityToWorkRequirement', 'Work eligibility'],
    ['baseSalary', 'Compensation'],
    ['qualifications', 'Qualifications'],
    ['responsibilities', 'Responsibilities'],
    ['skills', 'Skills'],
    ['educationRequirements', 'Education requirements'],
    ['experienceRequirements', 'Experience requirements'],
    ['validThrough', 'Posting valid through'],
  ] as const) {
    const value = j[key];
    if (value !== null && value !== undefined)
      values.push(
        label + ': ' + htmlText(typeof value === 'string' ? value : JSON.stringify(value)),
      );
  }
  return values.join('\n');
}
const boards = [
  'builtin.com',
  'jobs.lever.co',
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'jobs.ashbyhq.com',
];
function publicJobUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new JdIntakeError('Enter a complete HTTPS job-posting URL, or use Paste text.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !boards.some(
      (host) =>
        url.hostname === host || (host === 'builtin.com' && url.hostname.endsWith('.builtin.com')),
    )
  )
    throw new JdIntakeError(
      'URL extraction currently supports Built In, Lever, Greenhouse and Ashby public postings. For other sites, paste the job text or upload a document.',
    );
  url.hash = '';
  return url;
}
export async function fromJobUrl(
  value: string,
  transport: typeof fetch = fetch,
): Promise<PreparedJd> {
  if (value.length > 2000)
    throw new JdIntakeError('The URL is too long. Open the posting and paste its text.');
  let url = publicJobUrl(value);
  try {
    for (let n = 0; n < 4; n++) {
      const response = await transport(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(12000),
        headers: { Accept: 'text/html,text/plain', 'User-Agent': 'Thingamajob JD intake' },
      });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get('Location');
        if (!next) break;
        url = publicJobUrl(new URL(next, url).toString());
        continue;
      }
      if (!response.ok)
        throw new JdIntakeError(
          'The job site blocked extraction or the posting is unavailable. Open it yourself and paste the job text.',
        );
      const type = response.headers.get('Content-Type') ?? '';
      if (!/text\/html|text\/plain/i.test(type))
        throw new JdIntakeError(
          'The URL did not return a readable job page. Paste the job text instead.',
        );
      const bytes = await boundedBytes(response.body, 2_000_000),
        body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      let text = /text\/html/i.test(type) ? (jsonJob(body) ?? htmlText(body)) : body;
      if (text.length > 100000)
        throw new JdIntakeError(
          'The page has too much surrounding content. Paste only the intended job posting.',
        );
      if (
        !/responsibilit|qualificat|requirements|required|preferred|experience|what you|the role|job description/i.test(
          text,
        )
      )
        throw new JdIntakeError(
          'The page did not expose a readable job description. It may require scripts or sign-in. Paste the visible job text.',
        );
      return { method: 'url', sourceLabel: url.toString(), ...normalizeJd(text) };
    }
    throw new JdIntakeError('The job page redirected too many times. Paste the job text instead.');
  } catch (error) {
    if (error instanceof JdIntakeError) throw error;
    throw new JdIntakeError('The job page could not be read. Paste its text or upload a document.');
  }
}
export async function fromJdFile(file: File): Promise<PreparedJd> {
  if (!file.size || file.size > 1_000_000)
    throw new JdIntakeError('Choose a nonempty document up to 1 MB, or paste the job text.');
  const ext = file.name.split('.').at(-1)?.toLowerCase(),
    bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    if (ext === 'docx')
      text = entities(
        (await jdDocxXml(bytes))
          .replace(/<w:tab\b[^>]*\/>/g, '\t')
          .replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n')
          .replace(/<\/w:p>/g, '\n')
          .replace(/<[^>]+>/g, ''),
      );
    else if (['txt', 'md', 'markdown', 'html', 'htm'].includes(ext ?? '')) {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (/[\x00-\x08]/.test(text)) throw new Error('Binary');
      if (ext === 'html' || ext === 'htm') text = jsonJob(text) ?? htmlText(text);
    } else
      throw new JdIntakeError(
        'Use TXT, Markdown, HTML or DOCX. For PDF, legacy DOC or scanned files, copy the text or export a supported format.',
      );
  } catch (error) {
    if (error instanceof JdIntakeError) throw error;
    throw new JdIntakeError(
      'This document could not be read. Export UTF-8 text/DOCX or paste the job text.',
    );
  }
  return { method: 'file', sourceLabel: file.name.slice(0, 200), ...normalizeJd(text) };
}
export async function intakeJd(
  request: Request,
  transport: typeof fetch = fetch,
): Promise<PreparedJd> {
  let bytes: Uint8Array;
  try {
    bytes = await boundedBytes(request.body, 1_100_000);
  } catch {
    throw new JdIntakeError(
      'The input is too large. Upload one document up to 1 MB or paste the intended job text.',
      413,
    );
  }
  const type = request.headers.get('Content-Type') ?? '';
  if (type.startsWith('multipart/form-data')) {
    let form: FormData;
    try {
      form = await new Response(Uint8Array.from(bytes).buffer, {
        headers: { 'Content-Type': type },
      }).formData();
    } catch {
      throw new JdIntakeError('The upload could not be read. Choose the file again or paste text.');
    }
    const entries = [...form.entries()];
    if (entries.length !== 1 || entries[0][0] !== 'file' || !(entries[0][1] instanceof File))
      throw new JdIntakeError('Choose one supported JD file.');
    return fromJdFile(entries[0][1]);
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new JdIntakeError('The input could not be read. Paste the job text.');
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Object.keys(body).some((k) => !['method', 'text', 'url'].includes(k))
  )
    throw new JdIntakeError('Invalid job input.');
  if (body['method'] === 'text' && typeof body['text'] === 'string')
    return { method: 'text', sourceLabel: 'Pasted text', ...normalizeJd(body['text']) };
  if (body['method'] === 'url' && typeof body['url'] === 'string')
    return fromJobUrl(body['url'], transport);
  throw new JdIntakeError('Choose Paste text, URL or File.');
}
