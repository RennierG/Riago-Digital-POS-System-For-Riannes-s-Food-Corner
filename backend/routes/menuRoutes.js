import express from 'express';
import * as menuController from '../controllers/menuController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const menuRoutes = express.Router();

const admin = [requireAuth, allowRoles('admin')];

menuRoutes.get('/', menuController.list);
menuRoutes.get('/admin', ...admin, menuController.listAdmin);
menuRoutes.post('/', ...admin, menuController.create);
menuRoutes.put('/:id', ...admin, menuController.update);
menuRoutes.post('/:id/image', ...admin, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '3mb' }), menuController.setImage);
menuRoutes.patch('/:id/availability', ...admin, menuController.setAvailability);
menuRoutes.patch('/:id/archive', ...admin, menuController.setArchived);

// ---- Task 2.2.1: added stock route ----
menuRoutes.patch('/:id/stock', ...admin, menuController.setStock);

export default menuRoutes;
