import { publishQuote, type Item, type Order } from "./domain";
const customer = { name: "Client démo", email: "client@example.com", phone: "+21620202020", city: "Tunis" };
const shirt: Item = { id: "item-demo-1", shop: "shein", title: "Chemise en coton", variant: "Beige · Taille M", quantity: 2, note: "Exemple fictif, lien à remplacer.", url: "https://fr.shein.com/" };
const headphones: Item = { id: "item-demo-2", shop: "aliexpress", title: "Casque audio sans fil", variant: "Noir · Sans variante", quantity: 1, note: "Exemple fictif, lien à remplacer.", url: "https://www.aliexpress.com/" };
function base(id: string, reference: string, items: Item[]): Order {
  return { id, reference, items, customer: { ...customer }, status: "awaiting_quote", createdAt: "2026-11-11T09:00:00.000Z", updatedAt: "2026-11-11T09:00:00.000Z", history: [{ text: "Demande de devis envoyée", at: "2026-11-11T09:00:00.000Z" }] };
}
export const demoOrders: Order[] = [
  base("demo-request-1", "JB-DEMO001", [{ ...shirt }]),
  publishQuote(base("demo-request-2", "JB-DEMO002", [{ ...headphones }]), { unitPrices: { "item-demo-2": 65000 }, costs: { transport: 18000, customs: 8000, service: 9000, delivery: 7000 }, validDays: 30, minDays: 12, maxDays: 18, note: "Exemple de devis fictif. Les frais et délais sont purement illustratifs." }, "2026-11-11T10:00:00.000Z"),
];
