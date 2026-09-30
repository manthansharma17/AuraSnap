import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/aura.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 12h or 30m').default('12h'),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  APP_TIMEZONE: z
    .string()
    .default('Asia/Kolkata')
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'APP_TIMEZONE must be a valid IANA time zone'),
  PUBLIC_BASE_URL: z.url().default('http://localhost:4000'),
  TRUST_PROXY: bool.default(false),
  STREAMS_ENABLED: bool.default(true),
  FFMPEG_PATH: z.string().min(1).default('ffmpeg'),
  HLS_DIR: z.string().min(1).default('./data/hls'),
  RTSP_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(4000),
  RTSP_MAX_CHANNELS: z.coerce.number().int().min(1).max(64).default(16),
  NOTIFY_WEBHOOK_URL: z.union([z.literal(''), z.url()]).default(''),
  NOTIFY_WEBHOOK_SECRET: z.string().default(''),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  databasePath: path.resolve(env.DATABASE_PATH),
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  encryptionKey: Buffer.from(env.ENCRYPTION_KEY, 'hex'),
  corsOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter((o) => o.length > 0),
  timezone: env.APP_TIMEZONE,
  publicBaseUrl: env.PUBLIC_BASE_URL.replace(/\/+$/, ''),
  trustProxy: env.TRUST_PROXY,
  streamsEnabled: env.STREAMS_ENABLED,
  ffmpegPath: env.FFMPEG_PATH,
  hlsDir: path.resolve(env.HLS_DIR),
  rtspTimeoutMs: env.RTSP_TIMEOUT_MS,
  rtspMaxChannels: env.RTSP_MAX_CHANNELS,
  notifyWebhookUrl: env.NOTIFY_WEBHOOK_URL,
  notifyWebhookSecret: env.NOTIFY_WEBHOOK_SECRET,
} as const;
