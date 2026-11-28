import pool from '../config/db.js';
import * as orderModel from '../models/orderModel.js';
import * as menuModel from '../models/menuModel.js';
import * as userModel from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import { clean, toId, toPhone, toWholeNumber } from '../utils/validate.js';

// ---- Task 2.3.1: fetch all orders for admin sales dashboard ----
export const fetchForStaff = async (user) => {
    const rows = await orderModel.fetchAll({ riderId: null });
    return rows;
}
