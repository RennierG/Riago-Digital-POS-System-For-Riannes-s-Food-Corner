import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const orderRoutes = express.Router();

const only = (...roles) => [requireAuth, allowRoles(...roles)];

orderRoutes.post('/', ...only('customer'), orderController.create);
orderRoutes.get('/mine', ...only('customer'), orderController.listMine);
orderRoutes.get('/', ...only('admin', 'cashier', 'kitchen', 'rider'), orderController.listAll);
orderRoutes.post('/counter', ...only('cashier', 'admin'), orderController.createCounter);
orderRoutes.post('/:id/accept', ...only('cashier', 'admin'), orderController.accept);
orderRoutes.post('/:id/reject', ...only('cashier', 'admin'), orderController.reject);
orderRoutes.post('/:id/assign-rider', ...only('cashier', 'admin'), orderController.assignRider);
orderRoutes.post('/:id/release', ...only('cashier', 'admin'), orderController.release);
orderRoutes.patch('/:id/kitchen', ...only('kitchen', 'admin'), orderController.setKitchen);

// ---- Task 5.2.2: rider delivery status updates ----
orderRoutes.post('/:id/dispatch', ...only('rider'), orderController.dispatch);
orderRoutes.post('/:id/deliver', ...only('rider'), orderController.deliver);
orderRoutes.post('/:id/fail', ...only('rider'), orderController.fail);

export default orderRoutes;
