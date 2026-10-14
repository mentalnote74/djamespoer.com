export const MAX_EVIDENCE_BYTES = 10_000_000;
export type SourceType = 'pdf' | 'docx' | 'txt' | 'markdown';
export interface Provenance {
  filename: string;
  sourceType: SourceType;
  attribution: string;
  sourceLocator: string;
}
export class EvidenceInputError extends Error {
  readonly status: number;
  constructor(status = 400) {
    super('Invalid evidence input');
    this.status = status;
  }
}
const decoder = new TextDecoder('utf-8', { fatal: true });
export async function boundedBytes(stream: ReadableStream<Uint8Array> | null, limit: number) {
  if (!stream) throw new EvidenceInputError();
  const reader = stream.getReader(),
    parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new EvidenceInputError(413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
function text(bytes: Uint8Array) {
  try {
    const value = decoder.decode(bytes);
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new EvidenceInputError();
    return value;
  } catch {
    throw new EvidenceInputError();
  }
}
function metadata(value: unknown, limit: number, required: boolean) {
  if (typeof value !== 'string' || value.length > limit || /[\x00-\x1f\x7f]/.test(value))
    throw new EvidenceInputError();
  const trimmed = value.trim();
  if (required && !trimmed) throw new EvidenceInputError();
  return trimmed;
}
function pdf(bytes: Uint8Array) {
  const value = new TextDecoder('latin1').decode(bytes);
  if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(value) || !/%%EOF\s*$/.test(value))
    throw new EvidenceInputError();
  const starts = [...value.matchAll(/startxref\s+(\d+)\s+%%EOF/g)];
  const offset = Number(starts.at(-1)?.[1]);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= bytes.length)
    throw new EvidenceInputError();
  // Byte offsets, not decoded character offsets (TextDecoder latin1 is Windows-1252).
  const section = new TextDecoder('latin1').decode(bytes.subarray(offset));
  if (
    !/^xref\s+\d+\s+\d+/.test(section) &&
    !/^\d+\s+\d+\s+obj\b[\s\S]{0,8192}?\/Type\s*\/XRef\b/.test(section)
  )
    throw new EvidenceInputError();
  if (!/\/Root\s+\d+\s+\d+\s+R\b/.test(value) || !/\/Type\s*\/Catalog\b/.test(value))
    throw new EvidenceInputError();
}
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let n = value;
  for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
async function docx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      view.getUint32(i, true) === 0x06054b50 &&
      i + 22 + view.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0)
    throw new EvidenceInputError();
  const count = view.getUint16(end + 10, true),
    size = view.getUint32(end + 12, true),
    start = view.getUint32(end + 16, true);
  if (!count || count > 2000 || count !== view.getUint16(end + 8, true) || start + size !== end)
    throw new EvidenceInputError();
  let cursor = start,
    total = 0;
  const names = new Set<string>(),
    xml = new Map<string, string>();
  const required = new Set(['[Content_Types].xml', '_rels/.rels', 'word/document.xml']);
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      throw new EvidenceInputError();
    const flags = view.getUint16(cursor + 8, true),
      method = view.getUint16(cursor + 10, true),
      crc = view.getUint32(cursor + 16, true);
    const compressed = view.getUint32(cursor + 20, true),
      expanded = view.getUint32(cursor + 24, true),
      nameSize = view.getUint16(cursor + 28, true);
    const next =
        cursor +
        46 +
        nameSize +
        view.getUint16(cursor + 30, true) +
        view.getUint16(cursor + 32, true),
      local = view.getUint32(cursor + 42, true);
    if (
      next > end ||
      local + 30 > start ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      view.getUint16(cursor + 34, true) !== 0
    )
      throw new EvidenceInputError();
    const name = text(bytes.subarray(cursor + 46, cursor + 46 + nameSize));
    if (names.has(name) || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(name) || /vbaProject\.bin$/i.test(name))
      throw new EvidenceInputError();
    names.add(name);
    total += expanded;
    if (
      total > 50_000_000 ||
      view.getUint32(local, true) !== 0x04034b50 ||
      view.getUint16(local + 6, true) !== flags ||
      view.getUint16(local + 8, true) !== method
    )
      throw new EvidenceInputError();
    const localName = view.getUint16(local + 26, true),
      data = local + 30 + localName + view.getUint16(local + 28, true);
    if (
      data + compressed > start ||
      text(bytes.subarray(local + 30, local + 30 + localName)) !== name
    )
      throw new EvidenceInputError();
    if (
      !(flags & 8) &&
      (view.getUint32(local + 14, true) !== crc ||
        view.getUint32(local + 18, true) !== compressed ||
        view.getUint32(local + 22, true) !== expanded)
    )
      throw new EvidenceInputError();
    if (required.has(name)) {
      if (expanded > 8_000_000) throw new EvidenceInputError();
      const packed = Uint8Array.from(bytes.subarray(data, data + compressed));
      let unpacked = packed;
      if (method === 8) {
        try {
          unpacked = await boundedBytes(
            new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
            8_000_000,
          );
        } catch {
          throw new EvidenceInputError();
        }
      }
      if (unpacked.length !== expanded || crc32(unpacked) !== crc) throw new EvidenceInputError();
      const content = text(unpacked);
      if (/<!DOCTYPE|<!ENTITY/i.test(content)) throw new EvidenceInputError();
      xml.set(name, content);
    }
    cursor = next;
  }
  if (
    cursor !== end ||
    xml.size !== 3 ||
    !xml
      .get('[Content_Types].xml')
      ?.includes(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
      ) ||
    !xml.get('_rels/.rels')?.includes('/officeDocument') ||
    !/(http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main|http:\/\/purl\.oclc\.org\/ooxml\/wordprocessingml\/main)/.test(
      xml.get('word/document.xml') ?? '',
    )
  )
    throw new EvidenceInputError();
}

/** Structural type/container checks only, not malware scanning or career verification. */
export async function validateEvidence(
  bytes: Uint8Array,
  filename: string,
  mime: string,
  attribution: unknown,
  sourceLocator: unknown,
): Promise<Provenance> {
  if (!bytes.length) throw new EvidenceInputError();
  if (bytes.length > MAX_EVIDENCE_BYTES) throw new EvidenceInputError(413);
  const name = metadata(filename, 200, true);
  if (/[\\/]/.test(name)) throw new EvidenceInputError();
  const extension = name.split('.').at(-1)?.toLowerCase();
  const type: SourceType | undefined =
    extension === 'md' || extension === 'markdown'
      ? 'markdown'
      : ['pdf', 'docx', 'txt'].includes(extension ?? '')
        ? (extension as SourceType)
        : undefined;
  if (!type) throw new EvidenceInputError(415);
  const allowed: Record<SourceType, string[]> = {
    pdf: ['application/pdf'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    txt: ['text/plain'],
    markdown: ['text/markdown', 'text/plain'],
  };
  if (mime && !allowed[type].includes(mime.split(';')[0].trim().toLowerCase()))
    throw new EvidenceInputError(415);
  if (type === 'pdf') pdf(bytes);
  else if (type === 'docx') await docx(bytes);
  else text(bytes);
  return {
    filename: name,
    sourceType: type,
    attribution: metadata(attribution, 1000, true),
    sourceLocator: metadata(sourceLocator, 2000, false),
  };
}
