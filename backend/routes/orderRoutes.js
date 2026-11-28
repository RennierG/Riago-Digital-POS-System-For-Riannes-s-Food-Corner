import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier'), orderController.listAll);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);

// ---- Task 3.1.2: release counter orders ----
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);

export default orderRoutes;
