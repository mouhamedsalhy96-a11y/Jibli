import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/account-form";
import { SetupNotice } from "@/components/setup-notice";
export const metadata = { title: "Mon compte" };
async function Account() {
  await connection();
  if (!supabaseConfig()) return <SetupNotice/>;
  const supabase = await serverClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/espace");
  return <section className="panel account-panel"><span className="eyebrow">VOTRE COMPTE JIBLI</span><h1>Bienvenue chez vous.</h1><p>Connectez-vous pour enregistrer vos demandes et les retrouver après votre prochaine visite.</p><p className="muted">Version de test : utilisez des coordonnées de test. Aucun paiement ni achat n’est activé.</p><AccountForm/></section>;
}
export default function Page() { return <div className="page-container"><Suspense fallback={<p role="status">Vérification de votre session…</p>}><Account/></Suspense></div>; }
