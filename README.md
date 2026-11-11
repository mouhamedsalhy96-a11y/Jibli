# Jibli

Application web en français pour composer un panier à partir de liens SHEIN ou AliExpress, recevoir un devis détaillé en dinars tunisiens et suivre sa demande.

**Version de test : paiements et livraisons simulés. Aucun argent n’est encaissé, aucun achat marchand ni transport réel n’est déclenché.**

## Fonctionnalités

- Comptes clients, confirmation e-mail et récupération du mot de passe avec Supabase Auth.
- Demandes enregistrées, isolées par propriétaire et consultables par l’administration.
- Devis manuels en TND : articles, transport, douane estimée, service et livraison.
- Versions conservées, expiration, acceptation ou refus, verrouillage après décision.
- Adresse de livraison après acceptation, corrections contrôlées et historique.
- Parcours simulé de paiement, confirmation admin, acheminement et livraison.
- Administration protégée avec recherche, filtres et pagination.
- Interface responsive, navigation vers l’administration et panier conservé dans le même onglet après rechargement.

Les totaux sont calculés en millimes entiers. Les fonctions PostgreSQL recalculent les montants et vérifient les accès, versions et transitions dans des transactions. Le rôle administrateur est attribué dans la base ; il ne peut pas être choisi à l’inscription.

## Navigation

| Page | Usage |
| --- | --- |
| `/` | Composer le panier |
| `/compte` | Connexion et inscription |
| `/compte/mot-de-passe-oublie` | Récupération du compte |
| `/espace` | Demandes, devis, livraison et suivi du client |
| `/gestion` | Administration protégée, accessible depuis le bouton Administration |
| `/mes-demandes` et `/admin` | Démonstrations temporaires indépendantes, accessibles depuis le pied de page |

Les demandes du parcours connecté sont enregistrées dans Supabase. Les démonstrations du pied de page utilisent des données fictives en mémoire et se réinitialisent au rechargement. Leur réinitialisation ne supprime ni les demandes enregistrées ni le panier non envoyé.

## Technologies

Next.js, React, TypeScript, Supabase Auth et PostgreSQL. Node.js 24.

## Configuration

Copier `.env.example` vers `.env.local` et renseigner le projet Supabase dédié à Jibli. Le fichier local est exclu de Git. L’application utilise uniquement la clé publishable ; aucune clé secret/service-role n’est nécessaire.

```powershell
npm ci
npm run dev
```

Adresse locale : `http://127.0.0.1:3004`.

```powershell
npm test
npm run lint
npm run build
```

Les tests couvrent le domaine métier, les transactions et accès PostgreSQL, les devis versionnés, la livraison, les simulations, la récupération du compte, le panier et les filtres. Les tests Auth simulés sont complétés par des essais manuels sur le projet Supabase.

- [Configuration Supabase et parcours de vérification](docs/supabase-setup.md)
- [Architecture et étapes avant ouverture commerciale](docs/architecture.md)

## Périmètre actuel

Les liens marchands sont validés sans extraction automatique des produits. Disponibilités, prix et frais sont évalués manuellement ; les frais de douane et délais affichés restent des estimations saisies par l’équipe.

Le prestataire de paiement, les agents de transport et les règles opérationnelles restent à définir avant toute vente. Les enregistrements de simulation ne constituent jamais une preuve d’encaissement. Jibli est un projet indépendant, sans affiliation à SHEIN ou AliExpress.
