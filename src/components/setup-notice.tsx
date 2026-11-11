import Link from "next/link";
export function SetupNotice() {
  return <section className="panel account-panel"><span className="eyebrow">ESPACE CLIENT EN PRÉPARATION</span><h1>La connexion arrive.</h1><p>La base de données doit être configurée pour activer les comptes et enregistrer les demandes.</p><p>En attendant, vous pouvez explorer le parcours avec des données fictives.</p><Link href="/" className="button primary">Explorer la démo</Link></section>;
}
