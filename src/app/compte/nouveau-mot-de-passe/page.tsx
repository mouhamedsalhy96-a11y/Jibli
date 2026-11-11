import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { SetupNotice } from "@/components/setup-notice";
import { NewPasswordForm } from "@/components/password-forms";
export const metadata = { title: "Nouveau mot de passe" };
async function NewPassword() {
  await connection();
  if (!supabaseConfig()) return <SetupNotice/>;
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return <section className="panel account-panel"><h1>Votre session n’est plus valide.</h1><p>Demandez un nouveau lien et ouvrez-le dans le navigateur qui a servi à la demande.</p><Link href="/compte/mot-de-passe-oublie" className="button primary">Demander un nouveau lien</Link></section>;
  return <section className="panel account-panel"><span className="eyebrow">SÉCURITÉ DU COMPTE</span><h1>Choisissez un nouveau mot de passe.</h1><p>La modification concerne votre compte connecté : <strong>{data.user.email}</strong>.</p><NewPasswordForm/></section>;
}
export default function Page() { return <div className="page-container"><Suspense fallback={<p role="status">Vérification de votre session…</p>}><NewPassword/></Suspense></div>; }
