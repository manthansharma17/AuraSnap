import { Router } from 'express';
import { staffController } from './staff.controller.js';

export const staffRoutes = Router();
staffRoutes.get('/', staffController.list);
staffRoutes.post('/', staffController.create);
staffRoutes.put('/:empId', staffController.update);
staffRoutes.delete('/:empId', staffController.remove);
