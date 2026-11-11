# Jibli — périmètre et architecture

## Objectif

Le client compose un panier à partir de liens marchands et reçoit un devis préparé par un administrateur. Après acceptation d’une version précise, il renseigne la livraison et règle en TND via un futur prestataire de paiement. La commande avance après vérification du paiement.

## Livré dans le prototype

Interface française, panier de vingt lignes maximum, variantes explicites, demandes de devis, ventilation des prix, validité, délais estimés, versions, acceptation/refus, paiement simulé, validation admin et suivi de livraison fictif. Les données sont en mémoire, sans authentification. Aucun secret ou système financier n’est requis pour essayer les écrans.

## Architecture cible

Le jalon comptes/demandes est implémenté séparément de la démo : Supabase SSR, confirmation e-mail, `/compte`, `/espace`, `/gestion`, tables `jibli_admins`, `jibli_requests`, `jibli_request_items`. L’envoi est une transaction PostgreSQL avec propriétaire et e-mail imposés, contrôles du panier et clé d’idempotence. Les tables sont en lecture seule via RLS pour les utilisateurs ; les insertions passent uniquement par la fonction dédiée. La configuration et la validation sur Supabase réel restent à effectuer : voir `supabase-setup.md`. Une deuxième migration ajoute les devis enregistrés et versionnés, les décisions réservées au propriétaire et le verrouillage transactionnel après acceptation/refus. Les totaux et l’expiration sont vérifiés dans PostgreSQL. Les paiements restent uniquement fictifs dans la démo.

- Next.js / TypeScript pour l’interface et les endpoints serveur.
- Supabase Auth pour les comptes clients et administrateurs.
- PostgreSQL avec politiques d’accès par propriétaire pour les demandes. Le rôle administrateur est attribué côté serveur.
- Tables envisagées : profiles, baskets, basket_items, quote_requests, quotes, quote_lines, quote_fees, orders, payment_attempts, shipments et order_events.
- Prix en millimes entiers. Version du devis acceptée conservée et non modifiable. Calculs et transitions refaits sur le serveur, pas seulement dans le navigateur.
- Prestataire de paiement adapté à l’activité, avec page de paiement hébergée et notifications serveur signées. Ne jamais stocker de numéro de carte. Une déclaration du client n’est pas une preuve d’encaissement.
- Transporteurs gérés manuellement au départ. Référence et événement de suivi associés à chaque commande. Les délais sont des estimations explicites.
- Français en premier. Routes et composants séparés du domaine métier ; extraire les textes dans des catalogues de traduction lors de l’ajout d’une langue.

## Prochains jalons

1. Valider ensemble le parcours et les informations demandées.
2. Connecter une base dédiée et les comptes client/admin avec tests d’isolation.
3. Gérer le devis sur le serveur avec expiration, concurrence, historique et notifications.
4. Choisir puis intégrer le prestataire de paiement réel et vérifier les webhooks, doublons, erreurs et remboursements.
5. Finaliser les règles opérationnelles : disponibilité, responsabilité d’importation, estimation/régularisation des frais, annulation et remboursement, gestion des transporteurs. Faire confirmer les contraintes applicables par les professionnels compétents avant de vendre réellement.
6. Déployer un environnement de test séparé, vérifier le parcours complet et décider des conditions d’ouverture.

## Décisions qui restent à prendre

Prestataire de paiement, achat en propre ou intermédiaire, agents de transport, calcul de la marge, traitement des variations de prix/frais, articles non disponibles et politique de remboursement. Ce prototype ne garantit pas que le service contourne ou satisfait une règle de change ou d’importation : ce point doit être établi indépendamment du code.

## Vérifications

Les tests du domaine couvrent les liens autorisés, montants en millimes, quantités, coordonnées, total du devis, versions, expiration, acceptation/refus et transitions de commande. Un test PostgreSQL embarqué vérifie aussi les politiques RLS, l’attribution des rôles, l’envoi atomique et l’idempotence. Supabase Auth est remplacé par un schéma minimal dans ce test : le parcours réel de confirmation e-mail, sessions/cookies et les accès sur le projet hébergé doivent encore être vérifiés. Aucun paiement réel n’est testé.


## Livraison après acceptation

La troisième migration ajoute `jibli_deliveries`, `jibli_delivery_events` et la fonction transactionnelle `jibli_save_delivery`. Le propriétaire doit avoir accepté le devis courant. La ville du devis reste fixe ; l’adresse et le code postal sont modifiables avec contrôle de révision. L’historique enregistre les changements sans dupliquer les anciennes adresses. L’enregistrement ne vaut ni paiement ni confirmation de commande ou d’expédition.


## Simulation persistante de la suite du parcours

La quatrième migration ajoute une déclaration de paiement fictive et trois transitions administrateur (confirmation simulée, acheminement fictif, livraison simulée). Les fonctions verrouillent la demande et vérifient le devis accepté, l’adresse, le propriétaire ou le rôle administrateur, ainsi que l’étape attendue. `jibli_simulations.simulation` est contraint à vrai ; ces enregistrements et leur historique ne sont pas des preuves de paiement ou de livraison réels. Les références de transport doivent commencer par `DEMO-`. Une future intégration de paiement devra conserver cette distinction et ne jamais réutiliser ces confirmations comme preuve d’encaissement.
