export type AuthState = { error?: string; message?: string; next?: "/espace" | "/compte" };

export function signupError(code?: string): string {
  switch (code) {
    case "email_address_not_authorized": return "Pour ce test, utilisez l’adresse e-mail du compte propriétaire Supabase. L’envoi aux autres adresses nécessite un service e-mail configuré.";
    case "over_email_send_rate_limit": return "La limite d’envoi des e-mails est atteinte. Patientez avant de réessayer.";
    case "over_request_rate_limit": return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "weak_password": return "Choisissez un mot de passe plus robuste, avec au moins 12 caractères.";
    case "signup_disabled": return "Les inscriptions sont momentanément désactivées.";
    case "unexpected_failure": return "L’e-mail de confirmation n’a pas pu être envoyé. Vérifiez la configuration e-mail du projet Supabase, notamment qu’aucun SMTP incomplet n’est activé.";
    default: return "Création impossible. Vérifiez les informations ou réessayez plus tard.";
  }
}

// A rejected Server Action response must not crash the entire account page.
// Never expose raw exceptions, which may contain request or credential details.
export async function recoverAuthResponse(operation: () => Promise<AuthState>): Promise<AuthState> {
  try { return await operation(); }
  catch { return { error: "La réponse du serveur n’a pas pu être reçue. Rechargez la page puis réessayez. Si le problème persiste, ouvrez Jibli dans une fenêtre privée." }; }
}
