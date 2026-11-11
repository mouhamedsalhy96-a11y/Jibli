"use client";
import { useActionState, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { publishSavedQuote, decideSavedQuote, type QuoteActionState } from "@/app/gestion/quote-actions";
import { money, parseMoney, type Costs, type Order } from "@/lib/domain";
import { ErrorMessage } from "./ui";
const fees: Record<keyof Costs,string> = { transport: "Transport international", customs: "Douane / taxes estimées", service: "Frais de service", delivery: "Livraison en Tunisie" };

export function SavedQuoteEditor({ order }: { order: Order }) {
  const router = useRouter();
  const [preview, setPreview] = useState(order.quote?.total ?? 0);
  const [state, action, pending] = useActionState<QuoteActionState, FormData>(async (previous, form) => {
    try { const result = await publishSavedQuote(previous,form); if (!result.error) router.refresh(); return result; }
    catch { return { error: "Réponse indisponible. Vérifiez votre session puis actualisez la page avant de réessayer." }; }
  }, {});
  function updatePreview(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const value = (key: string) => { try { return parseMoney(String(form.get(key) ?? "")); } catch { return 0; } };
    setPreview(order.items.reduce((sum,item) => sum + value("price:"+item.id)*item.quantity,0) + Object.keys(fees).reduce((sum,key) => sum+value(key),0));
  }
  return <section className="quote-editor"><h3>{order.quote ? "Réviser le devis enregistré" : "Préparer le devis"}</h3><form action={action} onChange={updatePreview}><fieldset disabled={pending} className="request-fieldset"><input type="hidden" name="request" value={order.id}/><input type="hidden" name="version" value={order.quote?.version ?? 0}/>
    <div className="price-lines">{order.items.map(item => <div className="price-line" key={item.id}><div><strong>{item.title}</strong><p>{item.variant} · Qté {item.quantity}</p></div><div><label htmlFor={"live-price-"+item.id}>Prix unitaire (DT)</label><input id={"live-price-"+item.id} name={"price:"+item.id} inputMode="decimal" required maxLength={10} defaultValue={order.quote ? String(order.quote.unitPrices[item.id]/1000) : ""} placeholder="0,000"/></div></div>)}</div>
    <div className="fee-grid">{(Object.keys(fees) as (keyof Costs)[]).map(key => <div key={key}><label htmlFor={order.id+key}>{fees[key]} (DT)</label><input id={order.id+key} name={key} inputMode="decimal" required maxLength={10} defaultValue={order.quote ? String(order.quote.costs[key]/1000) : ""} placeholder="0,000"/></div>)}</div>
    <div className="fee-grid quote-dates"><div><label htmlFor={order.id+"valid"}>Validité (jours)</label><input id={order.id+"valid"} name="validDays" type="number" min={1} max={30} defaultValue={7} required/></div><div><label htmlFor={order.id+"min"}>Délai min. (jours ouvrés)</label><input id={order.id+"min"} name="minDays" type="number" min={1} max={180} defaultValue={order.quote?.minDays ?? 12} required/></div><div><label htmlFor={order.id+"max"}>Délai max. (jours ouvrés)</label><input id={order.id+"max"} name="maxDays" type="number" min={1} max={180} defaultValue={order.quote?.maxDays ?? 18} required/></div></div>
    <label htmlFor={order.id+"note"}>Informations pour le client</label><textarea id={order.id+"note"} name="note" rows={3} maxLength={1000} defaultValue={order.quote?.note ?? ""}/>
    <div className="editor-total"><span>Total estimé</span><strong>{money(preview)}</strong></div><p className="form-footnote">Le total inclut les articles et les quatre postes de frais. Les délais restent estimatifs après confirmation du paiement.</p><ErrorMessage text={state.error ?? ""}/>{state.message && <p role="status">{state.message}</p>}<button type="submit" className="button primary" disabled={pending}>{pending ? "Enregistrement…" : "Publier le devis"}</button></fieldset></form></section>;
}
export function SavedQuoteDecision({ order }: { order: Order }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<QuoteActionState, FormData>(async (previous,form) => {
    try { const result = await decideSavedQuote(previous,form); if (!result.error) router.refresh(); return result; }
    catch { return { error: "Réponse indisponible. Actualisez la page pour vérifier si votre décision a été enregistrée." }; }
  }, {});
  return <form action={action} className="saved-decision"><input type="hidden" name="request" value={order.id}/><input type="hidden" name="version" value={order.quote?.version ?? 0}/><p>Vérifiez les articles, le total et le délai. Votre décision est enregistrée sur cette version du devis. Aucun paiement n’est prélevé.</p><label className="checkbox-label"><input type="checkbox" required disabled={pending}/>J’ai vérifié ce devis de test et je confirme mon choix.</label><ErrorMessage text={state.error ?? ""}/><div className="button-row"><button name="decision" value="accept" className="button primary" disabled={pending}>{pending ? "Enregistrement…" : "Accepter le devis"}</button><button name="decision" value="decline" className="button secondary" disabled={pending}>Refuser le devis</button></div></form>;
}
