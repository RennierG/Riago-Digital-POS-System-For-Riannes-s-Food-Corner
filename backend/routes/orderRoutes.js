import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier', 'kitchen'), orderController.listAll);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);
orderRoutes.patch('/:id/kitchen', ...only('kitchen', 'admin'), orderController.setKitchen);

// ---- Task 4.1.2: customer places online order ----
orderRoutes.post('/', ...only('customer'), orderController.create);

export default orderRoutes;
