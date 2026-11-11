"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "./store";
import { ErrorMessage, ItemList } from "./ui";
import { saveRequest } from "@/app/espace/actions";
export function PersistentRequest({ email }: { email: string }) {
  const { items, clearBasket } = useStore();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const id = submissionId || crypto.randomUUID(); setSubmissionId(id);
    try {
      const result = await saveRequest({ id, name: String(form.get("name")), phone: String(form.get("phone")), city: String(form.get("city")), items });
      if (result.error) setError(result.error);
      else if (result.reference) { setReference(result.reference); clearBasket(); setSubmissionId(""); router.refresh(); }
    } catch { setError("La demande n’a pas pu être confirmée. Réessayez sans quitter cette page."); }
    finally { setPending(false); }
  }
  return <section className="panel"><span className="eyebrow">ENREGISTRER MON PANIER</span><h2>Votre prochaine demande</h2><p>Envoi associé au compte <strong>{email}</strong>. Aucun achat ni paiement à cette étape.</p>{reference && <p role="status">Demande enregistrée : <strong>{reference}</strong>. Elle reste disponible après rechargement.</p>}
  {items.length ? <><ItemList items={items}/><form onSubmit={submit}><fieldset disabled={pending} className="request-fieldset"><label htmlFor="saved-name">Nom</label><input id="saved-name" name="name" required minLength={2} maxLength={100} autoComplete="name"/><div className="two-columns"><div><label htmlFor="saved-phone">Téléphone tunisien</label><input id="saved-phone" name="phone" type="tel" required maxLength={20} autoComplete="tel"/></div><div><label htmlFor="saved-city">Ville</label><input id="saved-city" name="city" required minLength={2} maxLength={100} autoComplete="address-level2"/></div></div><label className="checkbox-label"><input type="checkbox" required/>Je souhaite enregistrer cette demande de test dans mon compte.</label><ErrorMessage text={error}/><button className="button primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer ma demande de devis"}</button></fieldset></form></> : <div className="empty-request-guide"><h3>Ajoutez un premier article pour afficher le formulaire.</h3><p>Ouvrez votre panier, renseignez le lien, le nom et la variante, puis cliquez sur « Ajouter au panier ». Revenez ici avec « Continuer vers mon espace client » dans le même onglet.</p><Link href="/" className="button primary">Ajouter mon premier article</Link></div>}
  </section>;
}
