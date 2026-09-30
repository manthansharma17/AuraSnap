export interface AuthAccount {
  id: string;
  name: string;
}

export interface AccountRecord extends AuthAccount {
  loginId: string;
  passwordHash: string;
  hasIngestKey: boolean;
  createdAt: number;
}

export interface SessionResponse {
  token: string;
  name: string;
}
