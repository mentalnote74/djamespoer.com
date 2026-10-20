import { boundedBytes } from './evidence-validation.ts';

export class PublicPageError extends Error {}
export type PublicHostResolver = (hostname: string) => Promise<string[]>;

/** The public Internet fetch path has no VPC binding or caller credentials. */
export async function resolvePublicHost(hostname: string): Promise<string[]> {
  try {
    const answers = await Promise.all(
      ['A', 'AAAA'].map(async (type) => {
        const url = new URL('https://cloudflare-dns.com/dns-query');
        url.searchParams.set('name', hostname);
        url.searchParams.set('type', type);
        const response = await fetch(url, {
          headers: { Accept: 'application/dns-json' },
          redirect: 'error',
          signal: AbortSignal.timeout(4000),
          credentials: 'omit',
        });
        if (!response.ok) throw new Error('DNS unavailable');
        const data = JSON.parse(
          new TextDecoder().decode(await boundedBytes(response.body, 32000)),
        ) as {
          Status: number;
          Answer?: { type: number; data: string }[];
        };
        if (![0, 3].includes(data.Status)) throw new Error('DNS unavailable');
        return (data.Answer ?? []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data);
      }),
    );
    return answers.flat();
  } catch {
    throw new PublicPageError(
      'The site’s public DNS could not be resolved. Check the URL, retry, or paste the job text.',
    );
  }
}

function publicAddress(value: string) {
  if (value.includes(':')) {
    let host: string;
    try {
      host = new URL('https://[' + value + ']/').hostname.slice(1, -1);
    } catch {
      return false;
    }
    const words = host.split(':');
    const first = parseInt(words[0], 16),
      second = parseInt(words[1] || '0', 16);
    // Global unicast only, excluding special-use/documentation/tunnel ranges.
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      first !== 0x2002 &&
      !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
      !(first === 0x3fff && second <= 0x0fff)
    );
  }
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return false;
  const [a, b, c, d] = value.split('.').map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

export function publicPageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PublicPageError('Enter a complete HTTPS job-posting URL, or use Paste text.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443'))
    throw new PublicPageError(
      'Use a public HTTPS URL without embedded credentials or a custom port. Paste the job text if needed.',
    );
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  // Block IP literals (including URL-normalized integer/hex forms), single-label
  // and special-use hosts before DNS. Every redirect goes through the same checks.
  if (
    !host.includes('.') ||
    /^[\d.]+$/.test(host) ||
    host.includes(':') ||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host) ||
    host.endsWith('.home.arpa') ||
    host.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  )
    throw new PublicPageError(
      'This URL does not identify a public Internet host. Use the public posting or paste its text.',
    );
  url.hostname = host;
  url.hash = '';
  return url;
}

export async function checkPublicHost(url: URL, resolve: PublicHostResolver) {
  const addresses = await resolve(url.hostname);
  if (!addresses.length)
    throw new PublicPageError(
      'The site has no usable public DNS address. Check the URL or paste the job text.',
    );
  if (addresses.some((address) => !publicAddress(address)))
    throw new PublicPageError(
      'The URL resolves to a private or reserved address and cannot be retrieved. Use a public posting or paste its text.',
    );
}
