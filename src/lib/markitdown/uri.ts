export interface ParsedDataUri {
  mimetype: string;
  charset?: string;
  buffer: Buffer;
}

export function parseDataUri(uri: string): ParsedDataUri {
  const trimmed = uri.trim();
  if (!trimmed.toLowerCase().startsWith('data:')) {
    throw new Error('URI non valido: deve iniziare con data:');
  }

  const commaIndex = trimmed.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Data URI malformato: separatore virgola mancante.');
  }

  const meta = trimmed.slice(5, commaIndex);
  const payload = trimmed.slice(commaIndex + 1);
  const parts = meta.split(';').filter(Boolean);

  let mimetype = 'text/plain';
  let charset: string | undefined;
  let isBase64 = false;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'base64') {
      isBase64 = true;
    } else if (lower.startsWith('charset=')) {
      charset = part.slice('charset='.length).trim();
    } else if (part.includes('/')) {
      mimetype = lower;
    }
  }

  const buffer = isBase64
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf-8');

  return { mimetype, charset, buffer };
}

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./,
];

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

export function validateRemoteUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('URL non valido. Usa un indirizzo http://, https:// o data:.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Schema URI non supportato (${parsed.protocol}). Sono consentiti solo http:, https: e data:.`
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Accesso bloccato a indirizzi locali o interni per sicurezza.');
  }

  if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))) {
    throw new Error('Accesso bloccato a indirizzi IP privati o link-local.');
  }

  if (host.startsWith('[') && (host.includes('::1') || host.includes('fe80:') || host.includes('fc') || host.includes('fd'))) {
    throw new Error('Accesso bloccato a indirizzi IPv6 locali o privati.');
  }

  return parsed;
}
