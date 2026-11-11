"use server";
import { revalidatePath } from "next/cache";
import { newOrder, type Item } from "@/lib/domain";
import { requireUser } from "@/lib/supabase/server";
export async function saveRequest(input: { id: string; name: string; phone: string; city: string; items: Item[] }): Promise<{ reference?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  let order;
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("Identifiant de demande invalide.");
    order = newOrder(input.items, { name: input.name, phone: input.phone, city: input.city, email: user.email ?? "" }, input.id, new Date().toISOString());
  } catch (error) { return { error: error instanceof Error ? error.message : "Vérifiez les informations du panier." }; }
  const { error } = await supabase.rpc("jibli_create_request", { p_id: order.id, p_name: order.customer.name, p_phone: order.customer.phone, p_city: order.customer.city, p_items: order.items });
  if (error) return { error: "Enregistrement impossible. Vérifiez votre connexion et la confirmation de votre compte, puis réessayez. Votre panier est conservé." };
  revalidatePath("/espace"); revalidatePath("/gestion");
  return { reference: "JB-" + order.id.replaceAll("-", "").toUpperCase() };
}
