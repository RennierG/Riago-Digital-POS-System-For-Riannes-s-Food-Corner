import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import HeaderContainer from '../components/HeaderContainer.jsx'

const CUSTOMER_LABEL = {
    'Order Placed': 'Order Placed',
    'Order in Process': 'Processing',
    'Out for Delivery': 'Out for Delivery',
    'Order Complete': 'Delivered'
}

const CustomerPage = () => {
    const { session } = useAuth()
    const { api, refresh, menu, orders, money, picUrl, hasPic, statusClass } = useApp()

    const [cart, setCart] = useState({})
    const [activeCategory, setActiveCategory] = useState('All')
    const [custName, setCustName] = useState(session?.name || '')
    const [address, setAddress] = useState(session?.address || '')
    const [contact, setContact] = useState(session?.phone || '')
    const [checkoutMsg, setCheckoutMsg] = useState({ text: '', type: '' })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        refresh('customer')
            .then(() => setLoading(false))
            .catch((e) => { setError(e.message); setLoading(false) })
    }, [refresh])

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const tick = () => refresh('customer').catch(() => {})
        const id = setInterval(tick, 5000)
        const onFocus = () => tick()
        window.addEventListener('focus', onFocus)
        return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
    }, [refresh])

    const availableMenu = menu.filter((m) => m.available && m.stock > 0)

    const categories = (() => {
        const base = ['Korean', 'Rice Meals', 'Noodles']
        const extra = [...new Set(availableMenu.map((m) => m.category).filter((c) => c && !base.includes(c)))].sort()
        return ['All', ...base, ...extra]
    })()

    const filteredMenu = availableMenu.filter((m) => activeCategory === 'All' || m.category === activeCategory)

    const addToCart = (item) => {
        setCart((prev) => ({ ...prev, [item.id]: Math.min((prev[item.id] || 0) + 1, item.stock) }))
    }

    const updateQty = (id, delta) => {
        setCart((prev) => {
            const next = Math.max(0, (prev[id] || 0) + delta)
            return { ...prev, [id]: next }
        })
    }

    const cartLines = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ m: menu.find((x) => x.id == id), q }))
        .filter((x) => x.m)

    const cartTotal = cartLines.reduce((s, x) => s + x.m.price * x.q, 0)
    const cartCount = cartLines.reduce((s, x) => s + x.q, 0)

    const [placing, setPlacing] = useState(false)

    const handlePlaceOrder = async () => {
        if (placing) return
        const items = cartLines.map((x) => ({ menu_item_id: x.m.id, quantity: x.q }))
        if (!items.length || !custName || !address || !contact) {
            return setCheckoutMsg({ text: 'Please add items and complete all customer details.', type: 'error' })
        }
        if (!/^\d{11}$/.test(contact)) {
            return setCheckoutMsg({ text: 'Contact number must be exactly 11 digits.', type: 'error' })
        }
        setPlacing(true)
        try {
            const order = await api.post('/orders', { customer_name: custName, delivery_address: address, customer_phone: contact, items })
            await refresh('customer')
            setCart({})
            setCheckoutMsg({ text: `Order placed! Your order number is ${order.order_number}. Scroll down to track your order.`, type: 'success' })
            setTimeout(() => document.getElementById('ordersSection')?.scrollIntoView({ behavior: 'smooth' }), 300)
        } catch (e) {
            setCheckoutMsg({ text: e.message, type: 'error' })
            await refresh('customer').catch(() => {})
        } finally {
            setPlacing(false)
        }
    }

    const myOrders = orders.filter((o) => o.type === 'Online' && o.customerId === session?.id).slice(0, 5)

    if (loading) return <div className="empty-state">Loading...</div>
    if (error) return <div className="empty-state">Could not load data: {error}</div>

    return (
        <>
            <HeaderContainer subtitle="Rianne's Food Corner">
                <nav className="top-nav" aria-label="Main navigation">
                    <a href="#menuSection">Menu</a>
                    <a href="#ordersSection">My Orders</a>
                    <button type="button" className="cart-pill" onClick={() => document.querySelector('.cart-panel')?.scrollIntoView({ behavior: 'smooth' })}>
                        🛒 Cart
                    </button>
                </nav>
            </HeaderContainer>

            <main className="pg">
                {/* Hero */}
                <section className="shop-hero">
                    <div className="hero-copy">
                        <span className="hero-kicker">ANNYEONG! WELCOME TO RIAGO</span>
                        <h1>Cravings?<br /><em>We got you.</em></h1>
                        <p>Your Korean food favorites, freshly prepared and delivered right to your door.</p>
                        <a className="hero-cta" href="#menuSection">Explore the menu <span>→</span></a>
                        <div className="hero-points"><span>♡ Made with care</span><span>✦ Freshly prepared</span></div>
                    </div>
                    <div className="hero-art">
                        <div className="hero-orbit"></div>
                        <div className="hero-food">🍜</div>
                        <div className="hero-sticker">K-FOOD<br /><b>LOVE!</b></div>
                    </div>
                </section>

                {/* Menu intro */}
                <div className="shop-intro" id="menuSection">
                    <div>
                        <span className="eyebrow">THE RIAGO MENU</span>
                        <h2>Find your new favorite</h2>
                        <p>Good food, good mood. Pick your cravings below.</p>
                    </div>
                    <div className="menu-count">{availableMenu.length} menu items available</div>
                </div>

                {/* Category tabs */}
                <div className="category-tabs">
                    {categories.map((c) => (
                        <button
                            key={c}
                            className={`category-tab${c === activeCategory ? ' active' : ''}`}
                            onClick={() => setActiveCategory(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Shop layout */}
                <div className="shop-layout">
                    <section>
                        <div className="product-grid">
                            {filteredMenu.length > 0 ? filteredMenu.map((m) => (
                                <article key={m.id} className="product-card">
                                    <div className={`product-visual ${m.tone || 'pink'}`}>
                                        <span className="product-category">{m.category}</span>
                                        {m.image
                                            ? <img className="product-img" src={picUrl(m)} alt={m.name} loading="lazy" />
                                            : <span className="product-emoji">{m.emoji || '🍽️'}</span>
                                        }
                                        <span className="product-spark">✦</span>
                                    </div>
                                    <div className="product-info">
                                        <h3>{m.name}</h3>
                                        <p>{m.desc || 'A delicious RiaGo favorite.'}</p>
                                        <div className="product-bottom">
                                            <b>{money(m.price)}</b>
                                            <button className="add-btn" onClick={() => addToCart(m)} aria-label={`Add ${m.name} to cart`}>+</button>
                                        </div>
                                    </div>
                                </article>
                            )) : (
                                <div className="empty-state">No available items in this category right now.</div>
                            )}
                        </div>
                    </section>

                    {/* Cart */}
                    <aside className="cart-panel">
                        <div className="cart-heading">
                            <div>
                                <span className="eyebrow">YOUR SELECTION</span>
                                <h2>My cart <span className="cart-count">{cartCount}</span></h2>
                            </div>
                            <span className="cart-bag">🛍️</span>
                        </div>

                        <div className="cart-lines">
                            {checkoutMsg.type === 'success' ? (
                                <div className="cart-empty" style={{ color: '#25845b', gap: 8 }}>
                                    <span>✅</span>
                                    <b>Order placed!</b>
                                    <small>{checkoutMsg.text}</small>
                                </div>
                            ) : cartLines.length > 0 ? cartLines.map(({ m, q }) => (
                                <div key={m.id} className="cart-line">
                                    <span className="cart-line-emoji">
                                        {hasPic(m)
                                            ? <img className="food-thumb" src={picUrl(m)} alt="" />
                                            : (m.emoji || '🍽️')
                                        }
                                    </span>
                                    <div className="cart-line-name">
                                        <b>{m.name}</b>
                                        <small>{money(m.price)} each</small>
                                    </div>
                                    <div className="quantity-control">
                                        <button onClick={() => updateQty(m.id, -1)}>−</button>
                                        <b>{q}</b>
                                        <button onClick={() => updateQty(m.id, 1)} disabled={q >= m.stock}>+</button>
                                    </div>
                                </div>
                            )) : (
                                <div className="cart-empty">
                                    <span>🛒</span>
                                    <b>Your cart is waiting</b>
                                    <small>Add something yummy to get started.</small>
                                </div>
                            )}
                        </div>

                        <div className="cart-total">
                            <span>Subtotal</span>
                            <b>{money(cartTotal)}</b>
                        </div>

                        <div className="checkout-fields">
                            <label>Your name</label>
                            <input type="text" placeholder="Enter your name" value={custName} onChange={(e) => setCustName(e.target.value)} />
                            <label>Delivery address</label>
                            <textarea placeholder="House number, street, barangay..." value={address} onChange={(e) => setAddress(e.target.value)} />
                            <label>Contact number</label>
                            <input type="tel" inputMode="numeric" maxLength={11} placeholder="09XXXXXXXXX" value={contact} onChange={(e) => setContact(e.target.value.replace(/\D/g, '').slice(0, 11))} />
                            <div className="payment-note">
                                <span>💵</span>
                                <div><b>Cash on Delivery</b><small>Pay when your order arrives</small></div>
                            </div>
                            <button className="primary-btn full" onClick={handlePlaceOrder} disabled={placing}>
                                {placing ? 'Placing order...' : 'Place my order →'}
                            </button>
                            {checkoutMsg.type === 'error' && checkoutMsg.text && (
                                <p className="form-message error" aria-live="polite">{checkoutMsg.text}</p>
                            )}
                            <small className="secure-note">♡ Thank you for supporting Rianne's Food Corner</small>
                        </div>
                    </aside>
                </div>

                {/* Recent orders */}
                <section className="tracking-section" id="ordersSection">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">ORDER UPDATES</span>
                            <h2>Your recent orders</h2>
                        </div>
                        <span className="soft-pill">Live tracking</span>
                    </div>
                    {myOrders.length > 0 ? myOrders.map((o) => (
                        <div key={o.id} className="recent-order">
                            <div>
                                <b>{o.number}</b>
                                <small>{new Date(o.created).toLocaleString()} · {(o.items || []).length} item type(s)</small>
                            </div>
                            <div>
                                <span className={`tag ${statusClass(o.status)}`}>{CUSTOMER_LABEL[o.status] || o.status}</span>
                            </div>
                            <b>{money(o.total)}</b>
                        </div>
                    )) : (
                        <div className="empty-state">Your order updates will appear here after checkout.</div>
                    )}
                </section>
            </main>
        </>
    )
}

export default CustomerPage
