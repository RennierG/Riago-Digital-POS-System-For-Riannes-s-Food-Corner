import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();
const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.get('/', ...only('admin', 'cashier'), orderController.listAll);

// ---- Task 3.1.1: counter orders ----
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);

export default orderRoutes;
