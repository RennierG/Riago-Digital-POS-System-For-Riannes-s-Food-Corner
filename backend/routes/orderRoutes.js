import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();

const only = (...roles) => [requireAuth, allowRoles(...roles)];

// ---- Task 2.3.1: admin can view all orders for sales dashboard ----
orderRoutes.get('/', ...only('admin'), orderController.listAll);

export default orderRoutes;
