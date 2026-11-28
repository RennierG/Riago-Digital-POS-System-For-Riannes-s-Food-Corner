import { useApp } from '../context/AppContext.jsx'

const OrderCard = ({ order, actions }) => {

    const { money, statusClass } = useApp()

    const o = order

    return (
        <article className="order-card">
            <div className="order-top">
                <div>
                    <span className="eyebrow">{o.type} ORDER</span>
                    <h3>{o.number}</h3>
                </div>
                <span className={`tag ${statusClass(o.status)}`}>{o.status}</span>
            </div>
            <div className="order-meta">{new Date(o.created).toLocaleString()}</div>
            <ul className="order-items">
                {(o.items || []).map((i, idx) => (
                    <li key={idx}>
                        <span>{i.name}</span>
                        <span>× {i.qty}</span>
                        <b>{money(i.price * i.qty)}</b>
                    </li>
                ))}
            </ul>
            <div className="order-total">
                <span>Order total</span>
                <b>{money(o.total)}</b>
            </div>
            {o.type === 'Online' && (
                <div className="customer-details">
                    <b>{o.customer || 'Customer'}</b>
                    <span>{o.address || ''}</span>
                    <span>{o.contact || ''}</span>
                </div>
            )}
            <div className="order-foot">
                <span>Kitchen: <span className={`tag ${statusClass(o.prep || 'New')}`}>{o.prep || 'New'}</span></span>
                {o.rider && <span>Rider: {o.rider}</span>}
            </div>
            {actions && <div className="actions">{actions}</div>}
        </article>
    )
}

export default OrderCard
