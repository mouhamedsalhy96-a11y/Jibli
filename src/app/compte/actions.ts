"use server";
import { serverClient } from "@/lib/supabase/server";
import { signupError, type AuthState } from "@/lib/auth-feedback";
import { appOrigin } from "@/lib/app-origin";
export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const signup = form.get("mode") === "signup";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) return { error: "Indiquez un e-mail valide et un mot de passe de 12 à 128 caractères." };
  try {
    const supabase = await serverClient();
    if (signup) {
      const origin = appOrigin();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/callback", origin).toString() } });
      if (error) return { error: signupError(error.code) };
      if (!data.session) return { message: "Consultez votre messagerie pour confirmer votre adresse, puis connectez-vous. Si un compte existe déjà, utilisez la connexion." };
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: "Connexion impossible. Vérifiez vos identifiants et la confirmation de votre adresse e-mail." };
    }
  } catch { return { error: "Le service de connexion est indisponible. Réessayez dans un instant." }; }
  return { next: "/espace" };
}
export async function signOut(): Promise<AuthState> {
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Déconnexion impossible. Réessayez." };
  } catch { return { error: "Le service est indisponible. Réessayez." }; }
  return { next: "/compte" };
}
