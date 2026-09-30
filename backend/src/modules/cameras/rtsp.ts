import net from 'node:net';
import { md5, randomToken } from '../../lib/crypto.js';

export interface RtspTarget {
  host: string;
  port: number;
  username: string;
  password: string;
  timeoutMs: number;
}

interface RtspResponse {
  status: number;
  authenticate: string[];
}

export type ProbeOutcome = 'ok' | 'unauthorized' | 'missing';

export class RtspConnectionError extends Error {}

const hostForUrl = (host: string) => (net.isIPv6(host) ? `[${host}]` : host);

export function rtspUrl(target: Pick<RtspTarget, 'host' | 'port'>, path: string, creds?: { username: string; password: string }): string {
  const auth = creds
    ? `${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@`
    : '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `rtsp://${auth}${hostForUrl(target.host)}:${target.port}${normalized}`;
}

function request(target: RtspTarget, url: string, cseq: number, authorization?: string): Promise<RtspResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: target.host, port: target.port });
    let buffer = '';
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.setTimeout(target.timeoutMs, () =>
      finish(() => reject(new RtspConnectionError(`No answer from ${target.host}:${target.port} within ${target.timeoutMs} ms`))),
    );
    socket.on('error', (err) => finish(() => reject(new RtspConnectionError(err.message))));
    socket.on('close', () => finish(() => reject(new RtspConnectionError('The recorder closed the connection'))));
    socket.on('connect', () => {
      const lines = [`DESCRIBE ${url} RTSP/1.0`, `CSeq: ${cseq}`, 'Accept: application/sdp', 'User-Agent: AURA-Snap/1.0'];
      if (authorization) lines.push(`Authorization: ${authorization}`);
      socket.write(`${lines.join('\r\n')}\r\n\r\n`);
    });
    socket.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('latin1');
      if (buffer.length > 64 * 1024) {
        finish(() => reject(new RtspConnectionError('The recorder sent an oversized response')));
        return;
      }
      const end = buffer.indexOf('\r\n\r\n');
      if (end === -1) return;
      const [statusLine = '', ...headerLines] = buffer.slice(0, end).split('\r\n');
      const match = /^RTSP\/1\.\d\s+(\d{3})/.exec(statusLine);
      if (!match?.[1]) {
        finish(() => reject(new RtspConnectionError('The device at this address did not answer as an RTSP recorder')));
        return;
      }
      const authenticate = headerLines
        .filter((l) => /^www-authenticate\s*:/i.test(l))
        .map((l) => l.slice(l.indexOf(':') + 1).trim());
      finish(() => resolve({ status: Number(match[1]), authenticate }));
    });
  });
}

function parseChallenge(header: string): Map<string, string> {
  const params = new Map<string, string>();
  const re = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header)) !== null) {
    if (m[1]) params.set(m[1].toLowerCase(), m[2] ?? m[3] ?? '');
  }
  return params;
}

function authorizationFor(challenges: string[], target: RtspTarget, url: string): string | undefined {
  const digest = challenges.find((c) => /^digest\s/i.test(c));
  if (digest) {
    const p = parseChallenge(digest);
    const realm = p.get('realm') ?? '';
    const nonce = p.get('nonce') ?? '';
    const ha1 = md5(`${target.username}:${realm}:${target.password}`);
    const ha2 = md5(`DESCRIBE:${url}`);
    const qop = p.get('qop')?.split(',').map((q) => q.trim()).includes('auth') ? 'auth' : undefined;
    const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const parts = [`username="${esc(target.username)}"`, `realm="${esc(realm)}"`, `nonce="${esc(nonce)}"`, `uri="${esc(url)}"`];
    if (qop) {
      const cnonce = randomToken(8);
      const nc = '00000001';
      parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`, `response="${md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)}"`);
    } else {
      parts.push(`response="${md5(`${ha1}:${nonce}:${ha2}`)}"`);
    }
    const opaque = p.get('opaque');
    if (opaque !== undefined) parts.push(`opaque="${esc(opaque)}"`);
    return `Digest ${parts.join(', ')}`;
  }
  if (challenges.some((c) => /^basic\s/i.test(c))) {
    return `Basic ${Buffer.from(`${target.username}:${target.password}`, 'utf8').toString('base64')}`;
  }
  return undefined;
}

/** DESCRIBE one stream path, answering a Basic or Digest challenge if the recorder asks. */
export async function probePath(target: RtspTarget, path: string): Promise<ProbeOutcome> {
  const url = rtspUrl(target, path);
  let res = await request(target, url, 1);
  if (res.status === 401) {
    const authorization = authorizationFor(res.authenticate, target, url);
    if (!authorization) return 'unauthorized';
    res = await request(target, url, 2, authorization);
  }
  if (res.status >= 200 && res.status < 300) return 'ok';
  if (res.status === 401 || res.status === 403) return 'unauthorized';
  return 'missing';
}

/** Stream path patterns used by common NVR brands, tried in order. `n` is the 1-based channel. */
const PATH_PATTERNS: ReadonlyArray<(n: number) => string> = [
  (n) => `/Streaming/Channels/${n}01`,
  (n) => `/cam/realmonitor?channel=${n}&subtype=0`,
  (n) => `/live/ch${n}`,
  (n) => `/ch${n}/main/av_stream`,
  (n) => `/h264/ch${n}/main/av_stream`,
  (n) => `/stream${n}`,
];

export type DiscoveryResult = { kind: 'found'; paths: string[] } | { kind: 'unauthorized' } | { kind: 'none' };

export async function discoverChannels(target: RtspTarget, maxChannels: number): Promise<DiscoveryResult> {
  let sawUnauthorized = false;
  for (const pattern of PATH_PATTERNS) {
    const first = await probePath(target, pattern(1));
    if (first === 'unauthorized') {
      sawUnauthorized = true;
      continue;
    }
    if (first !== 'ok') continue;
    const paths = [pattern(1)];
    for (let n = 2; n <= maxChannels; n++) {
      if ((await probePath(target, pattern(n))) !== 'ok') break;
      paths.push(pattern(n));
    }
    return { kind: 'found', paths };
  }
  return sawUnauthorized ? { kind: 'unauthorized' } : { kind: 'none' };
}
