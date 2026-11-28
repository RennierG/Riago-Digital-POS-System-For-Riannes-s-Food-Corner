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
    try { await db.beginTransaction(); const result = await fn(db); await db.commit(); return result; }
    catch (e) { await db.rollback(); throw e; } finally { db.release(); }
}

const readLines = async (rawItems, db, { reduce }) => {
    if (!Array.isArray(rawItems) || !rawItems.length) throw new HttpError(400, 'Add at least one item.');
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
        if (item.stock < quantity) throw new HttpError(400, `Not enough stock for ${item.name}.`);
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

const fetchOne = async (id) => { const all = await orderModel.fetchAll(); return all.find((o) => o.id === id); }

const transition = async (orderId, { orderType, status, kitchen, riderOnly }, user, apply) => {
    const id = toId(orderId, 'order');
    await transaction(async (db) => {
        const order = await orderModel.findForUpdate(id, db);
        if (!order) throw new HttpError(404, 'Order not found.');
        if (orderType && order.order_type !== orderType) throw new HttpError(409, `This action is only for ${orderType} orders.`);
        if (status && !status.includes(order.status)) throw new HttpError(409, 'This order is no longer in the right state for that action.');
        if (kitchen && !kitchen.includes(order.kitchen_status)) throw new HttpError(409, 'The kitchen has not finished this order yet.');
        if (riderOnly && order.rider_id !== user.id) throw new HttpError(403, 'This order is not assigned to you.');
        await apply(db, order);
    });
    return fetchOne(id);
}

export const fetchForStaff = async (user) => {
    const rows = await orderModel.fetchAll({ riderId: null });
    if (user.role !== 'kitchen') return rows;
    return rows.map((o) => ({ ...o, customer_id: null, customer_name: o.order_type === 'counter' ? o.customer_name : null, customer_phone: null, delivery_address: null, amount_received: null, change_amount: null }))
}

export const createCounter = async (body) => {
    const customerName = clean(body.customer_name) || 'Walk-in Customer';
    const id = await transaction(async (db) => {
        const lines = await readLines(body.items, db, { reduce: true });
        const total = money(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
        const received = Number(body.amount_received);
        if (!Number.isFinite(received) || received < total) throw new HttpError(400, 'Amount received must cover the total.');
        const saved = await saveOrder(db, { orderType: 'counter', customerId: null, customerName, customerPhone: null, address: null, amountReceived: money(received), changeAmount: money(received - total), status: 'in_process', kitchenStatus: 'new' }, lines, 'C-', 4);
        return saved.id;
    });
    return fetchOne(id);
}

export const release = (id, user) => {
    return transition(id, { orderType: 'counter', status: ['in_process'], kitchen: ['ready'] }, user,
        (db, order) => orderModel.updateFields(order.id, { status: 'complete', kitchen_status: 'completed' }, db)
    );
}

// ---- Task 3.3.1: setKitchen ----
export const setKitchen = (id, next, user) => {
    if (!['preparing', 'ready'].includes(next)) throw new HttpError(400, 'Kitchen status must be preparing or ready.');
    return transition(id, { status: ['in_process'], kitchen: next === 'preparing' ? ['new'] : ['new', 'preparing'] }, user,
        (db, order) => orderModel.updateFields(order.id, { kitchen_status: next }, db)
    );
}
