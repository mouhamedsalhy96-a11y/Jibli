import { makeItem, type Item } from "./domain";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = "jibli:basket:v1";
const empty: Item[] = [];

function decode(raw: string | null): Item[] {
  if (!raw || raw.length > 80000) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 20) return empty;
    const items = parsed.map(item => {
      if (!item || typeof item.id !== "string" || !item.id || item.id.length > 100) throw new Error("Invalid draft");
      return makeItem(item, item.id);
    });
    if (new Set(items.map(item => item.id)).size !== items.length) return empty;
    return items;
  } catch { return empty; }
}

// Only product selections are stored. Customer details and authentication are
// never copied into this store. sessionStorage survives reloads in this tab.
export function createBasketDraft(getStorage: () => DraftStorage) {
  let snapshot: Item[] | undefined;
  const listeners = new Set<() => void>();
  function getSnapshot() {
    if (snapshot === undefined) {
      try { snapshot = decode(getStorage().getItem(key)); }
      catch { snapshot = empty; }
    }
    return snapshot;
  }
  return {
    getSnapshot,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update(change: (items: Item[]) => Item[]) {
      snapshot = change(getSnapshot());
      try {
        if (snapshot.length) getStorage().setItem(key, JSON.stringify(snapshot));
        else getStorage().removeItem(key);
      } catch { /* Storage may be disabled; the in-memory basket still works. */ }
      listeners.forEach(listener => listener());
    },
  };
}
