import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requestWorkspace } from "@/lib/requests";
import { supabaseConfig } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { SavedRequests } from "@/components/saved-requests";
import { SignOut } from "@/components/account-form";
import { inboxFilters, type InboxSearchParams } from "@/lib/inbox-filters";
import { InboxPagination, InboxToolbar } from "@/components/inbox-toolbar";
export const metadata = { title: "Gestion protégée" };
async function Management({ searchParams }: { searchParams: Promise<InboxSearchParams> }) {
  await connection();
  if (!supabaseConfig()) return <SetupNotice/>;
  const filters = inboxFilters(await searchParams);
  const data = await requestWorkspace(true,filters);
  if (data.forbidden) return <section className="panel"><h1>Accès réservé à l’équipe Jibli.</h1><p>Votre compte ne dispose pas du rôle administrateur.</p><Link href="/espace" className="button primary">Mon espace client</Link></section>;
  return <><div className="workspace-heading"><div><span className="eyebrow">GESTION PROTÉGÉE</span><h1>Les demandes de vos clients.</h1><p>{data.user.email}</p></div><SignOut/></div><p className="workspace-notice">Préparez et publiez les devis de test. Chaque version est enregistrée ; un devis accepté ou refusé est verrouillé. Les paiements et transports restent simulés.</p>{data.error ? <p className="panel" role="alert">Impossible de charger les demandes. Vérifiez la connexion et la migration Supabase.</p> : <><InboxToolbar key={JSON.stringify(filters)} filters={filters} total={data.total} page={data.page}/><SavedRequests requests={data.requests} admin filtered={Boolean(filters.q || filters.status!=="all")}/><InboxPagination filters={filters} total={data.total} page={data.page}/></>}</>;
}
export default function Page({ searchParams }: { searchParams: Promise<InboxSearchParams> }) { return <div className="page-container connected-workspace"><Suspense fallback={<p role="status">Vérification de votre accès administrateur…</p>}><Management searchParams={searchParams}/></Suspense></div>; }
