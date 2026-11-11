"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveDelivery, type DeliveryState } from "@/app/espace/delivery-actions";
import type { Delivery } from "@/lib/delivery";
import { ErrorMessage } from "./ui";
export function DeliveryDetails({ requestId, quoteVersion, city, delivery }: { requestId: string; quoteVersion: number; city: string; delivery: Delivery | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DeliveryState, FormData>(async(previous,form) => {
    try { const result = await saveDelivery(previous,form); if (!result.error) router.refresh(); return result; }
    catch { return { error: "Réponse indisponible. Actualisez pour vérifier si les coordonnées ont été enregistrées avant de réessayer." }; }
  }, {});
  return <section className="delivery-details"><h3>{delivery ? "Mettre à jour la livraison" : "Renseigner la livraison"}</h3><p>Utilisez une adresse fictive pour ce test. La ville reste celle du devis accepté. Pour changer de ville, créez une nouvelle demande afin de faire réévaluer les frais.</p><form action={action}><fieldset className="request-fieldset" disabled={pending}>
    <input type="hidden" name="request" value={requestId}/><input type="hidden" name="quoteVersion" value={quoteVersion}/><input type="hidden" name="revision" value={delivery?.revision ?? 0}/>
    <label htmlFor={requestId+"address"}>Adresse complète de livraison</label><textarea id={requestId+"address"} name="address" required minLength={10} maxLength={500} rows={3} autoComplete="street-address" defaultValue={delivery?.address ?? ""} placeholder="Rue, numéro, bâtiment, étage…"/>
    <div className="two-columns"><div><label htmlFor={requestId+"city"}>Ville du devis accepté</label><input id={requestId+"city"} name="city" readOnly value={city} autoComplete="address-level2"/></div><div><label htmlFor={requestId+"postcode"}>Code postal</label><input id={requestId+"postcode"} name="postcode" required pattern="[0-9]{4}" inputMode="numeric" maxLength={4} autoComplete="postal-code" defaultValue={delivery?.postcode ?? ""} placeholder="Ex. 1000"/></div></div>
    <ErrorMessage text={state.error ?? ""}/>{state.message && <p role="status">{state.message}</p>}<button className="button primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la livraison"}</button>
  </fieldset></form></section>;
}
