import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier', 'kitchen'), orderController.listAll);
orderRoutes.post('/', ...only('customer'), orderController.create);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);
orderRoutes.patch('/:id/kitchen', ...only('kitchen', 'admin'), orderController.setKitchen);

// ---- Task 4.2.1: accept and reject online orders ----
orderRoutes.post('/:id/accept', ...only('cashier', 'admin'), orderController.accept);
orderRoutes.post('/:id/reject', ...only('cashier', 'admin'), orderController.reject);

export default orderRoutes;
