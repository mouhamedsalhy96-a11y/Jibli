"use client";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { demoOrders } from "@/lib/demo-data";
import { newOrder, type Customer, type Item, type Order } from "@/lib/domain";
import { createBasketDraft } from "@/lib/basket-draft";
const basketDraft = createBasketDraft(() => window.sessionStorage);
type Store = { items: Item[]; orders: Order[]; clearBasket: () => void; addItem: (item: Item) => void; removeItem: (id: string) => void; setQuantity: (id: string, quantity: number) => void; requestQuote: (customer: Customer) => Order; changeOrder: (id: string, update: (order: Order) => Order) => void; reset: () => void };
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(basketDraft.subscribe, basketDraft.getSnapshot, basketDraft.getServerSnapshot);
  const setItems = (change: Item[] | ((current: Item[]) => Item[])) => basketDraft.update(current => typeof change === "function" ? change(current) : change);
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  function addItem(item: Item) { if (items.length >= 20) throw new Error("Le panier est limité à 20 articles."); setItems(current => [...current, item]); }
  function setQuantity(id: string, quantity: number) { if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return; setItems(current => current.map(item => item.id === id ? { ...item, quantity } : item)); }
  function requestQuote(customer: Customer) {
    const order = newOrder(items, customer, crypto.randomUUID(), new Date().toISOString());
    setOrders(current => [order, ...current]); setItems([]); return order;
  }
  function changeOrder(id: string, update: (order: Order) => Order) {
    const order = orders.find(entry => entry.id === id);
    if (!order) throw new Error("Demande introuvable.");
    const changed = update(order);
    setOrders(current => current.map(entry => entry.id === id ? changed : entry));
  }
  return <Context.Provider value={{ items, orders, clearBasket: () => setItems([]), addItem, removeItem: id => setItems(current => current.filter(item => item.id !== id)), setQuantity, requestQuote, changeOrder, reset: () => setOrders(demoOrders) }}>{children}</Context.Provider>;
}
export function useStore() { const store = useContext(Context); if (!store) throw new Error("StoreProvider manquant."); return store; }
