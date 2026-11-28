import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import HeaderContainer from '../components/HeaderContainer.jsx'
import OrderCard from '../components/OrderCard.jsx'
import StatCard from '../components/StatCard.jsx'

const RiderPage = () => {
    const { session } = useAuth()
    const { api, refresh, run, orders, money } = useApp()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        refresh('rider').then(() => setLoading(false)).catch((e) => { setError(e.message); setLoading(false) })
    }, [])

    useEffect(() => {
        const tick = () => refresh('rider').catch(() => {})
        const id = setInterval(tick, 5000)
        const onFocus = () => tick()
        window.addEventListener('focus', onFocus)
        return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
    }, [refresh])

    const me = session || {}

    const assigned = orders.filter((o) =>
        o.type === 'Online' &&
        o.riderId === me.id &&
        ['Order in Process', 'Out for Delivery'].includes(o.status) &&
        o.prep === 'Ready'
    )

    const history = orders.filter((o) =>
        o.riderId === me.id &&
        ['Order Complete', 'Failed'].includes(o.status)
    ).slice().reverse()

    if (loading) return <div className="empty-state">Loading...</div>
    if (error) return <div className="empty-state">Could not load data: {error}</div>

    return (
        <>
            <HeaderContainer subtitle="| Delivery Rider" />
            <main className="pg">
                <div className="dashboard-heading">
                    <div>
                        <span className="eyebrow">DELIVERY OPERATIONS</span>
                        <h1>Delivery workspace</h1>
                        <p>Hi {me.name || 'Rider'}! View your assigned orders and keep delivery statuses up to date.</p>
                    </div>
                    <span className="role-chip">Rider</span>
                </div>

                <div className="stats-grid">
                    <StatCard label="Assigned to you" value={assigned.length} />
                    <StatCard label="Out for delivery" value={assigned.filter((o) => o.status === 'Out for Delivery').length} />
                    <StatCard label="Delivered" value={history.filter((o) => o.status === 'Order Complete').length} />
                    <StatCard label="Failed deliveries" value={history.filter((o) => o.status === 'Failed').length} />
                </div>

                <div className="section-heading">
                    <div>
                        <span className="eyebrow">YOUR DELIVERY QUEUE</span>
                        <h2>Assigned deliveries</h2>
                    </div>
                </div>

                <div className="order-list">
                    {assigned.length > 0 ? assigned.map((o) => (
                        <OrderCard key={o.id} order={o} actions={
                            <div className="actions">
                                {o.status === 'Order in Process' && (
                                    <button className="primary-btn small-btn" onClick={() => run(() => api.post(`/orders/${o.id}/dispatch`), 'rider')}>
                                        Start delivery
                                    </button>
                                )}
                                {o.status === 'Out for Delivery' && (
                                    <>
                                        <button className="success-btn small-btn" onClick={() => run(() => api.post(`/orders/${o.id}/deliver`), 'rider')}>
                                            Mark delivered · COD received
                                        </button>
                                        <button className="danger-btn small-btn" onClick={() => run(() => api.post(`/orders/${o.id}/fail`), 'rider')}>
                                            Delivery failed
                                        </button>
                                    </>
                                )}
                            </div>
                        } />
                    )) : (
                        <div className="empty-state">No assigned deliveries yet. Orders appear here after Kitchen marks them ready and Cashier assigns a rider. 🛵</div>
                    )}
                </div>

                <div className="section-heading spaced">
                    <div>
                        <span className="eyebrow">PAST DELIVERIES</span>
                        <h2>Delivery history</h2>
                    </div>
                </div>

                <div className="order-list">
                    {history.length > 0 ? history.map((o) => (
                        <OrderCard key={o.id} order={o} />
                    )) : (
                        <div className="empty-state compact">No delivery history yet.</div>
                    )}
                </div>
            </main>
        </>
    )
}

export default RiderPage
