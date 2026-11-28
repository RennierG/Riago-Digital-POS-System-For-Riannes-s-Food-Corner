import * as orderService from '../services/orderService.js';

// ---- Task 2.3.1: admin sales dashboard ----
export const listAll = async (req, res) => {
    try {
        const result = await orderService.fetchForStaff(req.user);
        res.status(200).json({ success: true, message: result });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({ error: `${e.message || 'Internal Server Error'}` });
    }
}
