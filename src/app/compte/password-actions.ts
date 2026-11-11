"use server";
import { serverClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/app-origin";
export type PasswordState = { error?: string; message?: string; done?: boolean };
const resetMessage = "Si cette adresse correspond à un compte et que l’envoi est autorisé, vous recevrez un lien pour choisir un nouveau mot de passe. Consultez aussi les courriers indésirables. Si rien n’arrive, patientez avant de réessayer.";

export async function requestPasswordReset(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indiquez une adresse e-mail valide." };
  try {
    const supabase = await serverClient();
    // Keep the same public response for nonexistent, restricted and known
    // addresses. Do not expose provider errors or account existence.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL("/auth/recuperation", appOrigin()).toString() });
  } catch { return { error: "Le service est momentanément indisponible. Réessayez plus tard." }; }
  return { message: resetMessage, done: true };
}

export async function updatePassword(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (password.length < 12 || password.length > 128) return { error: "Choisissez un mot de passe de 12 à 128 caractères." };
  if (password !== confirmation) return { error: "Les deux mots de passe ne correspondent pas." };
  try {
    const supabase = await serverClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: "Votre session a expiré. Demandez un nouveau lien de récupération." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === "same_password") return { error: "Choisissez un mot de passe différent du précédent." };
      if (error.code === "weak_password") return { error: "Ce mot de passe est trop faible. Choisissez une phrase de passe unique et plus longue." };
      return { error: "Le mot de passe n’a pas pu être modifié. Vérifiez votre session et réessayez." };
    }
    // Keep this verified session for the success screen. Other refresh sessions
    // are revoked; do not claim that already issued access tokens vanish.
    const { error: logoutError } = await supabase.auth.signOut({ scope: "others" });
    return { done: true, message: logoutError ? "Votre mot de passe a été mis à jour. La fermeture des autres sessions n’a pas pu être confirmée." : "Votre mot de passe a été mis à jour." };
  } catch { return { error: "La réponse n’a pas pu être confirmée. Essayez de vous connecter avec le nouveau mot de passe avant de relancer la modification." }; }
}
