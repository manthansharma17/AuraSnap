import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config.js';
import { decryptSecret } from '../../lib/crypto.js';
import { cameraRepository } from './cameras.repository.js';
import type { CameraRecord, RecorderRecord } from './cameras.types.js';
import { rtspUrl } from './rtsp.js';

interface StreamProcess {
  child: ChildProcess | null;
  source: string;
  restarts: number;
  timer: NodeJS.Timeout | null;
  stopped: boolean;
}

/**
 * Browsers cannot play RTSP, so each camera is repackaged to HLS with ffmpeg
 * and served from /streams/<streamKey>/index.m3u8. The video is copied, not re-encoded,
 * so cameras must send H.264 for browsers to play them.
 */
class StreamManager {
  private readonly streams = new Map<string, StreamProcess>();
  private available: boolean | null = null;

  get enabled(): boolean {
    if (!config.streamsEnabled) return false;
    if (this.available === null) {
      const probe = spawnSync(config.ffmpegPath, ['-version'], { stdio: 'ignore', timeout: 5000 });
      this.available = probe.status === 0;
      if (!this.available) {
        console.warn(`[streams] ffmpeg not found at "${config.ffmpegPath}". Camera streamUrl will be null until it is installed.`);
      }
    }
    return this.available;
  }

  urlFor(camera: CameraRecord): string | null {
    return this.enabled ? `${config.publicBaseUrl}/streams/${camera.streamKey}/index.m3u8` : null;
  }

  /** Starts or restarts the stream for each camera of a recorder. */
  sync(recorder: RecorderRecord, cameras: CameraRecord[]): void {
    if (!this.enabled) return;
    const password = decryptSecret(recorder.passwordEnc);
    const target = { host: recorder.address, port: recorder.port };
    for (const camera of cameras) {
      const source = rtspUrl(target, camera.rtspPath, { username: recorder.username, password });
      const existing = this.streams.get(camera.streamKey);
      if (existing && existing.source === source && !existing.stopped) continue;
      if (existing) this.stop(camera.streamKey);
      const entry: StreamProcess = { child: null, source, restarts: 0, timer: null, stopped: false };
      this.streams.set(camera.streamKey, entry);
      this.launch(camera.streamKey, entry);
    }
  }

  startAll(): void {
    if (!this.enabled) return;
    const byAccount = new Map<string, CameraRecord[]>();
    for (const camera of cameraRepository.listAll()) {
      const list = byAccount.get(camera.accountId) ?? [];
      list.push(camera);
      byAccount.set(camera.accountId, list);
    }
    for (const recorder of cameraRepository.listRecorders()) {
      const cameras = byAccount.get(recorder.accountId);
      if (!cameras) continue;
      try {
        this.sync(recorder, cameras);
      } catch (error) {
        console.error(`[streams] could not start streams for account ${recorder.accountId}`, error);
      }
    }
  }

  stop(streamKey: string): void {
    const entry = this.streams.get(streamKey);
    if (!entry) return;
    entry.stopped = true;
    if (entry.timer) clearTimeout(entry.timer);
    entry.child?.kill('SIGTERM');
    this.streams.delete(streamKey);
  }

  stopAll(): void {
    for (const key of [...this.streams.keys()]) this.stop(key);
  }

  private launch(streamKey: string, entry: StreamProcess): void {
    const dir = path.join(config.hlsDir, streamKey);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      '-i', entry.source,
      '-an', '-c:v', 'copy',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+omit_endlist',
      path.join(dir, 'index.m3u8'),
    ];
    const child = spawn(config.ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    entry.child = child;
    child.stderr?.on('data', (chunk: Buffer) => {
      console.warn(`[streams] ${streamKey}: ${chunk.toString('utf8').trim()}`);
    });
    child.on('error', (error) => console.error(`[streams] ${streamKey} failed to start`, error));
    child.on('exit', () => {
      entry.child = null;
      if (entry.stopped) return;
      entry.restarts++;
      const delay = Math.min(60_000, 2_000 * 2 ** Math.min(entry.restarts, 5));
      entry.timer = setTimeout(() => {
        entry.timer = null;
        if (!entry.stopped) this.launch(streamKey, entry);
      }, delay);
    });
  }
}

export const streamManager = new StreamManager();
