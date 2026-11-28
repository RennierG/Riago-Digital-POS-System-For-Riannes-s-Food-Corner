import pool from '../config/db.js';
import * as orderModel from '../models/orderModel.js';
import * as menuModel from '../models/menuModel.js';
import * as userModel from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import { clean, toId, toPhone, toWholeNumber } from '../utils/validate.js';

const pad = (n, size) => String(n).padStart(size, '0');
const money = (n) => Math.round(n * 100) / 100;

const transaction = async (fn) => {
    const db = await pool.getConnection();
    try {
        await db.beginTransaction();
        const result = await fn(db);
        await db.commit();
        return result;
    } catch (e) {
        await db.rollback();
        throw e;
    } finally {
        db.release();
    }
}

const readLines = async (rawItems, db, { reduce }) => {
    if (!Array.isArray(rawItems) || !rawItems.length) throw new HttpError(400, 'Add at least one item to the order.');
    const wanted = new Map();
    for (const line of rawItems) {
        const id = toId(line.menu_item_id, 'menu item');
        const qty = toWholeNumber(line.quantity, 'Quantity', { min: 1, max: 99 });
        wanted.set(id, (wanted.get(id) || 0) + qty);
    }
    const lines = [];
    for (const [id, quantity] of [...wanted].sort((a, b) => a[0] - b[0])) {
        const item = await menuModel.findForUpdate(id, db);
        if (!item || item.is_archived) throw new HttpError(400, 'One of the items is no longer on the menu.');
        if (!item.is_available) throw new HttpError(400, `${item.name} is currently unavailable.`);
        if (item.stock < quantity) throw new HttpError(400, `Not enough stock for ${item.name} (only ${item.stock} left).`);
        if (reduce) await menuModel.reduceStock(id, quantity, db);
        lines.push({ menuItemId: id, name: item.name, price: Number(item.price), quantity });
    }
    return lines;
}

const saveOrder = async (db, header, lines, prefix, padSize) => {
    const total = money(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
    const id = await orderModel.insertOrder({ ...header, total }, db);
    await orderModel.setOrderNumber(id, `${prefix}${pad(id, padSize)}`, db);
    for (const l of lines) await orderModel.insertItem({ orderId: id, ...l }, db);
    return { id, total };
}

const fetchOne = async (id) => {
    const all = await orderModel.fetchAll();
    return all.find((o) => o.id === id);
}

export const fetchForStaff = async (user) => {
    const rows = await orderModel.fetchAll({ riderId: null });
    return rows;
}

// ---- Task 3.1.1: counter (walk-in) orders ----
export const createCounter = async (body) => {
    const customerName = clean(body.customer_name) || 'Walk-in Customer';
    const id = await transaction(async (db) => {
        const lines = await readLines(body.items, db, { reduce: true });
        const total = money(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
        const received = Number(body.amount_received);
        if (!Number.isFinite(received) || received < total) throw new HttpError(400, 'Amount received must cover the total.');
        const saved = await saveOrder(db, {
            orderType: 'counter', customerId: null, customerName,
            customerPhone: null, address: null,
            amountReceived: money(received), changeAmount: money(received - total),
            status: 'in_process', kitchenStatus: 'new'
        }, lines, 'C-', 4);
        return saved.id;
    });
    return fetchOne(id);
}
