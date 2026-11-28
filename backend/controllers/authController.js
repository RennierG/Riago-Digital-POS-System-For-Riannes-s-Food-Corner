import * as authService from '../services/authService.js';

export const requestOtp = async (req, res) => {
    try {
        const result = await authService.requestRegistrationOtp(req.body);
        res.status(200).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const result = await authService.verifyRegistrationOtp(req.body);
        res.status(201).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}
/*=======1.0 Rennier =======*/
export const loginCustomer = async (req, res) => {
    try {
        const result = await authService.loginCustomer(req.body);
        res.status(200).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}

export const loginAdmin = async (req, res) => {
    try {
        const result = authService.loginAdmin(req.body);
        res.status(200).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}

export const openStation = async (req, res) => {
    try {
        const result = await authService.openStation(req.params.role);
        res.status(200).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}

export const loginStaff = async (req, res) => {
    try {
        const result = await authService.loginStaff(req.body);
        res.status(200).json({
            success: true,
            message: result
        });
    } catch (e) {
        console.log(e);
        res.status(e.statusCode || 500).json({
            error: `${e.message || 'Internal Server Error'}`
        });
    }
}

// Lets the frontend confirm a stored token is still valid.
export const me = (req, res) => {
    res.status(200).json({
        success: true,
        message: { user: req.user }
    });
}
