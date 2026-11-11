import { labels, shops, type Item, type Status } from "@/lib/domain";
const paths = {
  bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  link: <><path d="m10 13 4-4m-6 7H6a4 4 0 0 1-3-7l4-4a4 4 0 0 1 6 0m-2 14a4 4 0 0 0 6 0l4-4a4 4 0 0 0-3-7h-2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  box: <><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10M7 4l10 6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  trash: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  truck: <><path d="M2 5h12v12H2zm12 5h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
};
export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>; }
export function Logo() { return <span className="logo"><span className="logo-icon"><Icon name="bag" size={21}/></span>jibli<span className="logo-dot">.</span></span>; }
export function StatusBadge({ status }: { status: Status }) { return <span className={"status " + status}><span/>{labels[status]}</span>; }
export function ItemArt({ shop }: { shop: Item["shop"] }) {
  return <span className={"item-art " + shop}>{shop === "shein" ? <svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="m20 12-12 9 8 11 5-3v22h18V29l5 3 8-11-12-9c-2 7-18 7-20 0Z" fill="currentColor" opacity=".65"/><path d="M24 13c1 8 11 8 12 0" stroke="white" strokeWidth="2"/></svg> : <svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="M14 33v-8a16 16 0 0 1 32 0v8" stroke="currentColor" strokeWidth="5"/><rect x="10" y="28" width="12" height="20" rx="6" fill="currentColor"/><rect x="38" y="28" width="12" height="20" rx="6" fill="currentColor"/></svg>}</span>;
}
export function ItemList({ items, prices }: { items: Item[]; prices?: Record<string, number> }) {
  return <div className="item-list">{items.map(item => <div className="order-item" key={item.id}><ItemArt shop={item.shop}/><div className="item-info"><span className={"shop-label " + item.shop}>{shops[item.shop]}</span><strong>{item.title}</strong><p>{item.variant} · Qté {item.quantity}</p>{item.note && <p className="item-note">{item.note}</p>}<a href={item.url} target="_blank" rel="noopener noreferrer" className="text-link">Voir le lien fourni ↗</a></div>{prices && <span className="unit-tag">{new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3 }).format((prices[item.id] ?? 0) / 1000)} DT / unité</span>}</div>)}</div>;
}
export function ErrorMessage({ text }: { text: string }) { return text ? <p className="error-message" role="alert">{text}</p> : null; }
