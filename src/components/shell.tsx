"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "./store";
import { Icon, Logo } from "./ui";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const demo = path === "/admin" || path === "/mes-demandes";
  const { items, reset } = useStore();
  return <>
    <a className="skip-link" href="#main">Aller au contenu</a>
    <div className="prototype-bar"><span className="prototype-dot"/><strong>{demo ? "Démonstration temporaire" : "Jibli · version de test"}</strong><span>{demo ? "Données fictives réinitialisées au rechargement" : "Paiements et livraisons simulés · Aucun achat réel"}</span></div>
    <header className="site-header"><div className="header-inner"><Link href="/" aria-label="Jibli, accueil"><Logo/></Link><nav aria-label="Navigation principale"><Link href="/" aria-current={path === "/" ? "page" : undefined} className={path === "/" ? "active" : ""}>Mon panier {items.length > 0 && <span className="nav-count">{items.length}</span>}</Link><Link href="/espace" aria-current={path.startsWith("/espace") ? "page" : undefined} className={path.startsWith("/espace") ? "active" : ""}>Mes demandes</Link></nav><div className="header-actions"><Link href="/compte" className={"account-link " + (path.startsWith("/compte") ? "active" : "")} aria-current={path.startsWith("/compte") ? "page" : undefined}>Mon compte</Link><Link href="/gestion" className={"admin-link " + (path.startsWith("/gestion") ? "active" : "")} aria-current={path.startsWith("/gestion") ? "page" : undefined}><Icon name="shield" size={17}/>Administration</Link></div></div></header>
    <main id="main">{children}</main>
    <footer className="site-footer"><div><Logo/><p>Vos envies d’ailleurs. Un devis en dinars.</p></div><p>Jibli est un projet indépendant, sans affiliation à SHEIN ou AliExpress.</p><div className="footer-links"><nav aria-label="Démonstrations temporaires"><Link href="/mes-demandes">Démo des devis</Link><Link href="/admin">Démo de l’administration</Link></nav>{demo && <button type="button" className="reset-link" onClick={() => { if (window.confirm("Réinitialiser la simulation ? Les demandes fictives de cet onglet seront effacées. Les demandes enregistrées dans votre compte sont conservées.")) reset(); }}>Réinitialiser la simulation</button>}</div></footer>
  </>;
}
