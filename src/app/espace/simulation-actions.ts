"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
export type SimulationState = { error?: string; message?: string };
export async function updateSimulation(_previous: SimulationState, form: FormData): Promise<SimulationState> {
 const { supabase } = await requireUser();
 if (form.get("acknowledge") !== "yes") return { error: "Confirmez qu’il s’agit uniquement d’une simulation sans paiement ni expédition réels." };
 const request = String(form.get("request") ?? "");
 const operation = form.get("operation");
 let error;
 if (operation === "declare") {
   ({ error } = await supabase.rpc("jibli_declare_simulation", { p_request: request, p_quote_version: Number(form.get("version")), p_delivery_revision: Number(form.get("deliveryRevision")) }));
 } else if (operation === "advance") {
   const { data: admin, error: roleError } = await supabase.rpc("jibli_is_admin");
   if (roleError || !admin) return { error: "Accès administrateur requis." };
   ({ error } = await supabase.rpc("jibli_advance_simulation", { p_request: request, p_expected: String(form.get("expected") ?? ""), p_tracking: String(form.get("tracking") ?? "") }));
 } else return { error: "Opération inconnue." };
 if (error) return { error: "Simulation non confirmée. Actualisez pour vérifier l’étape actuelle, l’adresse et le devis accepté. Une référence de transport fictive doit commencer par DEMO-." };
 revalidatePath("/espace"); revalidatePath("/gestion");
 return { message: "Étape simulée enregistrée. Aucun argent ni colis n’a été envoyé." };
}
