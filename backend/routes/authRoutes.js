import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const authRoutes = express.Router();

const limiter = (limit) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});

// Token check is not a login attempt, so it is not rate limited.
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/station/:role', limiter(120), authController.openStation);
authRoutes.use(limiter(30));
authRoutes.post('/register/request-otp', authController.requestOtp);
authRoutes.post('/register/verify-otp', authController.verifyOtp);
authRoutes.post('/login/customer', authController.loginCustomer);
authRoutes.post('/login/admin', limiter(10), authController.loginAdmin);
authRoutes.post('/login/staff', authController.loginStaff);

export default authRoutes;
