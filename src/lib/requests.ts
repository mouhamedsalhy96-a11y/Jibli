import "server-only";
import type { Costs, Item, Order, Status } from "./domain";
import { requireUser } from "./supabase/server";
import type { Delivery } from "./delivery";
import { INBOX_PAGE_SIZE, inboxSearchFilter, type InboxFilters } from "./inbox-filters";
export type SavedRequest = {
  id: string; reference: string; customer_name: string; email: string; phone: string; city: string;
  status: Status; created_at: string;
  current_version: number; accepted_version: number | null; decided_at: string | null;
  jibli_request_items: (Item & { position: number })[];
  jibli_quotes: { version: number; unit_prices: Record<string,number>; costs: Costs; total: number; valid_until: string; min_days: number; max_days: number; note: string; created_at: string }[];
  jibli_deliveries: Delivery | null;
  jibli_delivery_events: { revision: number; created_at: string }[];
  jibli_simulations: { simulation: boolean; quote_version: number; amount: number; reference: string; declared_at: string; confirmed_at: string | null; tracking: string | null } | null;
  jibli_simulation_events: { kind: "payment_review" | "ordered" | "in_transit" | "delivered"; created_at: string }[];
};
const simulationLabels = { payment_review: "Paiement simulé déclaré", ordered: "Paiement simulé confirmé · commande fictive", in_transit: "Acheminement simulé", delivered: "Livraison simulée" };
export function requestOrder(request: SavedRequest): Order {
  const latest = request.jibli_quotes.find(quote => quote.version === request.current_version);
  return {
    id: request.id, reference: request.reference, status: request.status,
    items: [...request.jibli_request_items].sort((a,b) => a.position-b.position),
    customer: { name: request.customer_name, email: request.email, phone: request.phone, city: request.city },
    createdAt: request.created_at, updatedAt: [...request.jibli_simulation_events].sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at))[0]?.created_at ?? request.jibli_deliveries?.updated_at ?? request.decided_at ?? latest?.created_at ?? request.created_at,
    tracking: request.jibli_simulations?.tracking ?? undefined,
    acceptedVersion: request.accepted_version ?? undefined,
    quote: latest ? { version: latest.version, unitPrices: latest.unit_prices, costs: latest.costs, total: latest.total, validUntil: latest.valid_until, minDays: latest.min_days, maxDays: latest.max_days, note: latest.note, createdAt: latest.created_at } : undefined,
    history: [{ text: "Demande enregistrée", at: request.created_at }, ...request.jibli_quotes.map(quote => ({ text: `Devis v${quote.version} publié`, at: quote.created_at })), ...(request.decided_at ? [{ text: request.status === "declined" ? "Devis refusé" : `Devis v${request.accepted_version} accepté`, at: request.decided_at }] : []), ...request.jibli_delivery_events.map(event => ({ text: event.revision === 1 ? "Coordonnées de livraison enregistrées" : "Coordonnées de livraison mises à jour", at: event.created_at })), ...request.jibli_simulation_events.map(event => ({ text: simulationLabels[event.kind], at: event.created_at }))].sort((a,b) => Date.parse(a.at)-Date.parse(b.at)),
  };
}
export async function requestWorkspace(admin = false, filters: InboxFilters = { q: "", status: "all", page: 1 }) {
  const { supabase, user } = await requireUser();
  const { data: isAdmin, error: roleError } = await supabase.rpc("jibli_is_admin");
  if (roleError) return { user, isAdmin: false, forbidden: false, requests: [], error: true, total: 0, page: 1 };
  if (admin && !isAdmin) return { user, isAdmin: false, forbidden: true, requests: [], error: false, total: 0, page: 1 };
  let query = supabase.from("jibli_requests").select("id, reference, customer_name, email, phone, city, status, created_at, current_version, accepted_version, decided_at, jibli_request_items(id, title, variant, quantity, shop, url, note, position), jibli_quotes(version, unit_prices, costs, total, valid_until, min_days, max_days, note, created_at), jibli_deliveries(address, city, postcode, revision, updated_at), jibli_delivery_events(revision, created_at), jibli_simulations(simulation, quote_version, amount, reference, declared_at, confirmed_at, tracking), jibli_simulation_events(kind, created_at)", admin ? { count: "exact" } : {}).order("created_at", { ascending: false }).order("id", { ascending: false });
  let page = admin ? filters.page : 1;
  if (admin) {
    if (filters.status !== "all") query = query.eq("status",filters.status);
    if (filters.q) query = query.or(inboxSearchFilter(filters.q));
    query = query.range((page-1)*INBOX_PAGE_SIZE,page*INBOX_PAGE_SIZE-1);
  } else query = query.eq("owner_id", user.id).limit(100);
  let { data, error, count } = await query;
  // PostgREST may reject an offset beyond the last row. Recover a count from
  // the first page, then use the last valid page below instead of an error UI.
  if (admin && error?.code === "PGRST103") ({ data, error, count } = await query.range(0,INBOX_PAGE_SIZE-1));
  if (admin && !error && count !== null) {
    const lastPage = Math.max(1,Math.ceil(count/INBOX_PAGE_SIZE));
    if (page > lastPage) {
      page = lastPage;
      if (count > 0) ({ data, error, count } = await query.range((page-1)*INBOX_PAGE_SIZE,page*INBOX_PAGE_SIZE-1));
    }
  }
  // The relationship is one-to-one in PostgreSQL. Without generated database
  // types the SDK infers an array; normalize either API representation here.
  const requests = (data ?? []).map(request => ({ ...request, jibli_deliveries: Array.isArray(request.jibli_deliveries) ? request.jibli_deliveries[0] ?? null : request.jibli_deliveries, jibli_simulations: Array.isArray(request.jibli_simulations) ? request.jibli_simulations[0] ?? null : request.jibli_simulations })) as SavedRequest[];
  return { user, isAdmin: Boolean(isAdmin), forbidden: false, requests, error: Boolean(error), total: admin ? count ?? 0 : requests.length, page };
}
