import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { conflict, unauthorized } from '../../lib/errors.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { accountRepository } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { AuthAccount, SessionResponse } from './auth.types.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the login id is unknown, so response time does not reveal which ids exist.
const DUMMY_HASH = bcrypt.hashSync('aura-snap-timing-guard', BCRYPT_ROUNDS);

function issueToken(account: AuthAccount): string {
  return jwt.sign({ name: account.name }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: account.id,
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export const authService = {
  async register(input: RegisterInput): Promise<SessionResponse> {
    if (accountRepository.findByLoginId(input.id)) {
      throw conflict('An account with this email or phone already exists.');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const account = { id: randomUUID(), name: input.name, loginId: input.id, passwordHash, createdAt: Date.now() };
    try {
      accountRepository.create(account);
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: accounts\.login_id/.test(error.message)) {
        throw conflict('An account with this email or phone already exists.');
      }
      throw error;
    }
    return { token: issueToken(account), name: account.name };
  },

  async login(input: LoginInput): Promise<SessionResponse> {
    const account = accountRepository.findByLoginId(input.id);
    const ok = await bcrypt.compare(input.password, account?.passwordHash ?? DUMMY_HASH);
    if (!account || !ok) throw unauthorized('Incorrect email/phone or password.');
    return { token: issueToken(account), name: account.name };
  },

  verifyToken(token: string): AuthAccount {
    let subject: string | undefined;
    try {
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
      subject = typeof payload === 'string' ? undefined : payload.sub;
    } catch {
      throw unauthorized('Your session has expired. Please log in again.');
    }
    const account = subject ? accountRepository.findById(subject) : undefined;
    if (!account) throw unauthorized('Your session is no longer valid. Please log in again.');
    return { id: account.id, name: account.name };
  },

  /** Creates a new analyzer key (replacing any old one). The plain key is only returned here. */
  rotateIngestKey(accountId: string): string {
    const key = `aura_${randomToken(32)}`;
    accountRepository.setIngestKeyHash(accountId, sha256(key));
    return key;
  },

  verifyIngestKey(key: string): AuthAccount {
    const account = accountRepository.findByIngestKeyHash(sha256(key));
    if (!account) throw unauthorized('Invalid analyzer key.');
    return account;
  },
};
