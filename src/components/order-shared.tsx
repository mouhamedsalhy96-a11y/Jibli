import { dateLabel, labels, money, productTotal, type Order } from "@/lib/domain";
import { Icon, ItemList, StatusBadge } from "./ui";
export function QuoteBreakdown({ order }: { order: Order }) {
  const quote = order.quote;
  if (!quote) return null;
  const lines = [
    ["Articles", productTotal(order.items, quote.unitPrices)],
    ["Transport international", quote.costs.transport],
    ["Douane / taxes estimées", quote.costs.customs],
    ["Frais de service", quote.costs.service],
    ["Livraison en Tunisie", quote.costs.delivery],
  ] as const;
  return <section className="quote-breakdown"><div className="section-heading"><h3>Votre devis en dinars</h3><span className="version-tag">Version {quote.version}</span></div><dl>{lines.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{money(value)}</dd></div>)}<div className="grand-total"><dt>Total à régler</dt><dd>{money(quote.total)}</dd></div></dl><div className="quote-facts"><p><Icon name="clock" size={16}/>Valable jusqu’au {dateLabel(quote.validUntil)} (UTC)</p><p><Icon name="truck" size={16}/>{quote.minDays} à {quote.maxDays} jours ouvrés estimés après confirmation du paiement</p></div>{quote.note && <p className="quote-note">{quote.note}</p>}</section>;
}
export function OrderHeader({ order }: { order: Order }) {
  return <div className="order-detail-header"><div><span className="order-reference">{order.reference}</span><h2>{order.items.length} article{order.items.length > 1 ? "s" : ""}, une demande.</h2><p>Créée le {dateLabel(order.createdAt)} · {order.customer.city}</p></div><StatusBadge status={order.status}/></div>;
}
export function OrderContents({ order }: { order: Order }) {
  return <section className="order-products"><div className="section-heading"><h3>Les articles demandés</h3><span>{order.items.reduce((sum,item)=>sum+item.quantity,0)} unité(s)</span></div><ItemList items={order.items} prices={order.quote?.unitPrices}/></section>;
}
export function Timeline({ order }: { order: Order }) {
  return <section className="timeline-section"><h3>Historique de la demande</h3><ol className="timeline">{order.history.map((event,index)=><li key={index}><span/><div><strong>{event.text}</strong><time dateTime={event.at}>{dateLabel(event.at)}</time></div></li>)}</ol></section>;
}
export function Progress({ order }: { order: Order }) {
  const index = order.status === "awaiting_quote" ? 0 : order.status === "quote_ready" || order.status === "declined" ? 1 : ["awaiting_payment","payment_review"].includes(order.status) ? 2 : order.status === "ordered" ? 3 : order.status === "in_transit" ? 4 : 5;
  return <ol className="order-progress" aria-label="Étapes de la commande">{["Demande","Devis","Paiement","Confirmée","Transport","Livrée"].map((step,i)=><li className={i <= index ? "done" : ""} key={step}><span>{i < index ? <Icon name="check" size={12}/> : i+1}</span>{step}</li>)}</ol>;
}
export const statusOptions = Object.entries(labels);
