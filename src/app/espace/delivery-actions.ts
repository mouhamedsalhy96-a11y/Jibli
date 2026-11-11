"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { validateDelivery } from "@/lib/delivery";
export type DeliveryState = { error?: string; message?: string };
export async function saveDelivery(_previous: DeliveryState, form: FormData): Promise<DeliveryState> {
  const { supabase } = await requireUser();
  let details;
  try { details = validateDelivery({ address: String(form.get("address") ?? ""), city: String(form.get("city") ?? ""), postcode: String(form.get("postcode") ?? "") }); }
  catch (error) { return { error: error instanceof Error ? error.message : "Vérifiez les coordonnées." }; }
  const { error } = await supabase.rpc("jibli_save_delivery", {
    p_request: String(form.get("request") ?? ""), p_quote_version: Number(form.get("quoteVersion")), p_expected_revision: Number(form.get("revision")),
    p_address: details.address, p_city: details.city, p_postcode: details.postcode,
  });
  if (error) return { error: "Enregistrement impossible. La demande ou l’adresse a peut-être changé. Actualisez la page, puis vérifiez la ville et les coordonnées avant de réessayer." };
  revalidatePath("/espace"); revalidatePath("/gestion");
  return { message: "Coordonnées de livraison enregistrées. Aucun paiement n’a été effectué." };
}
