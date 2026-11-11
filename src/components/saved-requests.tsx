import { requestOrder, type SavedRequest } from "@/lib/requests";
import { dateLabel, money } from "@/lib/domain";
import { ItemList } from "./ui";
import { Progress, QuoteBreakdown, Timeline } from "./order-shared";
import { SavedQuoteDecision, SavedQuoteEditor } from "./saved-quote-controls";
import { DeliveryDetails } from "./delivery-details";
import { SimulationControls } from "./simulation-controls";
import { StatusBadge } from "./ui";
export function SavedRequests({ requests, admin = false, filtered = false }: { requests: SavedRequest[]; admin?: boolean; filtered?: boolean }) {
  return <section className="panel saved-requests-panel"><h2>{admin ? "Demandes reçues" : "Mes demandes enregistrées"}</h2><p className="muted">{admin ? "Demandes de cette page." : "Vos 100 demandes les plus récentes."} Ouvrez une demande pour consulter ses détails et les prochaines étapes.</p>{!requests.length && <div className="request-empty-state"><h3>{filtered ? "Aucun résultat pour ces filtres." : admin ? "Aucune demande reçue pour le moment." : "Votre première demande vous attend."}</h3><p>{admin ? filtered ? "Modifiez votre recherche ou effacez les filtres pour retrouver toutes les demandes." : "Les demandes envoyées par les clients apparaîtront ici." : "Ajoutez des articles à votre panier, puis envoyez-le depuis votre espace client."}</p></div>}
    {requests.map(request => {
      const order = requestOrder(request);
      const delivery = request.jibli_deliveries;
      const simulation = request.jibli_simulations;
      return <details className="saved-request" key={request.id}>
        <summary><span className="saved-request-identity"><strong>{request.reference}</strong><span>{request.customer_name} · {request.city} · {dateLabel(request.created_at)}</span></span><span className="saved-request-status">{simulation && <span className="simulation-label">Simulation</span>}<StatusBadge status={request.status}/></span></summary>
        <div className="saved-request-body">
        {admin && <div className="request-contact"><span>{request.customer_name}</span><span>{request.email}</span><span>{request.phone}</span></div>}
        <section className="saved-products"><div className="section-heading"><h3>Les articles demandés</h3><span>{order.items.reduce((sum,item) => sum+item.quantity,0)} unité(s)</span></div><ItemList items={order.items} prices={order.quote?.unitPrices}/></section><QuoteBreakdown order={order}/>
        {admin && ["awaiting_quote","quote_ready"].includes(order.status) && <SavedQuoteEditor key={request.id+request.current_version} order={order}/>}
        {!admin && order.status === "quote_ready" && <SavedQuoteDecision key={request.id+request.current_version} order={order}/>}
        {["awaiting_payment","payment_review","ordered","in_transit","delivered"].includes(order.status) && <>
          <p className="workspace-notice">Parcours de test uniquement. Aucun argent n’est encaissé et aucun colis n’est réellement expédié. Les étapes de paiement et de transport ci-dessous sont simulées.</p>
          <Progress order={order}/>
          {delivery ? <section className="delivery-summary"><h3>Livraison enregistrée</h3><p>{request.customer_name} · {request.phone}</p><p className="delivery-address">{delivery.address}</p><p>{delivery.postcode} {delivery.city}</p><p className="muted">Mise à jour le {dateLabel(delivery.updated_at)} · Révision {delivery.revision}</p></section> : admin && <p className="workspace-notice">Le client doit encore renseigner son adresse de livraison dans son espace.</p>}
          {!admin && order.status === "awaiting_payment" && <DeliveryDetails key={request.id+":"+(delivery?.revision ?? 0)} requestId={request.id} quoteVersion={request.accepted_version!} city={request.city} delivery={delivery}/>}
          {simulation && <section className="simulation-panel"><span className="eyebrow">PAIEMENT FICTIF</span><p>Référence : <strong>{simulation.reference}</strong></p><p>Montant simulé : <strong>{money(simulation.amount)}</strong></p><p>{simulation.confirmed_at ? "Confirmation simulée enregistrée par l’administration." : "En attente de confirmation simulée par l’administration."}</p>{simulation.tracking && <p>Transport fictif : <strong>{simulation.tracking}</strong></p>}{order.status === "delivered" && <p>Parcours terminé : livraison simulée enregistrée.</p>}</section>}
          <SimulationControls key={request.id+request.status} requestId={request.id} version={request.accepted_version!} deliveryRevision={delivery?.revision ?? 0} status={request.status} admin={admin}/>
        </>}
        {order.status === "declined" && <p className="workspace-notice">Devis refusé. Aucun paiement n’est attendu. Vous pouvez créer une nouvelle demande.</p>}
        <Timeline order={order}/>
        </div>
      </details>;
    })}
  </section>;
}
