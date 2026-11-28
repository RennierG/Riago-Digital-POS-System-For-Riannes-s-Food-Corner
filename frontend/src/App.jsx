import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import StaffLoginPage from './pages/StaffLoginPage.jsx'
import CustomerPage from './pages/CustomerPage.jsx'
import CashierPage from './pages/CashierPage.jsx'
import KitchenPage from './pages/KitchenPage.jsx'
import RiderPage from './pages/RiderPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

// Cashier and Kitchen auto-login via /api/auth/station/:role — no manual login needed
const StationRoute = ({ children, role }) => {
    const { session, apiToken, setApiSession, logout } = useAuth()
    const [ready, setReady] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // Already logged in as the correct role — just verify token is still valid
        if (session && session.role === role && apiToken) {
            fetch('/auth/me', { headers: { Authorization: `Bearer ${apiToken}` } })
                .then((r) => { if (r.status === 401) logout() })
                .catch(() => {})
                .finally(() => setReady(true))
            return
        }

        // Auto-request a station token from the backend
        fetch(`/auth/station/${role}`, { method: 'POST' })
            .then((r) => r.ok ? r.json() : Promise.reject(new Error('Station login is disabled. Please log in manually.')))
            .then((payload) => {
                const data = payload.message || payload
                setApiSession(data)
                setReady(true)
            })
            .catch((e) => {
                setError(e.message)
                setReady(true)
            })
    }, [role, session, apiToken, setApiSession, logout])

    if (!ready) return <div className="empty-state" style={{ marginTop: 80 }}>Opening {role} station...</div>
    if (error) return <Navigate to="/staff-login" replace />
    if (!session || session.role !== role) return <Navigate to="/staff-login" replace />
    return children
}
/* ======= 1.0 Rennier ======= */
// Normal protected route — requires manual login
const ProtectedRoute = ({ children, role }) => {
    const { session, apiToken } = useAuth()
    if (!session || session.role !== role || !apiToken) {
        const dest = role === 'customer' ? '/login' : '/staff-login'
        return <Navigate to={dest} replace />
    }
    return children
}
/* ======= 0 Rennier ======= */
const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppProvider>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/staff-login" element={<StaffLoginPage />} />
                        <Route path="/customer" element={
                            <ProtectedRoute role="customer">
                                <CustomerPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/cashier" element={
                            <StationRoute role="cashier">
                                <CashierPage />
                            </StationRoute>
                        } />
                        <Route path="/kitchen" element={
                            <StationRoute role="kitchen">
                                <KitchenPage />
                            </StationRoute>
                        } />
                        <Route path="/rider" element={
                            <ProtectedRoute role="rider">
                                <RiderPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute role="admin">
                                <AdminPage />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </AppProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
