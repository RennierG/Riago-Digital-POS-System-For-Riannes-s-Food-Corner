import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import HeaderContainer from '../components/HeaderContainer.jsx'

const KitchenPage = () => {
    const { api, refresh, run, orders, money } = useApp()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        refresh('kitchen').then(() => setLoading(false)).catch((e) => { setError(e.message); setLoading(false) })
    }, [])

    useEffect(() => {
        const tick = () => refresh('kitchen').catch(() => {})
        const id = setInterval(tick, 5000)
        const onFocus = () => tick()
        window.addEventListener('focus', onFocus)
        return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
    }, [refresh])

    const inProc = orders.filter((o) => o.status === 'Order in Process' && o.prep !== 'Completed')

    const cols = {
        New: inProc.filter((o) => (o.prep || 'New') === 'New').sort((a, b) => new Date(a.created) - new Date(b.created)),
        Preparing: inProc.filter((o) => o.prep === 'Preparing').sort((a, b) => new Date(a.created) - new Date(b.created)),
        Ready: inProc.filter((o) => o.prep === 'Ready').sort((a, b) => new Date(a.created) - new Date(b.created))
    }

    const Ticket = ({ o, children, note = '' }) => {
        const mins = Math.max(0, Math.round((Date.now() - new Date(o.created).getTime()) / 60000))
        const late = mins >= 20 && o.prep !== 'Ready'
        return (
            <article className={`kt-ticket${late ? ' late' : ''}`}>
                <div className="kt-top">
                    <b>{o.number}</b>
                    <span className={`cx-type ${o.type === 'Online' ? 'on' : 'co'}`}>{o.type}</span>
                    <span className={`kt-age${late ? ' late' : ''}`}>⏱ {mins} min</span>
                </div>
                <ul className="kt-items">
                    {(o.items || []).map((i, idx) => <li key={idx}><b>{i.qty}×</b> {i.name}</li>)}
                </ul>
                {o.customer && o.type === 'Counter' && (
                    <p className="kt-table">🪑 {o.customer}</p>
                )}
                {note && <p className="kt-note">{note}</p>}
                {children && <div className="kt-actions">{children}</div>}
            </article>
        )
    }

    if (loading) return <div className="empty-state">Loading...</div>
    if (error) return <div className="empty-state">Could not load data: {error}</div>

    return (
        <>
            <HeaderContainer subtitle="| Kitchen Staff" showLogout={false} />
            <main className="pg">
                <div></div>
                <div className="kt-head">
                    <div>
                        <h1>Kitchen</h1>
                        <p>Start each order, then mark it ready for the cashier or rider.</p>
                    </div>
                    <span className="kt-total">{inProc.length} active order{inProc.length === 1 ? '' : 's'}</span>
                </div>

                <div className="kt-board">
                    {/* New */}
                    <section className="kt-col new">
                        <header className="kt-colhead"><h2>New orders</h2><b>{cols.New.length}</b></header>
                        {cols.New.length > 0 ? cols.New.map((o) => (
                            <Ticket key={o.id} o={o}>
                                <button className="primary-btn small-btn" onClick={() => run(() => api.patch(`/orders/${o.id}/kitchen`, { status: 'preparing' }), 'kitchen')}>
                                    Start preparing
                                </button>
                            </Ticket>
                        )) : <div className="kt-empty">No new orders. Time to take a breather! ☕</div>}
                    </section>

                    {/* Preparing */}
                    <section className="kt-col prep">
                        <header className="kt-colhead"><h2>Preparing</h2><b>{cols.Preparing.length}</b></header>
                        {cols.Preparing.length > 0 ? cols.Preparing.map((o) => (
                            <Ticket key={o.id} o={o}>
                                <button className="success-btn small-btn" onClick={() => run(() => api.patch(`/orders/${o.id}/kitchen`, { status: 'ready' }), 'kitchen')}>Mark as ready</button>
                            </Ticket>
                        )) : <div className="kt-empty">Nothing is being prepared.</div>}
                    </section>

                    {/* Ready */}
                    <section className="kt-col done">
                        <header className="kt-colhead"><h2>Ready</h2><b>{cols.Ready.length}</b></header>
                        {cols.Ready.length > 0 ? cols.Ready.map((o) => (
                            <Ticket key={o.id} o={o} note={o.type === 'Online' ? (o.rider ? `🛵 Rider: ${o.rider}` : 'Waiting for rider') : 'Waiting at the counter'} />
                        )) : <div className="kt-empty">No ready orders yet.</div>}
                    </section>
                </div>
            </main>
        </>
    )
}

export default KitchenPage
