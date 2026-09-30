import type { Request, Response } from 'express';
import { currentAccount } from '../../middleware/auth.js';
import { parse } from '../../lib/validate.js';
import { CameraIdParams, NetworkTestSchema, UpdateCameraSchema } from './cameras.schemas.js';
import { cameraService } from './cameras.service.js';

export const cameraController = {
  list(req: Request, res: Response): void {
    res.json(cameraService.list(currentAccount(req).id));
  },

  update(req: Request, res: Response): void {
    const { id } = parse(CameraIdParams, req.params);
    const input = parse(UpdateCameraSchema, req.body);
    res.json(cameraService.update(currentAccount(req).id, id, input));
  },

  async testNetwork(req: Request, res: Response): Promise<void> {
    const input = parse(NetworkTestSchema, req.body);
    res.json(await cameraService.testNetwork(currentAccount(req).id, input));
  },
};
