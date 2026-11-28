import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'

const LoginPage = () => {
    const { session, setApiSession } = useAuth()
    const { api } = useApp()
    const navigate = useNavigate()

    const [view, setView] = useState('login') // 'login' | 'register' | 'otp'
    const [msg, setMsg] = useState({ text: '', type: '' })
    const [verifying, setVerifying] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [pendingEmail, setPendingEmail] = useState('')
    const [pendingReg, setPendingReg] = useState(null)

    // Login fields
    const [loginEmail, setLoginEmail] = useState('')
    const [loginPass, setLoginPass] = useState('')
    const [showLoginPass, setShowLoginPass] = useState(false)

    // Register fields
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [regEmail, setRegEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [barangay, setBarangay] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [regPass, setRegPass] = useState('')
    const [showRegPass, setShowRegPass] = useState(false)

    // OTP
    const [otp, setOtp] = useState('')

    useEffect(() => {
        if (session && session.role === 'customer') navigate('/customer', { replace: true })
    }, [session, navigate])

    const showMessage = (text, type = 'error') => setMsg({ text, type })
    const clear = () => setMsg({ text: '', type: '' })

    const handleLogin = async () => {
        clear()
        try {
            const result = await api.post('/auth/login/customer', { email: loginEmail, password: loginPass })
            setApiSession(result)
            navigate('/customer')
        } catch (e) {
            showMessage(e.message)
        }
    }

    const handleRegister = async () => {
        if (registering) return
        setRegistering(true)
        clear()
        const reg = { firstName, lastName, email: regEmail, phone, barangayStreet: barangay, city, province, password: regPass }
        if (!reg.firstName || !reg.lastName) return showMessage('Please enter your first name and last name.')
        if (!/^\d{11}$/.test(reg.phone)) return showMessage('Contact number must be exactly 11 digits (e.g. 09123456789).')
        if (!reg.barangayStreet || !reg.city || !reg.province) return showMessage('Please complete your address.')
        try {
            const result = await api.post('/auth/register/request-otp', reg)
            setPendingReg(reg)
            setPendingEmail(reg.email)
            showMessage(result.message || 'Verification code sent!', 'success')
            setView('otp')
        } catch (e) {
            showMessage(e.message)
        } finally {
            setRegistering(false)
        }
    }

    const handleVerifyOtp = async () => {
        if (verifying) return
        setVerifying(true)
        clear()
        try {
            const result = await api.post('/auth/register/verify-otp', { email: pendingEmail, otp: otp.trim() })
            setApiSession(result)
            showMessage(result.message || 'Account created!', 'success')
            setTimeout(() => navigate('/customer'), 500)
        } catch (e) {
            showMessage(e.message)
            setVerifying(false)
        }
    }

    const handleResend = async () => {
        if (!pendingReg) return
        clear()
        try {
            const result = await api.post('/auth/register/request-otp', pendingReg)
            setOtp('')
            showMessage((result.message || 'Code sent.') + ' Older codes no longer work.', 'success')
        } catch (e) {
            showMessage(e.message)
        }
    }

    const onKeyDown = (e) => {
        if (e.key !== 'Enter') return
        // If a button or link is focused, let it handle its own click — don't double-fire
        if (document.activeElement && ['BUTTON', 'A'].includes(document.activeElement.tagName)) return
        if (view === 'otp') handleVerifyOtp()
        else if (view === 'login') handleLogin()
        else handleRegister()
    }
/*===================1.0 Rennier =====================*/
    return (
        <div className="auth-wrap" onKeyDown={onKeyDown}>
            <aside className="auth-art photo" role="img" aria-label="RiaGo Korean food illustration"></aside>
            <main className="auth-side">
                <div className="auth-card">

                    {view === 'login' && (
                        <section>
                            <h2>Welcome back!</h2>
                            <p className="sub">Log in to order your favorites.</p>
                            <label>Email</label>
                            <input type="email" placeholder="" autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                            <label>Password</label>
                            <div className="pw-field">
                                <input type={showLoginPass ? 'text' : 'password'} placeholder="" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
                                <button type="button" onClick={() => setShowLoginPass(!showLoginPass)} aria-label="Show password">👁️</button>
                            </div>
                            <button className="primary-btn" onClick={handleLogin}>Log in</button>
                            <p className="auth-switch">New here? <a onClick={() => { setView('register'); clear() }}>Create an account</a></p>
                            <p className="auth-switch">Staff? <Link to="/staff-login">Staff login</Link></p>
                        </section>
                    )}

                    {view === 'register' && (
                        <section>
                            <h2>Create account</h2>
                            <p className="sub">Sign up to start ordering.</p>
                            <div className="two">
                                <div><label>First name</label><input type="text" placeholder="" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                                <div><label>Last name</label><input type="text" placeholder="" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                            </div>
                            <div className="two">
                                <div><label>Email</label><input type="email" placeholder="" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} /></div>
                                <div><label>Contact number</label><input type="tel" inputMode="numeric" maxLength={11} placeholder="" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} /></div>
                            </div>
                            <label>Barangay / Street</label>
                            <input type="text" placeholder="House no., street, barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
                            <div className="two">
                                <div><label>City / Municipality</label><input type="text" placeholder="" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                                <div><label>Province</label><input type="text" placeholder="" value={province} onChange={(e) => setProvince(e.target.value)} /></div>
                            </div>
                            <label>Password</label>
                            <div className="pw-field">
                                <input type={showRegPass ? 'text' : 'password'} placeholder="At least 8 characters" value={regPass} onChange={(e) => setRegPass(e.target.value)} />
                                <button type="button" onClick={() => setShowRegPass(!showRegPass)} aria-label="Show password">👁️</button>
                            </div>
                            <button className="primary-btn" onClick={handleRegister} disabled={registering}>Send verification code</button>
                            <p className="auth-switch">Already have an account? <a onClick={() => { setView('login'); clear() }}>Log in</a></p>
                        </section>
                    )}

                    {view === 'otp' && (
                        <section>
                            <h2>Verify your email</h2>
                            <p className="sub">We sent a 6-digit code to <b>{pendingEmail}</b>.</p>
                            <label>Email verification code</label>
                            <input type="text" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" id="otp-code" />
                            <button className="primary-btn" onClick={handleVerifyOtp} disabled={verifying}>Verify and create account</button>
                            <button className="secondary-btn" type="button" onClick={handleResend}>Resend code</button>
                            <p className="auth-switch"><a onClick={() => { setView('register'); clear() }}>Back to registration</a></p>
                        </section>
                    )}

                    {msg.text && (
                        <p className={`auth-msg ${msg.type}`} role="alert">{msg.text}</p>
                    )}
                </div>
            </main>
        </div>
    )
}

export default LoginPage
