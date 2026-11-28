import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier', 'kitchen'), orderController.listAll);
orderRoutes.post('/', ...only('customer'), orderController.create);
orderRoutes.get('/mine', ...only('customer'), orderController.listMine);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);
orderRoutes.post('/:id/accept', ...only('cashier', 'admin'), orderController.accept);
orderRoutes.post('/:id/reject', ...only('cashier', 'admin'), orderController.reject);
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);
orderRoutes.patch('/:id/kitchen', ...only('kitchen', 'admin'), orderController.setKitchen);

// ---- Task 5.1.1: assign rider ----
orderRoutes.post('/:id/assign-rider', ...only('cashier', 'admin'), orderController.assignRider);

export default orderRoutes;
