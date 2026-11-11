import Link from "next/link";
import { labels } from "@/lib/domain";
import { inboxHref, INBOX_PAGE_SIZE, type InboxFilters } from "@/lib/inbox-filters";
export function InboxToolbar({ filters, total, page }: { filters: InboxFilters; total: number; page: number }) {
  const active = { ...filters, page };
  const shortcuts = [{status:"all",label:"Toutes"},{status:"awaiting_quote",label:"À chiffrer"},{status:"payment_review",label:"Paiements simulés à vérifier"},{status:"in_transit",label:"Acheminements simulés"}] as const;
  return <section className="panel inbox-toolbar" aria-labelledby="inbox-filters-heading"><h2 id="inbox-filters-heading">Retrouver une demande</h2><form method="get" action="/gestion" className="inbox-filter-form"><div><label htmlFor="inbox-search">Référence, nom, e-mail, téléphone ou ville</label><input type="search" id="inbox-search" name="q" maxLength={80} defaultValue={filters.q} placeholder="Ex. JB-…, Tunis, nom du client…"/></div><div><label htmlFor="inbox-status">Statut</label><select id="inbox-status" name="status" defaultValue={filters.status}><option value="all">Tous les statuts</option>{Object.entries(labels).map(([status,label]) => <option key={status} value={status}>{["payment_review","ordered","in_transit","delivered"].includes(status) ? "Simulation · " : ""}{label}</option>)}</select></div><button className="button primary" type="submit">Rechercher</button><Link href="/gestion" className="text-link">Effacer les filtres</Link></form>
    <nav className="inbox-shortcuts" aria-label="Filtres rapides">{shortcuts.map(shortcut => <Link key={shortcut.status} href={inboxHref(active,{status:shortcut.status,page:1})} className={"button secondary " + (filters.status===shortcut.status ? "selected-filter" : "")} aria-current={filters.status===shortcut.status ? "page" : undefined}>{shortcut.label}</Link>)}</nav>
    <p className="inbox-result-summary" role="status">{total} demande{total!==1 ? "s" : ""}{filters.q || filters.status!=="all" ? " correspondant aux filtres" : " au total"}. {INBOX_PAGE_SIZE} maximum par page, les plus récentes en premier.</p>
  </section>;
}
export function InboxPagination({ filters, total, page }: { filters: InboxFilters; total: number; page: number }) {
  const pages = Math.max(1,Math.ceil(total/INBOX_PAGE_SIZE));
  if (!total) return null;
  return <nav className="inbox-pagination" aria-label="Pages des demandes"><div>{page>1 && <Link href={inboxHref(filters,{page:page-1})} className="button secondary">← Précédente</Link>}</div><span>Page {page} sur {pages}</span><div>{page<pages && <Link href={inboxHref(filters,{page:page+1})} className="button secondary">Suivante →</Link>}</div></nav>;
}
