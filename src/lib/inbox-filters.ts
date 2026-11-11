import { labels, type Status } from "./domain";
export const INBOX_PAGE_SIZE = 25;
export type InboxFilters = { q: string; status: "all" | Status; page: number };
export type InboxSearchParams = Record<string, string | string[] | undefined>;
export function inboxFilters(params: InboxSearchParams): InboxFilters {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const q = first(params.q).replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,80);
  const status = first(params.status);
  const page = first(params.page);
  return { q, status: Object.hasOwn(labels,status) ? status as Status : "all", page: /^[1-9][0-9]{0,5}$/.test(page) ? Math.min(Number(page),10000) : 1 };
}
export function inboxSearchFilter(q: string) {
  // PostgREST OR expressions require quoted/escaped values. Never interpolate
  // raw customer text as filter syntax. SQL LIKE wildcards are escaped too.
  const pattern = "%" + q.replace(/[\\%_]/g,"\\$&") + "%";
  const value = JSON.stringify(pattern);
  return ["reference","customer_name","email","phone","city"].map(column => `${column}.ilike.${value}`).join(",");
}
export function inboxHref(filters: InboxFilters, overrides: Partial<InboxFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q",next.q);
  if (next.status !== "all") params.set("status",next.status);
  if (next.page > 1) params.set("page",String(next.page));
  return "/gestion" + (params.size ? "?"+params.toString() : "");
}
