import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import * as userModel from '../models/userModel.js';
import * as pendingModel from '../models/pendingRegistrationModel.js';
import { sendRegistrationOtp } from '../utils/email.js';
import { HttpError } from '../utils/httpError.js';
import { builtInStaff } from '../utils/builtInStaff.js';

const MAX_OTP_ATTEMPTS = 5;

const clean = (value) => String(value || '').trim();
const normalizeEmail = (value) => clean(value).toLowerCase();

const makeToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

const customerToken = (user) => {
    return makeToken({ id: user.id, name: user.full_name, role: user.role });
}

// Compares secrets without leaking their length or timing.
const safeEqual = (a, b) => {
    const x = crypto.createHash('sha256').update(String(a)).digest();
    const y = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(x, y);
}

// Step 1: create a pending registration and email a one-time code.
export const requestRegistrationOtp = async (body) => {
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const name = `${firstName} ${lastName}`.trim();
    const email = normalizeEmail(body.email);
    const phone = clean(body.phone);
    const barangayStreet = clean(body.barangayStreet);
    const city = clean(body.city);
    const province = clean(body.province);
    const address = [barangayStreet, city, province].filter(Boolean).join(', ');
    const password = String(body.password || '');

    if (!firstName || !lastName) {
        throw new HttpError(400, 'First name and last name are required.');
    }
    if (!email || !phone || !password) {
        throw new HttpError(400, 'Email, contact number, and password are required.');
    }
    if (!/^\d{11}$/.test(phone)) {
        throw new HttpError(400, 'Contact number must be exactly 11 digits.');
    }
    if (!barangayStreet || !city || !province) {
        throw new HttpError(400, 'Barangay/street, city/municipality, and province are required.');
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw new HttpError(400, 'Enter a valid email address.');
    }
    if (password.length < 8) {
        throw new HttpError(400, 'Password must be at least 8 characters.');
    }
    if (await userModel.findByEmail(email)) {
        throw new HttpError(409, 'That email is already registered.');
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const expiresMinutes = Math.max(1, Number(process.env.OTP_EXPIRES_MINUTES || 5));

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const otpSalt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, otpSalt);

    await pendingModel.upsert({
        email,
        fullName: name,
        phone,
        address,
        passwordHash,
        otpHash,
        expiresMinutes
    });

    try {
        await sendRegistrationOtp(email, name, otp);
    } catch (emailError) {
        await pendingModel.remove(email);
        throw new HttpError(503, emailError.message);
    }

    return {
        message: 'A verification code has been sent to your email. It expires in a few minutes.',
        expiresInMinutes: expiresMinutes
    };
}

// Step 2: only a correct, unexpired code creates the customer account.
export const verifyRegistrationOtp = async (body) => {
    const email = normalizeEmail(body.email);
    const otp = clean(body.otp);

    if (!email || !/^\d{6}$/.test(otp)) {
        throw new HttpError(400, 'Enter the 6-digit code sent to your email.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const pending = await pendingModel.findForUpdate(email, connection);

        if (!pending) {
            await connection.rollback();
            throw new HttpError(400, 'No pending registration was found. Please request a new code.');
        }

        if (pending.is_expired) {
            await pendingModel.remove(email, connection);
            await connection.commit();
            throw new HttpError(400, 'The code has expired. Please register again to receive a new code.');
        }

        if (pending.attempts >= MAX_OTP_ATTEMPTS) {
            await connection.rollback();
            throw new HttpError(429, 'Too many incorrect attempts. Tap "Resend code" to get a new one.');
        }

        if (!(await bcrypt.compare(otp, pending.otp_hash))) {
            await pendingModel.addAttempt(email, connection);
            await connection.commit();
            const left = Math.max(0, MAX_OTP_ATTEMPTS - (pending.attempts + 1));
            throw new HttpError(400, left
                ? `Incorrect verification code. ${left} attempt${left === 1 ? '' : 's'} left.`
                : 'Incorrect verification code. Too many attempts, tap "Resend code" to get a new one.'
            );
        }

        const id = await userModel.insertCustomer({
            fullName: pending.full_name,
            email: pending.email,
            phone: pending.phone,
            address: pending.address,
            passwordHash: pending.password_hash
        }, connection);

        await pendingModel.remove(email, connection);
        await connection.commit();

        const user = { id, full_name: pending.full_name, role: 'customer' };

        return {
            message: 'Email verified. Your account has been created.',
            token: customerToken(user),
            user: { id, name: user.full_name, email, role: 'customer', phone: pending.phone, address: pending.address }
        };

    } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
    } finally {
        connection.release();
    }
}
/*======1.0 Rennier =======*/
export const loginCustomer = async (body) => {
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    const user = await userModel.findCustomerByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new HttpError(401, 'Incorrect email or password.');
    }

    if (!user.is_verified) {
        throw new HttpError(403, 'Please verify your email before logging in.');
    }

    return {
        message: 'Login successful.',
        token: customerToken(user),
        user: { id: user.id, name: user.full_name, email: user.email, role: user.role, phone: user.phone, address: user.address }
    };
}

// Admin credentials live only in backend/.env (never in frontend code).
export const loginAdmin = (body) => {
    const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        throw new HttpError(503, 'Admin login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env.');
    }

    const userOk = safeEqual(clean(body.username).toLowerCase(), ADMIN_USERNAME.toLowerCase());
    const passOk = safeEqual(String(body.password || ''), ADMIN_PASSWORD);

    if (!userOk || !passOk) {
        throw new HttpError(401, 'Incorrect username or password.');
    }

    return {
        message: 'Login successful.',
        token: makeToken({ id: 0, name: 'Admin', role: 'admin' }),
        user: { id: 0, name: 'Admin', username: ADMIN_USERNAME, role: 'admin' }
    };
}

// Cashier and Kitchen screens open without a login if REQUIRE_STATION_LOGIN is not set.
export const openStation = async (role) => {
    if (String(process.env.REQUIRE_STATION_LOGIN || '').toLowerCase() === 'true') {
        throw new HttpError(403, 'Please log in.');
    }

    const station = builtInStaff().find((s) => s.role === role);

    if (!station) {
        throw new HttpError(404, 'Unknown station.');
    }

    const user = await userModel.findStaffByUsername(station.username);

    if (!user || user.role !== role) {
        throw new HttpError(503, 'The built-in account is not ready yet. Restart the server.');
    }

    return {
        token: customerToken(user),
        user: { id: user.id, name: user.full_name, username: user.username, role: user.role }
    };
}

// Staff accounts stored in MySQL (rider/cashier/kitchen).
export const loginStaff = async (body) => {
    const username = clean(body.username).toLowerCase();
    const password = String(body.password || '');

    const user = await userModel.findStaffByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new HttpError(401, 'Incorrect username or password.');
    }

    return {
        message: 'Login successful.',
        token: customerToken(user),
        user: { id: user.id, name: user.full_name, username: user.username, role: user.role }
    };
}
