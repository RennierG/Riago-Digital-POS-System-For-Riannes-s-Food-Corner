import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier', 'kitchen'), orderController.listAll);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);

// ---- Task 3.3.1: kitchen status update ----
orderRoutes.patch('/:id/kitchen', ...only('kitchen', 'admin'), orderController.setKitchen);

export default orderRoutes;
