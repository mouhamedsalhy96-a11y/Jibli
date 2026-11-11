"use server";
import { revalidatePath } from "next/cache";
import { parseMoney } from "@/lib/domain";
import { requireUser } from "@/lib/supabase/server";
export type QuoteActionState = { error?: string; message?: string };
function refreshQuotes() { revalidatePath("/gestion"); revalidatePath("/espace"); }
export async function publishSavedQuote(_previous: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  const { supabase } = await requireUser();
  const { data: admin, error: adminError } = await supabase.rpc("jibli_is_admin");
  if (adminError || !admin) return { error: "Accès administrateur requis." };
  const id = String(form.get("request") ?? "");
  const { data: items, error: itemError } = await supabase.from("jibli_request_items").select("id").eq("request_id", id);
  if (itemError || !items?.length) return { error: "Demande introuvable ou indisponible." };
  let prices, costs;
  try {
    prices = Object.fromEntries(items.map(item => [item.id, parseMoney(String(form.get("price:" + item.id) ?? ""))]));
    costs = Object.fromEntries(["transport", "customs", "service", "delivery"].map(key => [key, parseMoney(String(form.get(key) ?? ""))]));
  } catch { return { error: "Vérifiez les montants : chaque article doit être chiffré, avec trois décimales maximum." }; }
  const { error } = await supabase.rpc("jibli_publish_quote", {
    p_request: id, p_expected: Number(form.get("version")), p_prices: prices, p_costs: costs,
    p_valid_days: Number(form.get("validDays")), p_min_days: Number(form.get("minDays")), p_max_days: Number(form.get("maxDays")), p_note: String(form.get("note") ?? ""),
  });
  if (error) return { error: "Publication impossible. Vérifiez les montants et délais. Si le devis a changé ou a été accepté, actualisez la page." };
  refreshQuotes(); return { message: "Devis enregistré et visible dans l’espace du client." };
}
export async function decideSavedQuote(_previous: QuoteActionState, form: FormData): Promise<QuoteActionState> {
  const { supabase } = await requireUser();
  const decision = form.get("decision");
  if (decision !== "accept" && decision !== "decline") return { error: "Choisissez une décision." };
  const { error } = await supabase.rpc("jibli_decide_quote", { p_request: String(form.get("request") ?? ""), p_version: Number(form.get("version")), p_accept: decision === "accept" });
  if (error) return { error: "Décision impossible : le devis a peut-être changé, expiré ou déjà été traité. Actualisez la page pour consulter sa dernière version." };
  refreshQuotes(); return { message: decision === "accept" ? "Devis accepté. Aucun paiement n’a été prélevé." : "Devis refusé. Aucun paiement n’est attendu." };
}
