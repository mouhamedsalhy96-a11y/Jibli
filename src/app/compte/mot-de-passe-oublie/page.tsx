import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";
import { ForgotPasswordForm } from "@/components/password-forms";
export const metadata = { title: "Mot de passe oublié" };
async function Recovery() {
  await connection();
  if (!supabaseConfig()) return <SetupNotice/>;
  return <section className="panel account-panel"><span className="eyebrow">RÉCUPÉRATION DU COMPTE</span><h1>Mot de passe oublié ?</h1><p>Indiquez l’adresse utilisée pour votre compte Jibli. Nous vous proposerons de choisir un nouveau mot de passe.</p><ForgotPasswordForm/><Link className="text-link password-back" href="/compte">Revenir à la connexion</Link></section>;
}
export default function Page() { return <div className="page-container"><Suspense fallback={<p role="status">Chargement…</p>}><Recovery/></Suspense></div>; }
