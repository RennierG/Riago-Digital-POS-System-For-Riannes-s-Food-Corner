import * as orderService from '../services/orderService.js';

export const listAll = async (req, res) => {
    try { const result = await orderService.fetchForStaff(req.user); res.status(200).json({ success: true, message: result }); }
    catch (e) { console.log(e); res.status(e.statusCode || 500).json({ error: `${e.message || 'Internal Server Error'}` }); }
}

export const createCounter = async (req, res) => {
    try { const result = await orderService.createCounter(req.body); res.status(201).json({ success: true, message: result }); }
    catch (e) { console.log(e); res.status(e.statusCode || 500).json({ error: `${e.message || 'Internal Server Error'}` }); }
}

// ---- Task 3.1.2: release counter orders ----
export const release = async (req, res) => {
    try { const result = await orderService.release(req.params.id, req.user); res.status(200).json({ success: true, message: result }); }
    catch (e) { console.log(e); res.status(e.statusCode || 500).json({ error: `${e.message || 'Internal Server Error'}` }); }
}
