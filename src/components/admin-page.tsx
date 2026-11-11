"use client";
import { useState, type FormEvent } from "react";
import { advanceOrder, dateLabel, labels, money, parseMoney, productTotal, publishQuote, type Costs, type Order, type Status } from "@/lib/domain";
import { useStore } from "./store";
import { ErrorMessage, Icon, StatusBadge } from "./ui";
import { OrderContents, OrderHeader, QuoteBreakdown, Timeline } from "./order-shared";
const feeLabels = {transport:"Transport international",customs:"Douane / taxes estimées",service:"Frais de service",delivery:"Livraison en Tunisie"};
function QuoteEditor({order}:{order:Order}) {
  const {changeOrder}=useStore();
  const [prices,setPrices]=useState<Record<string,string>>(()=>Object.fromEntries(order.items.map(item=>[item.id,order.quote?String(order.quote.unitPrices[item.id]/1000):""])));
  const [fees,setFees]=useState<Record<keyof Costs,string>>({transport:order.quote?String(order.quote.costs.transport/1000):"",customs:order.quote?String(order.quote.costs.customs/1000):"",service:order.quote?String(order.quote.costs.service/1000):"",delivery:order.quote?String(order.quote.costs.delivery/1000):""});
  const [validDays,setValidDays]=useState(7);
  const [minDays,setMinDays]=useState(order.quote?.minDays??12);
  const [maxDays,setMaxDays]=useState(order.quote?.maxDays??18);
  const [note,setNote]=useState(order.quote?.note??"");
  const [error,setError]=useState("");
  function preview(value:string){try{return parseMoney(value);}catch{return 0;}}
  const previewTotal=productTotal(order.items,Object.fromEntries(Object.entries(prices).map(([id,value])=>[id,preview(value)])))+Object.values(fees).reduce((sum,value)=>sum+preview(value),0);
  function submit(event:FormEvent) {
    event.preventDefault();setError("");
    try {
      const unitPrices=Object.fromEntries(Object.entries(prices).map(([id,value])=>[id,parseMoney(value)]));
      const costs=Object.fromEntries(Object.entries(fees).map(([id,value])=>[id,parseMoney(value)])) as Costs;
      changeOrder(order.id,current=>publishQuote(current,{unitPrices,costs,validDays,minDays,maxDays,note},new Date().toISOString()));
    }catch(reason){setError(reason instanceof Error?reason.message:"Vérifiez le devis.");}
  }
  return <section className="quote-editor"><div className="section-heading"><div><span className="eyebrow">CHIFFRAGE MANUEL</span><h3>{order.quote?"Réviser le devis":"Préparer le devis"}</h3></div><span className="version-tag">TND / millimes</span></div><form onSubmit={submit}><div className="price-lines">{order.items.map(item=><div className="price-line" key={item.id}><div><strong>{item.title}</strong><p>{item.variant} · Qté {item.quantity}</p></div><div><label htmlFor={"price-"+item.id}>Prix unitaire (DT)</label><input id={"price-"+item.id} inputMode="decimal" required value={prices[item.id]} onChange={event=>setPrices({...prices,[item.id]:event.target.value})} placeholder="0,000"/></div></div>)}</div><div className="fee-grid">{(Object.keys(feeLabels) as (keyof Costs)[]).map(key=><div key={key}><label htmlFor={"fee-"+key}>{feeLabels[key]} (DT)</label><input id={"fee-"+key} inputMode="decimal" required value={fees[key]} onChange={event=>setFees({...fees,[key]:event.target.value})} placeholder="0,000"/></div>)}</div><div className="fee-grid quote-dates"><div><label htmlFor="quote-validity">Validité (jours)</label><input id="quote-validity" type="number" min={1} max={30} required value={validDays} onChange={event=>setValidDays(Number(event.target.value))}/></div><div><label htmlFor="quote-min">Délai min. (jours ouvrés)</label><input id="quote-min" type="number" min={1} max={180} required value={minDays} onChange={event=>setMinDays(Number(event.target.value))}/></div><div><label htmlFor="quote-max">Délai max. (jours ouvrés)</label><input id="quote-max" type="number" min={minDays} max={180} required value={maxDays} onChange={event=>setMaxDays(Number(event.target.value))}/></div></div><label htmlFor="quote-note">Informations pour le client</label><textarea id="quote-note" rows={3} maxLength={1000} value={note} onChange={event=>setNote(event.target.value)} placeholder="Disponibilité, hypothèses de transport, conditions du devis…"/><div className="editor-total"><span>Total du devis</span><strong>{money(previewTotal)}</strong></div><p className="form-footnote">Les estimations de transport et de douane sont saisies par l’équipe. Aucun taux ou frais réglementaire n’est calculé automatiquement.</p><ErrorMessage text={error}/><button className="button primary full" type="submit">Publier le devis fictif<Icon name="arrow" size={17}/></button></form></section>;
}
function Fulfillment({order}:{order:Order}) {
  const {changeOrder}=useStore();
  const [confirmed,setConfirmed]=useState(false);
  const [tracking,setTracking]=useState("");
  const [error,setError]=useState("");
  const next:Partial<Record<Status,Status>>={payment_review:"ordered",ordered:"in_transit",in_transit:"delivered"};
  const nextStatus=next[order.status];
  if(!nextStatus)return null;
  function submit(event:FormEvent) {
    event.preventDefault();setError("");
    if(order.status==="payment_review"&&!confirmed){setError("Vérifiez la déclaration fictive avant de confirmer.");return;}
    try{changeOrder(order.id,current=>advanceOrder(current,nextStatus!,new Date().toISOString(),tracking));}
    catch(reason){setError(reason instanceof Error?reason.message:"Mise à jour impossible.");}
  }
  return <section className="fulfillment"><h3>Prochaine étape</h3><form onSubmit={submit}>
    {order.status==="payment_review"&&<><div className="payment-evidence"><p>Référence déclarée : <strong>{order.paymentReference}</strong></p><p>Montant attendu : <strong>{money(order.quote?.total??0)}</strong></p><p>Livraison : {order.address}</p></div><label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>J’ai vérifié cette déclaration de paiement fictive.</label></>}
    {order.status==="ordered"&&<><label htmlFor="tracking-reference">Référence du transporteur</label><input id="tracking-reference" required minLength={4} maxLength={160} value={tracking} onChange={event=>setTracking(event.target.value)} placeholder="Ex. DEMO-TRANSPORT-001"/></>}
    <ErrorMessage text={error}/><button type="submit" className="button primary">{order.status==="payment_review"?"Confirmer le paiement simulé":order.status==="ordered"?"Marquer en acheminement":"Marquer comme livrée"}<Icon name="check" size={17}/></button>
  </form></section>;
}
export function AdminPage() {
  const {orders}=useStore();
  const [selectedId,setSelectedId]=useState("");
  const [filter,setFilter]=useState<"all"|Status>("all");
  const [search,setSearch]=useState("");
  const filtered=orders.filter(order=>(filter==="all"||order.status===filter)&&(order.reference+" "+order.customer.name).toLowerCase().includes(search.toLowerCase()));
  const selected=filtered.find(order=>order.id===selectedId)??filtered[0];
  const pending=orders.filter(order=>order.status==="awaiting_quote").length;
  const reviewing=orders.filter(order=>order.status==="payment_review").length;
  return <div className="page-container workspace-page"><div className="page-heading"><div><span className="eyebrow">LE BUREAU JIBLI</span><h1>Les paniers prennent forme.</h1><p>Évaluez les demandes, préparez les devis et suivez les commandes.</p></div><span className="admin-mode"><Icon name="shield" size={17}/>Administration · démo ouverte</span></div><div className="demo-note admin-warning"><Icon name="shield" size={19}/><p>Cette démonstration utilise uniquement des données fictives. Pour gérer les demandes enregistrées, ouvrez « Administration » dans la navigation.</p></div>
    <div className="admin-metrics">{[{label:"Toutes les demandes",value:orders.length,status:"all"},{label:"À chiffrer",value:pending,status:"awaiting_quote"},{label:"Paiements à vérifier",value:reviewing,status:"payment_review"}].map(metric=><button key={metric.status} className={"metric "+(filter===metric.status?"active":"")} onClick={()=>setFilter(metric.status as typeof filter)} aria-pressed={filter===metric.status}><span>{metric.label}</span><strong>{metric.value.toString().padStart(2,"0")}</strong><Icon name={metric.status==="all"?"list":metric.status==="awaiting_quote"?"clock":"shield"}/></button>)}</div>
    <div className="orders-layout admin-layout"><aside className="panel order-sidebar"><div className="sidebar-heading"><h2>Demandes<span>{filtered.length}</span></h2><label htmlFor="admin-search" className="sr-only">Rechercher par référence ou client</label><input id="admin-search" type="search" placeholder="Référence ou client…" value={search} onChange={event=>setSearch(event.target.value)}/><label className="sr-only" htmlFor="admin-status">Filtrer par statut</label><select id="admin-status" value={filter} onChange={event=>setFilter(event.target.value as typeof filter)}><option value="all">Tous les statuts</option>{Object.entries(labels).map(([status,label])=><option value={status} key={status}>{label}</option>)}</select></div><div className="request-list">{filtered.map(order=><button className={"request-row "+(selected?.id===order.id?"selected":"")} key={order.id} aria-pressed={selected?.id===order.id} onClick={()=>setSelectedId(order.id)}><div><strong>{order.reference}</strong><time>{dateLabel(order.createdAt)}</time></div><p>{order.customer.name} · {order.customer.city}</p><div><StatusBadge status={order.status}/><span>{order.items.length} article(s)</span></div></button>)}</div>{!filtered.length&&<p className="empty-small">Aucune demande pour ce filtre.</p>}</aside>
    {selected?<article className="panel order-detail" key={selected.id+selected.status+selected.quote?.version}><OrderHeader order={selected}/><div className="customer-strip"><span>{selected.customer.name}</span><span>{selected.customer.email}</span><span>{selected.customer.phone}</span></div><OrderContents order={selected}/>{["awaiting_quote","quote_ready"].includes(selected.status)?<QuoteEditor key={selected.id+selected.quote?.version} order={selected}/>:<QuoteBreakdown order={selected}/>}<Fulfillment key={selected.status} order={selected}/>{selected.status==="awaiting_payment"&&<div className="info-box"><Icon name="clock"/><p>Le client a accepté le devis. La commande attend sa déclaration de paiement simulée.</p></div>}{selected.status==="declined"&&<p className="info-box">Le client a refusé ce devis. Aucun paiement n’est attendu.</p>}<Timeline order={selected}/></article>:<div className="panel empty-state"><Icon name="list" size={32}/><h2>Tout est à jour pour ce filtre.</h2><button className="button secondary" onClick={()=>setFilter("all")}>Afficher toutes les demandes</button></div>}
    </div>
  </div>;
}
