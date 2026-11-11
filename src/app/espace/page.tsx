import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requestWorkspace } from "@/lib/requests";
import { supabaseConfig } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { PersistentRequest } from "@/components/persistent-request";
import { SavedRequests } from "@/components/saved-requests";
import { SignOut } from "@/components/account-form";
export const metadata = { title: "Mon espace client" };
async function Workspace() {
  await connection();
  if (!supabaseConfig()) return <SetupNotice/>;
  const data = await requestWorkspace();
  return <><div className="workspace-heading"><div><span className="eyebrow">MON ESPACE CLIENT</span><h1>Vos demandes, bien gardées.</h1><p>{data.user.email}</p></div><SignOut/></div><p className="workspace-notice">Espace de test connecté : les demandes envoyées ici sont enregistrées. Aucun achat ni paiement réel. Le panier non envoyé est conservé dans cet onglet jusqu’à sa fermeture.</p>{data.isAdmin && <p><Link href="/gestion" className="button secondary">Ouvrir la gestion protégée</Link></p>}{data.error ? <section className="panel" role="alert"><h2>Demandes indisponibles</h2><p>Impossible de charger vos demandes. Réessayez plus tard ou vérifiez que la migration Supabase a été appliquée.</p></section> : <><PersistentRequest email={data.user.email ?? ""}/><SavedRequests requests={data.requests}/></>}</>;
}
export default function Page() { return <div className="page-container connected-workspace"><Suspense fallback={<p role="status">Chargement de votre espace privé…</p>}><Workspace/></Suspense></div>; }
