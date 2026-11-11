export type Shop = "shein" | "aliexpress";
export type Item = { id: string; url: string; shop: Shop; title: string; variant: string; quantity: number; note: string };
export type Customer = { name: string; email: string; phone: string; city: string };
export type Costs = { transport: number; customs: number; service: number; delivery: number };
export type Quote = { version: number; unitPrices: Record<string, number>; costs: Costs; total: number; validUntil: string; minDays: number; maxDays: number; note: string; createdAt: string };
export type Status = "awaiting_quote" | "quote_ready" | "declined" | "awaiting_payment" | "payment_review" | "ordered" | "in_transit" | "delivered";
export type Order = { id: string; reference: string; items: Item[]; customer: Customer; status: Status; createdAt: string; updatedAt: string; quote?: Quote; acceptedVersion?: number; address?: string; paymentReference?: string; tracking?: string; history: { text: string; at: string }[] };
export const labels: Record<Status, string> = {
  awaiting_quote: "À chiffrer", quote_ready: "Devis disponible", declined: "Devis refusé",
  awaiting_payment: "Paiement attendu", payment_review: "Paiement à vérifier", ordered: "Commande confirmée",
  in_transit: "En acheminement", delivered: "Livrée",
};
export const shops: Record<Shop, string> = { shein: "SHEIN", aliexpress: "AliExpress" };
export function money(millimes: number) {
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(millimes / 1000) + " DT";
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-TN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
export function parseMoney(value: string): number {
  const clean = value.trim().replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(clean)) throw new Error("Saisissez un montant positif avec 3 décimales au maximum.");
  const [whole, fraction = ""] = clean.split(".");
  const result = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Montant invalide.");
  return result;
}
export function identifyShop(raw: string): { shop: Shop; url: string } {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error("Collez un lien complet commençant par https://."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || raw.length > 2000) throw new Error("Utilisez un lien HTTPS public, sans identifiants ni port.");
  const host = url.hostname.toLowerCase();
  const belongs = (domain: string) => host === domain || host.endsWith("." + domain);
  const shop = belongs("shein.com") ? "shein" : belongs("aliexpress.com") ? "aliexpress" : null;
  if (!shop) throw new Error("Seuls les liens shein.com et aliexpress.com sont acceptés pour le moment.");
  url.hash = "";
  return { shop, url: url.toString() };
}
export function makeItem(input: { url: string; title: string; variant: string; quantity: number; note: string }, id: string): Item {
  const { shop, url } = identifyShop(input.url);
  if (input.title.trim().length < 2 || input.title.trim().length > 120) throw new Error("Donnez un nom à l’article (2 à 120 caractères).");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) throw new Error("La quantité doit être comprise entre 1 et 20.");
  if (!input.variant.trim() || input.variant.length > 200) throw new Error("Précisez la taille, la couleur ou « Sans variante ».");
  if (input.note.length > 500) throw new Error("La remarque ne doit pas dépasser 500 caractères.");
  return { id, shop, url, title: input.title.trim(), variant: input.variant.trim(), quantity: input.quantity, note: input.note.trim() };
}
export function validateCustomer(input: Customer): Customer {
  const customer = { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.replace(/[\s()-]/g, ""), city: input.city.trim() };
  if (customer.name.length < 2 || customer.name.length > 100) throw new Error("Indiquez votre nom (2 à 100 caractères).");
  if (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error("Indiquez une adresse e-mail valide.");
  if (!/^(\+216)?\d{8}$/.test(customer.phone)) throw new Error("Indiquez un numéro tunisien à 8 chiffres, avec ou sans +216.");
  if (customer.city.length < 2 || customer.city.length > 100) throw new Error("Indiquez votre ville.");
  return customer;
}
export function newOrder(items: Item[], customer: Customer, id: string, now: string): Order {
  if (!items.length || items.length > 20) throw new Error("Ajoutez entre 1 et 20 articles avant de demander un devis.");
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error("Le panier contient un identifiant en double.");
  const snapshot = items.map(item => makeItem(item, item.id));
  return { id, reference: "JB-" + id.slice(0, 8).toUpperCase(), items: snapshot, customer: validateCustomer(customer), status: "awaiting_quote", createdAt: now, updatedAt: now, history: [{ text: "Demande de devis envoyée", at: now }] };
}
export function productTotal(items: Item[], prices: Record<string, number>): number {
  return items.reduce((sum, item) => sum + (prices[item.id] ?? 0) * item.quantity, 0);
}
export function publishQuote(order: Order, draft: { unitPrices: Record<string, number>; costs: Costs; validDays: number; minDays: number; maxDays: number; note: string }, now: string): Order {
  if (!["awaiting_quote", "quote_ready"].includes(order.status)) throw new Error("Ce devis ne peut plus être modifié après acceptation ou refus.");
  if (Object.keys(draft.unitPrices).length !== order.items.length || order.items.some(item => !Number.isSafeInteger(draft.unitPrices[item.id]) || draft.unitPrices[item.id] <= 0)) throw new Error("Chiffrez chaque article avec un prix unitaire supérieur à zéro.");
  if (Object.keys(draft.costs).length !== 4 || Object.values(draft.costs).some(value => !Number.isSafeInteger(value) || value < 0) || ["transport", "customs", "service", "delivery"].some(key => !Object.hasOwn(draft.costs, key))) throw new Error("Vérifiez les frais du devis.");
  if (!Number.isInteger(draft.validDays) || draft.validDays < 1 || draft.validDays > 30) throw new Error("La validité doit être comprise entre 1 et 30 jours.");
  if (!Number.isInteger(draft.minDays) || !Number.isInteger(draft.maxDays) || draft.minDays < 1 || draft.maxDays < draft.minDays || draft.maxDays > 180) throw new Error("Indiquez une fourchette de livraison cohérente (1 à 180 jours ouvrés).");
  if (draft.note.length > 1000) throw new Error("La note du devis est trop longue.");
  const total = productTotal(order.items, draft.unitPrices) + Object.values(draft.costs).reduce((sum, value) => sum + value, 0);
  const quote: Quote = { version: (order.quote?.version ?? 0) + 1, unitPrices: { ...draft.unitPrices }, costs: { ...draft.costs }, total, validUntil: new Date(Date.parse(now) + draft.validDays * 86400000).toISOString(), minDays: draft.minDays, maxDays: draft.maxDays, note: draft.note.trim(), createdAt: now };
  return { ...order, quote, status: "quote_ready", updatedAt: now, history: [...order.history, { text: "Devis v" + quote.version + " disponible", at: now }] };
}
function decideQuote(order: Order, version: number, accept: boolean, now: string): Order {
  if (order.status !== "quote_ready" || !order.quote || order.quote.version !== version) throw new Error("Le devis a changé. Consultez sa dernière version.");
  if (Date.parse(now) >= Date.parse(order.quote.validUntil)) throw new Error("Ce devis a expiré. Contactez Jibli pour une nouvelle proposition.");
  return { ...order, status: accept ? "awaiting_payment" : "declined", ...(accept ? { acceptedVersion: version } : {}), updatedAt: now, history: [...order.history, { text: accept ? "Devis v" + version + " accepté" : "Devis refusé par le client", at: now }] };
}
export function acceptQuote(order: Order, version: number, now: string) { return decideQuote(order, version, true, now); }
export function declineQuote(order: Order, version: number, now: string) { return decideQuote(order, version, false, now); }
export function declarePayment(order: Order, address: string, reference: string, now: string): Order {
  if (order.status !== "awaiting_payment" || order.acceptedVersion !== order.quote?.version) throw new Error("Acceptez le devis actuel avant de poursuivre.");
  if (address.trim().length < 10 || address.length > 500) throw new Error("Indiquez une adresse de livraison complète (10 à 500 caractères).");
  if (reference.trim().length < 6 || reference.length > 100) throw new Error("Indiquez une référence de paiement fictive (6 à 100 caractères).");
  return { ...order, address: address.trim(), paymentReference: reference.trim(), status: "payment_review", updatedAt: now, history: [...order.history, { text: "Paiement simulé déclaré · vérification admin attendue", at: now }] };
}
export function advanceOrder(order: Order, next: Status, now: string, tracking = ""): Order {
  const allowed: Partial<Record<Status, Status>> = { payment_review: "ordered", ordered: "in_transit", in_transit: "delivered" };
  if (allowed[order.status] !== next) throw new Error("Cette étape n’est pas disponible pour cette demande.");
  if (next === "in_transit" && (tracking.trim().length < 4 || tracking.length > 160)) throw new Error("Ajoutez une référence de suivi (4 à 160 caractères).");
  return { ...order, status: next, ...(next === "in_transit" ? { tracking: tracking.trim() } : {}), updatedAt: now, history: [...order.history, { text: labels[next], at: now }] };
}
