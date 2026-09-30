import type { Zone } from '../../domain.js';

export interface CameraRecord {
  accountId: string;
  id: string;
  number: number;
  name: string;
  zone: Zone | null;
  rtspPath: string;
  streamKey: string;
  feedVerified: boolean;
  verifiedAt: number | null;
  createdAt: number;
}

/** Shape the frontend reads (data contract section 4). */
export interface CameraDto {
  id: string;
  name: string;
  zone: Zone | null;
  feedVerified: boolean;
  verifiedAt: string | null;
  streamUrl: string | null;
}

export interface RecorderRecord {
  accountId: string;
  address: string;
  port: number;
  username: string;
  passwordEnc: string;
}

export interface DiscoveredChannel {
  path: string;
  name: string;
  zone: Zone | null;
}

export type NetworkTestResult = { connected: true; cameras: CameraDto[] } | { connected: false; error: string };
