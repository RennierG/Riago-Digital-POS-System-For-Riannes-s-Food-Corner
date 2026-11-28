import pool from '../config/db.js';

export const findByEmail = async (email) => {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
}

export const findCustomerByEmail = async (email) => {
    const [rows] = await pool.execute(
        "SELECT * FROM users WHERE email = ? AND role = 'customer' LIMIT 1",
        [email]
    );
    return rows[0] || null;
}

export const findStaffByUsername = async (username) => {
    const [rows] = await pool.execute(
        "SELECT * FROM users WHERE username = ? AND role IN ('rider','cashier','kitchen','admin') LIMIT 1",
        [username]
    );
    return rows[0] || null;
}

export const findById = async (id) => {
    const [rows] = await pool.execute(
        'SELECT id, full_name, role FROM users WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0] || null;
}

export const riderExists = async (id) => {
    const [rows] = await pool.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'rider'",
        [id]
    );
    return rows.length > 0;
}

export const insertCustomer = async ({ fullName, email, phone, address, passwordHash }, db = pool) => {
    const [result] = await db.execute(
        `INSERT INTO users (full_name, email, phone, address, password_hash, role, is_verified)
         VALUES (?, ?, ?, ?, ?, 'customer', 1)`,
        [fullName, email, phone, address, passwordHash]
    );
    return result.insertId;
}

export const insertStaff = async ({ fullName, username, phone, passwordHash, role }) => {
    const [result] = await pool.execute(
        'INSERT INTO users (full_name, username, phone, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)',
        [fullName, username, phone, passwordHash, role]
    );
    return result.insertId;
}

export const listStaff = async (roles) => {
    const marks = roles.map(() => '?').join(',');
    const [rows] = await pool.execute(
        `SELECT id, full_name, username, phone, role, created_at FROM users WHERE role IN (${marks}) ORDER BY role, full_name`,
        roles
    );
    return rows;
}

export const deleteStaff = async (id) => {
    const [result] = await pool.execute(
        "DELETE FROM users WHERE id = ? AND role = 'rider'",
        [id]
    );
    return result.affectedRows;
}

export const listCustomers = async () => {
    const [rows] = await pool.execute(
        "SELECT id, full_name, email, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC"
    );
    return rows;
}

// --- used inside transactions (db is a connection) ---
export const findByEmailForUpdate = async (email, db) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
}

export const insertCustomerInTransaction = async ({ fullName, email, phone, address, passwordHash }, db) => {
    const [result] = await db.execute(
        `INSERT INTO users (full_name, email, phone, address, password_hash, role, is_verified)
         VALUES (?, ?, ?, ?, ?, 'customer', 1)`,
        [fullName, email, phone, address, passwordHash]
    );
    return result.insertId;
}
