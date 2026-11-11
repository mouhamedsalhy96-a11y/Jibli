"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { acceptQuote, declineQuote, declarePayment, dateLabel, money, type Order } from "@/lib/domain";
import { useStore } from "./store";
import { ErrorMessage, Icon, StatusBadge } from "./ui";
import { OrderContents, OrderHeader, Progress, QuoteBreakdown, Timeline } from "./order-shared";
function PaymentForm({ order }: { order: Order }) {
  const { changeOrder } = useStore();
  const [address,setAddress] = useState("");
  const [reference,setReference] = useState("");
  const [consent,setConsent] = useState(false);
  const [error,setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();setError("");
    if(!consent){setError("Confirmez qu’aucun paiement réel n’est effectué.");return;}
    try {changeOrder(order.id,current=>declarePayment(current,address,reference,new Date().toISOString()));}
    catch(reason){setError(reason instanceof Error ? reason.message : "Vérifiez les informations.");}
  }
  return <section className="payment-box"><span className="eyebrow">SIMULATION UNIQUEMENT</span><h3>Finalisez les informations de livraison.</h3><p>Montant du devis accepté : <strong>{money(order.quote?.total ?? 0)}</strong>. Le prestataire de paiement sera connecté dans une prochaine étape. Ne transférez pas d’argent pour cette démo.</p><form onSubmit={submit}><label htmlFor="delivery-address">Adresse de livraison fictive</label><textarea id="delivery-address" required minLength={10} maxLength={500} rows={3} value={address} onChange={event=>setAddress(event.target.value)} placeholder="Rue, numéro, code postal et ville — données fictives"/><label htmlFor="payment-reference">Référence de paiement simulée</label><input id="payment-reference" required minLength={6} maxLength={100} value={reference} onChange={event=>setReference(event.target.value)} placeholder="Ex. TEST-123456"/><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>Je comprends qu’il s’agit d’une simulation sans paiement réel.</label><ErrorMessage text={error}/><button className="button primary" type="submit">Déclarer le paiement simulé<Icon name="arrow" size={17}/></button></form></section>;
}
function CustomerDetails({ order }: { order: Order }) {
  const {changeOrder}=useStore();
  const [error,setError]=useState("");
  function decide(accept:boolean) {
    setError("");
    if(!order.quote)return;
    if(!accept&&!window.confirm("Refuser ce devis fictif ? Cette demande sera clôturée."))return;
    try{changeOrder(order.id,current=>(accept?acceptQuote:declineQuote)(current,order.quote!.version,new Date().toISOString()));}
    catch(reason){setError(reason instanceof Error?reason.message:"Impossible de mettre à jour la demande.");}
  }
  return <article className="panel order-detail"><OrderHeader order={order}/><Progress order={order}/><OrderContents order={order}/>
    {order.quote ? <QuoteBreakdown order={order}/> : <div className="waiting-box"><span><Icon name="clock" size={26}/></span><div><h3>Votre demande attend son estimation.</h3><p>L’équipe examine les articles et les options de transport. Le prix et le délai apparaîtront ici une fois le devis préparé.</p><Link href="/admin" className="text-link">Préparer ce devis dans l’administration démo →</Link></div></div>}
    {order.status==="quote_ready"&&<div className="decision-box"><h3>Ce devis vous convient ?</h3><p>Vérifiez les articles, les frais et le délai avant d’accepter. Aucun paiement ne sera prélevé automatiquement.</p><ErrorMessage text={error}/><div className="button-row"><button className="button primary" onClick={()=>decide(true)}>Accepter le devis<Icon name="check" size={17}/></button><button className="button secondary" onClick={()=>decide(false)}>Refuser</button></div></div>}
    {order.status==="awaiting_payment"&&<PaymentForm key={order.status} order={order}/>}
    {order.status==="payment_review"&&<div className="info-box"><Icon name="shield"/><div><h3>Paiement simulé en attente de vérification.</h3><p>La commande n’est pas encore confirmée. L’administrateur doit valider la déclaration.</p><Link href="/admin" className="text-link">Continuer dans l’administration démo →</Link></div></div>}
    {["ordered","in_transit","delivered"].includes(order.status)&&<div className="info-box"><Icon name="truck"/><div><h3>{order.status==="delivered"?"Votre commande fictive est arrivée.":"Votre commande fictive avance."}</h3>{order.tracking&&<p>Référence de suivi : <strong>{order.tracking}</strong></p>}{order.address&&<p>Livraison : {order.address}</p>}</div></div>}
    {order.status==="declined"&&<div className="info-box"><Icon name="list"/><div><h3>Devis refusé.</h3><p>Aucun paiement n’est attendu pour cette demande.</p><Link href="/" className="text-link">Composer un nouveau panier →</Link></div></div>}
    <Timeline order={order}/>
  </article>;
}
export function CustomerOrders() {
  const {orders}=useStore();
  const [selectedId,setSelectedId]=useState("");
  const [search,setSearch]=useState("");
  const filtered=orders.filter(order=>(order.reference+" "+order.items.map(item=>item.title).join(" ")).toLowerCase().includes(search.toLowerCase()));
  const selected=filtered.find(order=>order.id===selectedId)??filtered[0];
  return <div className="page-container workspace-page"><div className="page-heading"><div><span className="eyebrow">VOTRE ESPACE, EN MODE DÉMO</span><h1>Chaque panier a son histoire.</h1><p>Retrouvez vos devis et les étapes de vos commandes fictives.</p></div><Link href="/" className="button primary"><Icon name="plus" size={17}/>Nouveau panier</Link></div><div className="demo-note"><Icon name="shield" size={18}/><p>Cette démonstration temporaire utilise des exemples fictifs. Pour retrouver vos demandes enregistrées, ouvrez « Mes demandes » dans la navigation.</p></div>
    <div className="orders-layout"><aside className="panel order-sidebar"><div className="sidebar-heading"><h2>Mes demandes<span>{orders.length}</span></h2><label htmlFor="customer-search" className="sr-only">Rechercher une demande</label><input id="customer-search" type="search" placeholder="Référence ou article…" value={search} onChange={event=>setSearch(event.target.value)}/></div><div className="request-list">{filtered.map(order=><button key={order.id} className={"request-row "+(selected?.id===order.id?"selected":"")} aria-pressed={selected?.id===order.id} onClick={()=>setSelectedId(order.id)}><div><strong>{order.reference}</strong><time>{dateLabel(order.createdAt)}</time></div><p>{order.items.map(item=>item.title).join(", ")}</p><div><StatusBadge status={order.status}/>{order.quote&&<strong>{money(order.quote.total)}</strong>}</div></button>)}</div>{!filtered.length&&<p className="empty-small">Aucune demande trouvée.</p>}</aside>{selected?<CustomerDetails key={selected.id+selected.status} order={selected}/>:<div className="panel empty-state"><Icon name="bag" size={32}/><h2>Aucune demande à afficher.</h2><Link href="/" className="button primary">Créer un panier</Link></div>}</div>
  </div>;
}
