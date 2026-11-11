"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateSimulation, type SimulationState } from "@/app/espace/simulation-actions";
import type { Status } from "@/lib/domain";
import { ErrorMessage } from "./ui";
export function SimulationControls({ requestId, version, deliveryRevision, status, admin }: { requestId: string; version: number; deliveryRevision: number; status: Status; admin: boolean }) {
 const router = useRouter();
 const [state, action, pending] = useActionState<SimulationState,FormData>(async(previous,form) => {
   try { const result = await updateSimulation(previous,form); if (!result.error) router.refresh(); return result; }
   catch { return { error: "Réponse indisponible. Actualisez avant de réessayer pour vérifier l’étape déjà enregistrée." }; }
 }, {});
 const declare = !admin && status === "awaiting_payment" && deliveryRevision > 0;
 const advance = admin && ["payment_review","ordered","in_transit"].includes(status);
 if (!declare && !advance) return null;
 const label = declare ? "Simuler un paiement" : status === "payment_review" ? "Confirmer le paiement simulé" : status === "ordered" ? "Simuler la mise en acheminement" : "Simuler la livraison";
 return <section className="simulation-panel"><span className="eyebrow">SIMULATION UNIQUEMENT</span><h3>{label}</h3><p>Aucun paiement, achat ou transport réel. Cette étape sert uniquement à tester le parcours et sera enregistrée comme simulation.</p><form action={action}><fieldset className="request-fieldset" disabled={pending}>
   <input type="hidden" name="request" value={requestId}/><input type="hidden" name="operation" value={declare ? "declare" : "advance"}/><input type="hidden" name="version" value={version}/><input type="hidden" name="deliveryRevision" value={deliveryRevision}/><input type="hidden" name="expected" value={status}/>
   {admin && status === "ordered" && <><label htmlFor={requestId+"tracking"}>Référence de transport fictive</label><input id={requestId+"tracking"} name="tracking" required pattern="DEMO-[A-Za-z0-9-]{3,95}" maxLength={100} placeholder="DEMO-TRACK-001" autoComplete="off"/></>}
   <label className="checkbox-label"><input type="checkbox" name="acknowledge" value="yes" required/>Je confirme cette simulation sans mouvement d’argent ni expédition réels.</label><ErrorMessage text={state.error ?? ""}/>{state.message && <p role="status">{state.message}</p>}<button className="button primary" disabled={pending}>{pending ? "Enregistrement…" : label}</button>
 </fieldset></form></section>;
}
