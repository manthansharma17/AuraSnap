import { transaction } from '../../db/database.js';
import { config } from '../../config.js';
import { encryptSecret, randomToken } from '../../lib/crypto.js';
import { notFound } from '../../lib/errors.js';
import { toIsoOrNull } from '../../lib/time.js';
import { cameraRepository } from './cameras.repository.js';
import type { NetworkTestInput, UpdateCameraInput } from './cameras.schemas.js';
import type { CameraDto, CameraRecord, DiscoveredChannel, NetworkTestResult, RecorderRecord } from './cameras.types.js';
import { discoverChannels, probePath, RtspConnectionError, type RtspTarget } from './rtsp.js';
import { streamManager } from './streamManager.js';

export function toCameraDto(c: CameraRecord): CameraDto {
  return {
    id: c.id,
    name: c.name,
    zone: c.zone,
    feedVerified: c.feedVerified,
    verifiedAt: toIsoOrNull(c.verifiedAt),
    streamUrl: streamManager.urlFor(c),
  };
}

async function findChannels(target: RtspTarget, input: NetworkTestInput): Promise<DiscoveredChannel[] | { error: string }> {
  if (input.channels) {
    const found: DiscoveredChannel[] = [];
    for (const [i, ch] of input.channels.entries()) {
      const path = ch.path.startsWith('/') ? ch.path : `/${ch.path}`;
      const outcome = await probePath(target, path);
      if (outcome === 'unauthorized') return { error: 'The recorder rejected the username or password.' };
      if (outcome === 'missing') return { error: `The recorder has no stream at ${path}.` };
      found.push({ path, name: ch.name ?? `Camera ${i + 1}`, zone: ch.zone ?? null });
    }
    return found;
  }
  const result = await discoverChannels(target, config.rtspMaxChannels);
  if (result.kind === 'unauthorized') return { error: 'The recorder rejected the username or password.' };
  if (result.kind === 'none') {
    return { error: 'Connected to the recorder but found no camera streams. Send the stream paths in "channels".' };
  }
  return result.paths.map((path, i) => ({ path, name: `Camera ${i + 1}`, zone: null }));
}

function saveRecorder(accountId: string, input: NetworkTestInput, channels: DiscoveredChannel[]): {
  recorder: RecorderRecord;
  cameras: CameraRecord[];
} {
  return transaction(() => {
    const now = Date.now();
    const recorder: RecorderRecord = {
      accountId,
      address: input.address,
      port: input.port,
      username: input.username,
      passwordEnc: encryptSecret(input.password),
    };
    cameraRepository.upsertRecorder(recorder, now);
    let next = cameraRepository.nextNumber(accountId);
    const cameras: CameraRecord[] = [];
    for (const ch of channels) {
      const existing = cameraRepository.findByPath(accountId, ch.path);
      if (existing) {
        const zone = ch.zone ?? existing.zone;
        const name = input.channels ? ch.name : existing.name;
        cameraRepository.update(accountId, existing.id, name, zone);
        cameras.push({ ...existing, name, zone });
        continue;
      }
      const camera: CameraRecord = {
        accountId,
        id: `cam-${next}`,
        number: next,
        name: ch.name,
        zone: ch.zone,
        rtspPath: ch.path,
        streamKey: randomToken(18),
        feedVerified: false,
        verifiedAt: null,
        createdAt: now,
      };
      cameraRepository.insert(camera);
      cameras.push(camera);
      next++;
    }
    return { recorder, cameras };
  });
}

export const cameraService = {
  list(accountId: string): CameraDto[] {
    return cameraRepository.list(accountId).map(toCameraDto);
  },

  update(accountId: string, id: string, input: UpdateCameraInput): CameraDto {
    const camera = cameraRepository.find(accountId, id);
    if (!camera) throw notFound(`Camera ${id} was not found.`);
    const name = input.name ?? camera.name;
    const zone = input.zone ?? camera.zone;
    cameraRepository.update(accountId, id, name, zone);
    return toCameraDto({ ...camera, name, zone });
  },

  async testNetwork(accountId: string, input: NetworkTestInput): Promise<NetworkTestResult> {
    const target: RtspTarget = {
      host: input.address,
      port: input.port,
      username: input.username,
      password: input.password,
      timeoutMs: config.rtspTimeoutMs,
    };
    let channels: DiscoveredChannel[] | { error: string };
    try {
      channels = await findChannels(target, input);
    } catch (error) {
      if (error instanceof RtspConnectionError) {
        return { connected: false, error: `Could not reach the recorder at ${input.address}:${input.port}. ${error.message}.` };
      }
      throw error;
    }
    if (!Array.isArray(channels)) return { connected: false, error: channels.error };

    const { recorder, cameras } = saveRecorder(accountId, input, channels);
    try {
      streamManager.sync(recorder, cameras);
    } catch (error) {
      console.error('[streams] could not start streams after network test', error);
    }
    return { connected: true, cameras: cameras.map(toCameraDto) };
  },
};
