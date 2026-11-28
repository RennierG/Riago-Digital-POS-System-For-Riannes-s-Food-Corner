import pool from '../config/db.js';
import * as orderModel from '../models/orderModel.js';
import * as menuModel from '../models/menuModel.js';
import * as userModel from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import { clean, toId, toPhone, toWholeNumber } from '../utils/validate.js';

const pad = (n, size) => String(n).padStart(size, '0');
const money = (n) => Math.round(n * 100) / 100;


// Runs fn inside a transaction; commits on success, rolls back on any error.
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

// Reads {menu_item_id, quantity} lines, merges duplicates and validates against the menu.
const readLines = async (rawItems, db, { reduce }) => {
    if (!Array.isArray(rawItems) || !rawItems.length) {
        throw new HttpError(400, 'Add at least one item to the order.');
    }

    const wanted = new Map();

    for (const line of rawItems) {
        const id = toId(line.menu_item_id, 'menu item');
        const qty = toWholeNumber(line.quantity, 'Quantity', { min: 1, max: 99 });
        wanted.set(id, (wanted.get(id) || 0) + qty);
    }

    const lines = [];

    for (const [id, quantity] of [...wanted].sort((a, b) => a[0] - b[0])) { // sorted → no deadlocks
        const item = await menuModel.findForUpdate(id, db);

        if (!item || item.is_archived) {
            throw new HttpError(400, 'One of the items is no longer on the menu.');
        }
        if (!item.is_available) {
            throw new HttpError(400, `${item.name} is currently unavailable.`);
        }
        if (item.stock < quantity) {
            throw new HttpError(400, `Not enough stock for ${item.name} (only ${item.stock} left).`);
        }
        if (reduce) {
            await menuModel.reduceStock(id, quantity, db);
        }

        lines.push({ menuItemId: id, name: item.name, price: Number(item.price), quantity });
    }

    return lines;
}

const saveOrder = async (db, header, lines, prefix, padSize) => {
    const total = money(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
    const id = await orderModel.insertOrder({ ...header, total }, db);
    await orderModel.setOrderNumber(id, `${prefix}${pad(id, padSize)}`, db);
    for (const l of lines) {
        await orderModel.insertItem({ orderId: id, ...l }, db);
    }
    return { id, total };
}

const fetchOne = async (id) => {
    const all = await orderModel.fetchAll();
    return all.find((o) => o.id === id);
}

// ---- Customer: place an online order (stock is checked now, reduced when the cashier accepts)
export const createOnline = async (user, body) => {
    const customerName = clean(body.customer_name);
    const address = clean(body.delivery_address);

    if (!customerName) {
        throw new HttpError(400, 'Name is required.');
    }
    if (!address) {
        throw new HttpError(400, 'Delivery address is required.');
    }

    const phone = toPhone(body.customer_phone);

    const id = await transaction(async (db) => {
        const lines = await readLines(body.items, db, { reduce: false });
        const saved = await saveOrder(db, {
            orderType: 'online',
            customerId: user.id,
            customerName,
            customerPhone: phone,
            address,
            amountReceived: null,
            changeAmount: null,
            status: 'placed',
            kitchenStatus: 'new'
        }, lines, 'ON-', 6);
        return saved.id;
    });

    return fetchOne(id);
}

// ---- Cashier: walk-in order paid at the counter (stock reduced immediately, goes to kitchen)
export const createCounter = async (body) => {
    const customerName = clean(body.customer_name) || 'Walk-in Customer';

    const id = await transaction(async (db) => {
        const lines = await readLines(body.items, db, { reduce: true });
        const total = money(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
        const received = Number(body.amount_received);

        if (!Number.isFinite(received) || received < total) {
            throw new HttpError(400, 'Amount received must cover the total.');
        }

        const saved = await saveOrder(db, {
            orderType: 'counter',
            customerId: null,
            customerName,
            customerPhone: null,
            address: null,
            amountReceived: money(received),
            changeAmount: money(received - total),
            status: 'in_process',
            kitchenStatus: 'new'
        }, lines, 'C-', 4);

        return saved.id;
    });

    return fetchOne(id);
}

export const fetchMine = (user) => {
    return orderModel.fetchByCustomer(user.id);
}

export const fetchForStaff = async (user) => {
    const rows = await orderModel.fetchAll({ riderId: user.role === 'rider' ? user.id : null });

    if (user.role !== 'kitchen') return rows;

    // The kitchen only needs to cook: hide online customer details for privacy.
    // But keep counter order customer_name (table number) so kitchen knows where to deliver.
    return rows.map((o) => ({
        ...o,
        customer_id: null,
        customer_name: o.order_type === 'counter' ? o.customer_name : null,
        customer_phone: null,
        delivery_address: null,
        amount_received: null,
        change_amount: null
    }))
}

// Locks the order, checks the current state, then applies the change.
const transition = async (orderId, { orderType, status, kitchen, riderOnly }, user, apply) => {
    const id = toId(orderId, 'order');

    await transaction(async (db) => {
        const order = await orderModel.findForUpdate(id, db);

        if (!order) {
            throw new HttpError(404, 'Order not found.');
        }
        if (orderType && order.order_type !== orderType) {
            throw new HttpError(409, `This action is only for ${orderType} orders.`);
        }
        if (status && !status.includes(order.status)) {
            throw new HttpError(409, 'This order is no longer in the right state for that action.');
        }
        if (kitchen && !kitchen.includes(order.kitchen_status)) {
            throw new HttpError(409, 'The kitchen has not finished this order yet.');
        }
        if (riderOnly && order.rider_id !== user.id) {
            throw new HttpError(403, 'This order is not assigned to you.');
        }

        await apply(db, order);
    });

    return fetchOne(id);
}

// Cashier accepts an online order: stock is reduced now.
export const accept = (id, user) => {
    return transition(id, { orderType: 'online', status: ['placed'] }, user, async (db, order) => {
        const items = await orderModel.fetchItemsOf(order.id, db);
        await readLines(
            items.filter((i) => i.menu_item_id).map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
            db,
            { reduce: true }
        );
        await orderModel.updateFields(order.id, { status: 'in_process', kitchen_status: 'new' }, db);
    });
}

export const reject = (id, user) => {
    return transition(id, { status: ['placed'] }, user, (db, order) =>
        orderModel.updateFields(order.id, { status: 'rejected' }, db)
    );
}

export const setKitchen = (id, next, user) => {
    if (!['preparing', 'ready'].includes(next)) {
        throw new HttpError(400, 'Kitchen status must be preparing or ready.');
    }
    return transition(
        id,
        {
            status: ['in_process'],
            kitchen: next === 'preparing' ? ['new'] : ['new', 'preparing']
        },
        user,
        (db, order) => orderModel.updateFields(order.id, { kitchen_status: next }, db)
    );
}

export const assignRider = async (id, riderId, user) => {
    const rider = toId(riderId, 'rider');

    if (!(await userModel.riderExists(rider))) {
        throw new HttpError(404, 'Rider not found.');
    }

    return transition(id, { orderType: 'online', status: ['in_process'], kitchen: ['ready'] }, user, async (db, order) => {
        if (order.rider_id) {
            throw new HttpError(409, 'A rider is already assigned to this order.');
        }
        await orderModel.updateFields(order.id, { rider_id: rider }, db);
    });
}

// Counter order handed to the customer.
export const release = (id, user) => {
    return transition(id, { orderType: 'counter', status: ['in_process'], kitchen: ['ready'] }, user,
        (db, order) => orderModel.updateFields(order.id, { status: 'complete', kitchen_status: 'completed' }, db)
    );
}

export const dispatch = (id, user) => {
    return transition(id, { orderType: 'online', status: ['in_process'], kitchen: ['ready'], riderOnly: true }, user,
        (db, order) => orderModel.updateFields(order.id, { status: 'out_for_delivery' }, db)
    );
}

export const deliver = (id, user) => {
    return transition(id, { status: ['out_for_delivery'], riderOnly: true }, user,
        (db, order) => orderModel.updateFields(order.id, { status: 'complete', kitchen_status: 'completed' }, db)
    );
}

export const fail = (id, user) => {
    return transition(id, { status: ['out_for_delivery'], riderOnly: true }, user,
        (db, order) => orderModel.updateFields(order.id, { status: 'failed' }, db)
    );
}

