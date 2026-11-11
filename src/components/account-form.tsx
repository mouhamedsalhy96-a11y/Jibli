"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticate, signOut } from "@/app/compte/actions";
import { recoverAuthResponse, type AuthState } from "@/lib/auth-feedback";
import { ErrorMessage } from "./ui";
export function AccountForm() {
  const [mode, setMode] = useState("login");
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(async (previous, form) => {
    const result = await recoverAuthResponse(() => authenticate(previous, form));
    if (result.next) { router.replace(result.next); router.refresh(); }
    return result;
  }, {});
  return <><div className="button-row"><button type="button" className="button secondary" disabled={pending} aria-pressed={mode === "login"} onClick={() => setMode("login")}>Se connecter</button><button type="button" className="button secondary" disabled={pending} aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>Créer un compte</button></div><form action={action}>
    <input type="hidden" name="mode" value={mode}/>
    <label htmlFor="account-email">Adresse e-mail</label><input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254}/>
    <label htmlFor="account-password">Mot de passe</label><input id="account-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={12} maxLength={128}/><p className="muted">12 caractères minimum. Choisissez un mot de passe unique.</p>
    <ErrorMessage text={state.error ?? ""}/>{state.message && <p role="status">{state.message}</p>}
    <button className="button primary" disabled={pending}>{pending ? "Veuillez patienter…" : mode === "signup" ? "Créer mon compte" : "Me connecter"}</button>
  </form>{mode === "login" && <Link href="/compte/mot-de-passe-oublie" className="text-link password-back">Mot de passe oublié ?</Link>}</>;
}
export function SignOut() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(async () => {
    const result = await recoverAuthResponse(signOut);
    if (result.next) { router.replace(result.next); router.refresh(); }
    return result;
  }, {});
  return <form action={action}><button className="button secondary" disabled={pending}>{pending ? "Déconnexion…" : "Se déconnecter"}</button><ErrorMessage text={state.error ?? ""}/></form>;
}
