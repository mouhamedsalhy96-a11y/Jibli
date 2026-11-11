"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type PasswordState } from "@/app/compte/password-actions";
import { ErrorMessage } from "./ui";
import { SignOut } from "./account-form";
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(async(previous,form) => {
    try { return await requestPasswordReset(previous,form); }
    catch { return { error: "La réponse du serveur n’a pas pu être reçue. Rechargez la page puis réessayez." }; }
  }, {});
  return <form action={action}><label htmlFor="reset-email">Adresse e-mail du compte</label><input id="reset-email" type="email" name="email" required maxLength={254} autoComplete="email" disabled={pending}/><ErrorMessage text={state.error ?? ""}/>{state.message && <p role="status" className="password-notice">{state.message}</p>}<button className="button primary" disabled={pending || state.done}>{pending ? "Envoi…" : state.done ? "Demande traitée" : "Recevoir un lien de récupération"}</button><p className="form-footnote">Ouvrez le lien dans le même navigateur et la même session de navigation privée que celle utilisée pour cette demande.</p></form>;
}
export function NewPasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(async(previous,form) => {
    try { return await updatePassword(previous,form); }
    catch { return { error: "La réponse du serveur n’a pas pu être reçue. Vérifiez la connexion avec le nouveau mot de passe avant de réessayer." }; }
  }, {});
  if (state.done) return <div className="password-success"><h2>Mot de passe mis à jour.</h2><p role="status">{state.message}</p><Link href="/espace" className="button primary">Revenir à mon espace</Link><p>Vous pouvez aussi vous déconnecter pour tester votre nouveau mot de passe.</p><SignOut/></div>;
  return <form action={action}><fieldset className="request-fieldset" disabled={pending}><label htmlFor="new-password">Nouveau mot de passe</label><input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><label htmlFor="confirm-password">Confirmer le nouveau mot de passe</label><input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/><p className="muted">12 caractères minimum. Utilisez un mot de passe unique, différent du précédent.</p><ErrorMessage text={state.error ?? ""}/><button className="button primary" disabled={pending}>{pending ? "Modification…" : "Enregistrer mon nouveau mot de passe"}</button></fieldset></form>;
}
