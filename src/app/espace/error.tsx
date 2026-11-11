"use client";
export default function Error({ reset }: { reset: () => void }) { return <section className="panel account-panel"><h1>Votre espace est momentanément indisponible.</h1><p>Vérifiez votre connexion et réessayez.</p><button className="button primary" onClick={reset}>Réessayer</button></section>; }
