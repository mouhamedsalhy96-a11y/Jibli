import Link from "next/link";
export default function NotFound() { return <section className="page-container empty-state"><h1>Cette page a pris un autre chemin.</h1><p>Revenez au panier pour retrouver Jibli.</p><Link className="button primary" href="/">Revenir au panier</Link></section>; }
