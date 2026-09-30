import type { Request, Response } from 'express';
import { currentAccount } from '../../middleware/auth.js';
import { parse } from '../../lib/validate.js';
import { CreateStaffSchema, EmpIdParams, UpdateStaffSchema } from './staff.schemas.js';
import { staffService } from './staff.service.js';

export const staffController = {
  list(req: Request, res: Response): void {
    res.json(staffService.list(currentAccount(req).id));
  },

  create(req: Request, res: Response): void {
    const input = parse(CreateStaffSchema, req.body);
    res.status(201).json(staffService.create(currentAccount(req).id, input));
  },

  update(req: Request, res: Response): void {
    const { empId } = parse(EmpIdParams, req.params);
    const input = parse(UpdateStaffSchema, req.body);
    res.json(staffService.update(currentAccount(req).id, empId, input));
  },

  remove(req: Request, res: Response): void {
    const { empId } = parse(EmpIdParams, req.params);
    staffService.remove(currentAccount(req).id, empId);
    res.status(204).end();
  },
};
