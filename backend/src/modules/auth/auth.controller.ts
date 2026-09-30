import type { Request, Response } from 'express';
import { parse } from '../../lib/validate.js';
import { LoginSchema, RegisterSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = parse(RegisterSchema, req.body);
    res.status(201).json(await authService.register(input));
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = parse(LoginSchema, req.body);
    res.status(200).json(await authService.login(input));
  },
};
