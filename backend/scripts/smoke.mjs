// End-to-end check of every endpoint against a throwaway database and a fake RTSP recorder.
// Usage: npm run smoke
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const md5 = (s) => createHash('md5').update(s).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-smoke-'));
const PORT = 4100 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}/api`;
const NVR_USER = 'kitchen_nvr';
const NVR_PASS = 'demo1234';
const REALM = 'FakeNVR';
const NONCE = randomBytes(8).toString('hex');
const CHANNELS = new Set(['/Streaming/Channels/101', '/Streaming/Channels/201']);

// Fake recorder: Digest-protected DESCRIBE on two Hikvision-style channels.
const nvr = net.createServer((socket) => {
  let buf = '';
  socket.on('data', (d) => {
    buf += d.toString();
    if (!buf.includes('\r\n\r\n')) return;
    const [first, ...headers] = buf.split('\r\n');
    const url = first.split(' ')[1];
    const cseq = headers.find((h) => h.startsWith('CSeq'))?.split(':')[1]?.trim() ?? '1';
    const auth = headers.find((h) => h.toLowerCase().startsWith('authorization'));
    const p = new URL(url);
    const reqPath = p.pathname + p.search;
    let status = '404 Not Found';
    let extra = '';
    if (!auth) {
      status = '401 Unauthorized';
      extra = `WWW-Authenticate: Digest realm="${REALM}", nonce="${NONCE}"\r\n`;
    } else {
      const response = /response="([^"]+)"/.exec(auth)?.[1];
      const expected = md5(`${md5(`${NVR_USER}:${REALM}:${NVR_PASS}`)}:${NONCE}:${md5(`DESCRIBE:${url}`)}`);
      if (response !== expected) status = '401 Unauthorized';
      else if (CHANNELS.has(reqPath)) status = '200 OK';
    }
    socket.end(`RTSP/1.0 ${status}\r\nCSeq: ${cseq}\r\n${extra}Content-Length: 0\r\n\r\n`);
  });
  socket.on('error', () => {});
});
await new Promise((r) => nvr.listen(0, '127.0.0.1', r));
const NVR_PORT = nvr.address().port;

const server = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(PORT),
    DATABASE_PATH: path.join(tmp, 'aura.db'),
    HLS_DIR: path.join(tmp, 'hls'),
    JWT_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    STREAMS_ENABLED: 'false',
    CORS_ORIGINS: 'http://localhost:5173',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

let failures = 0;
let passes = 0;
function expect(label, condition, info) {
  if (condition) passes++;
  else {
    failures++;
    console.log(`FAIL ${label}`, info === undefined ? '' : JSON.stringify(info));
  }
}

async function call(method, route, { token, body, ingestKey } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (ingestKey) headers['x-ingest-key'] = ingestKey;
  const res = await fetch(BASE + route, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }

  // Accounts
  let r = await call('POST', '/auth/register', { body: { name: 'Sunrise Kitchen', id: 'Owner@Sunrise.in', password: 'correct-horse' } });
  expect('register 201', r.status === 201 && typeof r.body.token === 'string' && r.body.name === 'Sunrise Kitchen', r);
  r = await call('POST', '/auth/register', { body: { name: 'Dup', id: 'owner@sunrise.in', password: 'correct-horse' } });
  expect('duplicate register 409', r.status === 409 && typeof r.body.error === 'string', r);
  r = await call('POST', '/auth/register', { body: { name: 'X', id: 'nope', password: 'short' } });
  expect('invalid register 422 with details', r.status === 422 && r.body.details.length === 3 && r.body.success === false, r);
  r = await call('POST', '/auth/register', { body: '{bad json' });
  expect('malformed JSON 400', r.status === 400 && r.body.code === 'MALFORMED_JSON', r);
  r = await call('POST', '/auth/login', { body: { id: 'owner@sunrise.in', password: 'wrong-password' } });
  expect('bad login 401', r.status === 401, r);
  r = await call('POST', '/auth/login', { body: { id: ' OWNER@sunrise.in ', password: 'correct-horse' } });
  expect('login 200', r.status === 200 && r.body.name === 'Sunrise Kitchen', r);
  const token = r.body.token;

  r = await call('GET', '/cameras');
  expect('no token 401', r.status === 401, r);
  r = await call('GET', '/cameras', { token: 'garbage' });
  expect('bad token 401', r.status === 401, r);

  const other = (await call('POST', '/auth/register', { body: { name: 'Other Place', id: '9876543210', password: 'another-pass' } })).body.token;

  // Categories before any data
  r = await call('GET', '/categories', { token });
  expect('categories: six keys, null scores', r.status === 200 && r.body.length === 6 && r.body.every((c) => c.score === null), r);

  // Network test
  r = await call('POST', '/network/test', { token, body: { address: '127.0.0.1', port: NVR_PORT, username: NVR_USER, password: 'wrong' } });
  expect('network wrong password -> connected false', r.status === 200 && r.body.connected === false && /rejected/.test(r.body.error), r);
  r = await call('POST', '/network/test', { token, body: { address: '127.0.0.1', port: 1, username: 'a', password: 'b' } });
  expect('network unreachable -> connected false', r.status === 200 && r.body.connected === false, r);
  r = await call('POST', '/network/test', { token, body: { address: 'not a host!', port: 70000, username: '', password: '' } });
  expect('network invalid 422', r.status === 422 && r.body.details.length === 4, r);
  r = await call('POST', '/network/test', { token, body: { address: '127.0.0.1', port: NVR_PORT, username: NVR_USER, password: NVR_PASS } });
  expect('network discovers 2 cameras', r.status === 200 && r.body.connected === true && r.body.cameras.length === 2, r);
  expect('camera shape', r.body.cameras?.[0]?.id === 'cam-1' && r.body.cameras[0].feedVerified === false && r.body.cameras[0].streamUrl === null, r.body.cameras);
  r = await call('POST', '/network/test', { token, body: { address: '127.0.0.1', port: NVR_PORT, username: NVR_USER, password: NVR_PASS } });
  expect('network re-test keeps ids stable', r.body.cameras?.map((c) => c.id).join() === 'cam-1,cam-2', r);

  r = await call('PUT', '/cameras/cam-1', { token, body: { name: 'Kitchen Cam 1', zone: 'Cooking Line' } });
  expect('camera update', r.status === 200 && r.body.zone === 'Cooking Line' && r.body.name === 'Kitchen Cam 1', r);
  r = await call('PUT', '/cameras/cam-2', { token, body: { zone: 'Moon' } });
  expect('camera bad zone 422', r.status === 422, r);
  r = await call('PUT', '/cameras/cam-9', { token, body: { zone: 'Storage' } });
  expect('camera missing 404', r.status === 404, r);
  r = await call('GET', '/cameras', { token: other });
  expect('cameras isolated per account', r.status === 200 && r.body.length === 0, r);

  // Staff
  r = await call('GET', '/staff', { token });
  expect('staff empty', r.status === 200 && r.body.length === 0, r);
  const nowLocal = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const hour = Number(nowLocal.slice(0, 2));
  const shiftFrom = `${String((hour + 23) % 24).padStart(2, '0')}:00`;
  const shiftTo = `${String((hour + 2) % 24).padStart(2, '0')}:00`;
  r = await call('POST', '/staff', { token, body: { name: 'Priya Nambiar', role: 'Supervisor', area: 'Cooking Line', from: shiftFrom, to: shiftTo, phone: '98270 33445', email: '', notify: true } });
  expect('staff create 201 with generated id', r.status === 201 && r.body.empId === 'EMP-1036' && r.body.phone === '9827033445', r);
  r = await call('POST', '/staff', { token, body: { empId: 'EMP-1036', name: 'Dup', role: 'Chef', area: 'Storage', from: '08:00', to: '17:00', phone: '9827000000', notify: false } });
  expect('staff duplicate 409', r.status === 409, r);
  r = await call('POST', '/staff', { token, body: { name: 'Night Cook', role: 'Chef', area: 'All areas', from: '22:00', to: '06:00', phone: '9827000001', email: 'Cook@x.in', notify: false } });
  expect('staff night shift', r.status === 201 && r.body.empId === 'EMP-1037' && r.body.email === 'cook@x.in', r);
  r = await call('POST', '/staff', { token, body: { name: 'Bad', role: 'Boss', area: 'Roof', from: '25:00', to: '08:00', phone: 'abc', email: 'x' } });
  expect('staff invalid 422', r.status === 422 && r.body.details.length >= 5, r);
  r = await call('PUT', '/staff/EMP-1037', { token, body: { name: 'Night Cook', role: 'Chef', area: 'Storage', from: '22:00', to: '06:00', phone: '9827000001', email: '', notify: true } });
  expect('staff update', r.status === 200 && r.body.area === 'Storage' && r.body.notify === true, r);
  r = await call('PUT', '/staff/EMP-9999', { token, body: { name: 'Ghost', role: 'Chef', area: 'Storage', from: '08:00', to: '09:00', phone: '9827000001' } });
  expect('staff update missing 404', r.status === 404, r);
  r = await call('DELETE', '/staff/EMP-1037', { token });
  expect('staff delete 204', r.status === 204, r);
  r = await call('DELETE', '/staff/EMP-1037', { token });
  expect('staff delete again 404', r.status === 404, r);

  // Analyzer ingest
  r = await call('POST', '/account/ingest-key', { token });
  expect('ingest key issued', r.status === 201 && r.body.ingestKey.startsWith('aura_'), r);
  const ingestKey = r.body.ingestKey;
  r = await call('POST', '/ingest/checks', { body: { cameraId: 'cam-1', category: 'hygiene', result: 'pass', message: 'x' } });
  expect('ingest without key 401', r.status === 401, r);
  r = await call('POST', '/ingest/checks', { ingestKey, body: { cameraId: 'cam-7', category: 'hygiene', result: 'pass', message: 'Gloves worn' } });
  expect('ingest unknown camera 422', r.status === 422, r);
  r = await call('POST', '/ingest/checks', { ingestKey, body: { cameraId: 'cam-1', category: 'hygiene', result: 'pass', message: 'Gloves worn', at: '2099-01-01T00:00:00+05:30' } });
  expect('ingest future time 422', r.status === 422, r);
  const yesterday = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  r = await call('POST', '/ingest/checks', {
    ingestKey,
    body: [
      { cameraId: 'cam-1', category: 'hygiene', result: 'pass', message: 'Hairnets worn by all staff', at: yesterday },
      { cameraId: 'cam-1', category: 'hygiene', result: 'fail', message: 'Hairnet missing', at: yesterday },
      { cameraId: 'cam-1', category: 'hygiene', result: 'pass', message: 'Gloves worn while plating' },
      { cameraId: 'cam-1', category: 'hygiene', result: 'pass', message: 'Handwashing before prep' },
      { cameraId: 'cam-1', category: 'oil', result: 'pass', message: 'Oil colour within limit' },
      { cameraId: 'cam-1', category: 'hygiene', result: 'fail', message: 'Gloves not worn while handling food' },
    ],
  });
  expect('ingest batch 201', r.status === 201 && r.body.length === 6 && ISO.test(r.body[0].at), r);
  const failId = r.body[5].id;
  const passId = r.body[2].id;

  r = await call('PUT', '/ingest/cameras/cam-1/verification', { ingestKey, body: { feedVerified: true } });
  expect('verification set', r.status === 200 && r.body.feedVerified === true && ISO.test(r.body.verifiedAt), r);
  r = await call('GET', '/cameras', { token: ingestKey });
  expect('ingest key cannot read dashboard', r.status === 401, r);

  // Checks
  r = await call('GET', '/checks?limit=50', { token });
  expect('checks newest first', r.status === 200 && r.body.length === 6 && r.body[0].at >= r.body[5].at, r);
  expect('check shape', ['id', 'cameraId', 'result', 'message', 'at', 'fixedAt'].every((k) => k in r.body[0]), r.body[0]);
  r = await call('GET', '/checks?limit=0', { token });
  expect('checks bad limit 422', r.status === 422, r);
  r = await call('GET', '/checks/summary', { token });
  expect('summary today', r.status === 200 && r.body.total === 4 && r.body.passed === 3, r);
  r = await call('GET', '/checks', { token: other });
  expect('checks isolated per account', r.body.length === 0, r);

  r = await call('GET', '/categories', { token });
  const hygiene = r.body.find((c) => c.key === 'hygiene');
  expect('hygiene score 67 with open issue', hygiene.score === 67 && /Gloves not worn/.test(hygiene.detail) && ISO.test(hygiene.checkedAt), hygiene);
  expect('oil 100', r.body.find((c) => c.key === 'oil').score === 100, r.body);

  r = await call('POST', `/checks/${failId}/fix`, { token });
  expect('fix 200', r.status === 200 && ISO.test(r.body.fixedAt), r);
  r = await call('POST', `/checks/${failId}/fix`, { token });
  expect('fix idempotent', r.status === 200 && ISO.test(r.body.fixedAt), r);
  r = await call('POST', `/checks/${passId}/fix`, { token });
  expect('fix pass 409', r.status === 409, r);
  r = await call('POST', `/checks/${failId}/fix`, { token: other });
  expect('fix other account 404', r.status === 404, r);
  r = await call('POST', '/checks/not-a-uuid/fix', { token });
  expect('fix bad id 422', r.status === 422, r);

  r = await call('GET', '/trend?days=7', { token });
  expect('trend two days oldest first', r.status === 200 && r.body.length === 2 && r.body[0].date < r.body[1].date && r.body[0].score === 50 && r.body[1].score === 83, r);
  r = await call('GET', '/trend?days=abc', { token });
  expect('trend bad days 422', r.status === 422, r);

  r = await call('GET', '/account', { token });
  expect('account', r.status === 200 && r.body.hasIngestKey === true && r.body.id === 'owner@sunrise.in', r);
  r = await call('GET', '/v1/staff', { token });
  expect('/api/v1 alias', r.status === 200, r);
  r = await call('GET', '/nope', { token });
  expect('unknown route 404', r.status === 404 && r.body.success === false, r);

  const cors = await fetch(`${BASE}/cameras`, { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' } });
  expect('CORS allows frontend', cors.headers.get('access-control-allow-origin') === 'http://localhost:5173');
} catch (error) {
  failures++;
  console.error('Smoke test crashed:', error);
} finally {
  server.kill();
  nvr.close();
  await new Promise((r) => setTimeout(r, 300));
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`${passes} passed, ${failures} failed`);
if (failures > 0) {
  console.log('--- server log ---\n' + serverLog);
  process.exit(1);
}
