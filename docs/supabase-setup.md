# Jibli — comptes et demandes enregistrées

Ce jalon ajoute `/compte`, `/espace` et `/gestion`. La démo `/`, `/mes-demandes` et `/admin` reste indépendante, en mémoire. Les devis et décisions du parcours connecté sont enregistrés après la deuxième migration. Les devis, décisions, paiements et expéditions de la démo restent indépendants de Supabase. Ne pas ouvrir le service commercial à ce stade.

## 1. Projet dédié

Créer un nouveau projet Supabase pour Jibli, distinct de la clinique. Ne pas réutiliser sa base ni ses clés. Choisir une région adaptée à l’exploitation prévue.

Dans SQL Editor, exécuter une seule fois le fichier `supabase/migrations/202611110001_accounts_requests.sql` complet. Il crée les tables et les politiques RLS dans une transaction.

## 2. Environnement local

Copier `.env.example` vers `.env.local` et remplacer les deux valeurs avec l’URL du projet et sa clé **publishable**, depuis le dialogue Connect ou les paramètres API du projet. Aucune clé secret/service-role n’est nécessaire. `.env.local` est ignoré par Git ; `.env.example` ne contient aucun secret.

Redémarrer `npm run dev` après configuration. Adresse locale : `http://127.0.0.1:3004`.

## 3. Confirmation e-mail

Dans Authentication → URL Configuration, définir Site URL à `http://127.0.0.1:3004` et ajouter `http://127.0.0.1:3004/auth/callback` aux Redirect URLs pour les essais locaux. Garder la confirmation e-mail activée. Le modèle de confirmation par défaut peut être conservé : le serveur échange le code PKCE à `/auth/callback`. Ouvrir le message dans le même navigateur que l’inscription pour retrouver le cookie de vérification. Sinon, après confirmation, se connecter manuellement avec e-mail et mot de passe.

Sans SMTP personnalisé, Supabase limite l’envoi aux adresses autorisées de l’équipe du projet et applique une faible limite d’envoi. Pour le premier essai, utiliser l’adresse du compte propriétaire du projet. Avant de tester avec d’autres clients, configurer un SMTP personnalisé.

La variable serveur `APP_ORIGIN` détermine l’URL de retour des inscriptions. En développement uniquement, elle utilise `http://127.0.0.1:3004` par défaut. En production, elle est obligatoire et doit contenir le domaine HTTPS du site.

Optionnel, après configuration d’un SMTP personnalisé, un modèle de confirmation personnalisé peut utiliser l’ancien endpoint :

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmer mon adresse e-mail</a>
```

L’endpoint ne redirige que vers une route interne fixe. Pour la mise en ligne, définir ensuite le vrai domaine HTTPS et préparer l’envoi e-mail de production. Cette configuration locale n’est pas une configuration de lancement.

## 4. Essai client

1. Ouvrir `/compte`, créer un compte et confirmer le message reçu. Mot de passe : 12 caractères minimum.
2. Dans le panier `/`, ajouter un article.
3. Cliquer « Continuer vers mon espace client ». Les articles sont conservés lors de cette navigation dans le même onglet. Le lien principal « Mes demandes » ouvre aussi cet espace enregistré. La simulation temporaire est une option repliée, indépendante de la base.
4. Remplir les coordonnées de test et envoyer la demande depuis `/espace`.
5. Recharger la page : la demande envoyée reste visible. Le panier non envoyé survit au rechargement dans le même onglet grâce à sessionStorage ; il est effacé lors de l’envoi et à la fermeture de la session de l’onglet. La réinitialisation de la démonstration ne vide pas le panier.
6. Se déconnecter et essayer d’ouvrir `/espace` : retour à `/compte`.

## 5. Administrateur

Créer et confirmer d’abord le compte destiné à l’administration. Copier son UUID depuis Authentication → Users, puis exécuter dans SQL Editor, en remplaçant le UUID :

```sql
insert into public.jibli_admins(user_id)
values ('REMPLACER_PAR_UUID_DU_COMPTE');
```

Le rôle est attribué uniquement par un opérateur de confiance dans la base, jamais par un formulaire ou les métadonnées du compte. `/gestion` permet de consulter les demandes de tous les clients. `/admin` reste une démonstration fictive ouverte et ne donne accès à aucune demande enregistrée.

## 6. Vérification obligatoire sur le projet de test

- Avec deux comptes clients distincts, créer une demande par compte. Chacun voit uniquement ses propres demandes après reconnexion.
- Un client ne peut pas accéder aux demandes des autres via l’API Supabase ni appeler une mutation de rôle.
- Un client ne peut pas insérer/modifier/supprimer directement les tables. La fonction d’envoi impose le propriétaire connecté, l’e-mail confirmé et le statut initial.
- Un utilisateur anonyme ne peut ni lire les demandes, ni appeler la fonction d’envoi.
- Un administrateur voit les deux demandes dans `/gestion`. Retirer son rôle dans SQL Editor doit retirer cet accès au prochain chargement.
- Une même clé d’envoi réutilisée par son propriétaire ne crée pas une deuxième demande.
- Un panier invalide ne doit laisser aucune demande partielle.

Les tests automatisés utilisent PostgreSQL embarqué avec un schéma Auth minimal de test. Ils vérifient les transactions et permissions SQL, mais ne remplacent pas les essais sur Supabase Auth réel, les cookies et la confirmation e-mail.

## Limites de ce jalon

Pas encore d’édition des coordonnées générales du compte, de notification automatique de devis, de paiement réel, de pagination au-delà des 100 dernières demandes, ni de synchronisation du panier entre appareils. La récupération du mot de passe est disponible après configuration de son URL de retour. Les espaces connectés ne sont pas mis en cache publiquement. Les erreurs techniques ne sont pas exposées aux clients.

Documentation suivie : [Supabase SSR pour Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [confirmation par e-mail](https://supabase.com/docs/guides/auth/server-side/nextjs).


## 7. Devis enregistrés — deuxième migration

Exécuter une seule fois `supabase/migrations/202611110002_quotes.sql` dans SQL Editor, après la première migration. Elle conserve les demandes et les rôles existants. Ne pas réexécuter la première migration.

Dans `/gestion`, ouvrir une demande « À chiffrer », renseigner chaque prix unitaire en DT, les quatre frais (mettre 0 si sans frais), la validité et le délai estimé, puis publier. Le total est recalculé dans PostgreSQL en millimes. Chaque révision ajoute une version immuable ; une publication depuis une ancienne version est refusée.

Dans `/espace`, ouvrir la même demande pour lire le détail. Confirmer son choix puis accepter ou refuser. Seul le propriétaire peut choisir, même si un autre utilisateur est administrateur. Une décision sur une version ancienne ou expirée est refusée. Un devis accepté est figé ; aucun argent n’est prélevé et aucun prestataire de paiement n’est connecté.

Essai conseillé : publier, recharger et vérifier que le devis reste présent ; accepter depuis le compte propriétaire ; recharger les deux espaces et vérifier le statut « Paiement attendu » et le verrouillage du chiffrage. Utiliser une seconde demande pour tester le refus.

Les tests PostgreSQL couvrent les droits, le calcul exact, les révisions immuables, la version périmée, l’expiration et le verrouillage après décision. Les opérations verrouillent la demande pendant la transaction pour sérialiser les publications et décisions concurrentes. La publication n’envoie pas encore d’e-mail au client.


## 8. Livraison enregistrée — troisième migration

Exécuter une seule fois `supabase/migrations/202611110003_delivery_details.sql`, après les deux migrations précédentes. Elle conserve les demandes, devis et décisions existants.

Dans `/espace`, ouvrir une demande acceptée (« Paiement attendu »), puis remplir « Renseigner la livraison » : adresse complète de test et code postal à quatre chiffres. La ville est celle utilisée pour le devis accepté et ne peut pas être changée dans ce formulaire. Un changement de ville nécessite une nouvelle demande et un nouveau devis.

Enregistrer, puis recharger. Le résumé de livraison doit rester visible dans `/espace` et `/gestion`. Le propriétaire peut corriger son adresse tant que la demande attend le paiement. Les révisions empêchent un ancien formulaire d’écraser une correction plus récente. Une nouvelle entrée d’historique est ajoutée à chaque changement effectif, sans conserver d’anciennes adresses dans cet historique. Une sauvegarde identique à la version actuelle ne duplique pas l’historique.

Les tables sont en lecture seule pour les utilisateurs via RLS. Seule la fonction dédiée permet au propriétaire d’une demande acceptée d’écrire. Un administrateur peut lire les coordonnées, mais ne peut pas les remplacer au nom du client. Aucun statut de paiement ou d’expédition n’est modifié par la saisie d’une adresse. Le suivi et le paiement réels restent à implémenter ; la quatrième migration ajoute un parcours explicitement simulé.


## 9. Paiement et suivi simulés — quatrième migration

Exécuter une seule fois `supabase/migrations/202611110004_simulated_fulfilment.sql`, après les trois migrations précédentes. Les demandes, devis acceptés et adresses existants sont conservés.

Parcours de test :

1. Dans `/espace`, ouvrir une demande acceptée ayant une adresse enregistrée.
2. Confirmer la case « simulation », puis choisir « Simuler un paiement ». Une référence `TEST-…` et le montant du devis accepté sont générés par la base. Aucun argent n’est envoyé et aucune pièce de paiement n’est requise.
3. Recharger : le statut devient « Simulation · Paiement à vérifier ». Les coordonnées de livraison ne sont plus modifiables.
4. Dans `/gestion`, confirmer la case « simulation » et cliquer « Confirmer le paiement simulé ».
5. À l’étape suivante, saisir une référence de transport fictive comme `DEMO-TRACK-001`, puis cliquer « Simuler la mise en acheminement ».
6. Cliquer « Simuler la livraison ». Recharger les deux espaces : l’état final et tout l’historique restent visibles.

Seul le propriétaire peut déclarer sa simulation ; seuls les administrateurs peuvent avancer les étapes suivantes. La fonction impose l’étape précédente et bloque les clics sur une ancienne étape. Une déclaration répétée ne crée pas de doublon ni de retour en arrière. Une adresse enregistrée et le devis accepté courant sont requis.

Les tables `jibli_simulations` et `jibli_simulation_events` sont séparées des futurs paiements réels. La colonne `simulation` est obligatoirement vraie. Ces données ne doivent jamais être considérées comme des encaissements ou des expéditions réels lors de l’ajout d’un prestataire de paiement. Aucun webhook, achat marchand, e-mail de notification ou appel transporteur n’est exécuté.


## 10. Mot de passe oublié — sans migration SQL

Dans Authentication → URL Configuration → Redirect URLs, ajouter exactement :

```text
http://127.0.0.1:3004/auth/recuperation
```

Conserver le modèle par défaut « Reset password » de Supabase. Il utilise le lien de confirmation fourni par Supabase ; aucune personnalisation SMTP ou du modèle n’est nécessaire pour ce test. Avec le service e-mail intégré, utiliser l’adresse du propriétaire/de l’équipe Supabase et respecter les limites d’envoi.

Depuis `/compte`, choisir « Mot de passe oublié ? » ou ouvrir `/compte/mot-de-passe-oublie`. Envoyer une seule demande, consulter sa messagerie et ouvrir le lien dans le même navigateur et la même session privée. Le callback échange le code PKCE côté serveur et ouvre `/compte/nouveau-mot-de-passe`. Choisir et confirmer soi-même un mot de passe unique de 12 à 128 caractères.

Après confirmation, la session courante est conservée et une révocation des autres sessions de rafraîchissement est demandée à Supabase. Les jetons d’accès déjà émis peuvent rester valides jusqu’à leur expiration. Utiliser le bouton « Se déconnecter », puis vérifier la connexion avec le nouveau mot de passe. L’application ne stocke ni ne journalise les mots de passe.

Un lien absent, expiré, utilisé ou ouvert sans son cookie PKCE mène à une page permettant de demander un nouveau lien. La page de modification et son action vérifient la session auprès de Supabase. Une demande de récupération affiche le même message pour les comptes existants, inexistants ou non autorisés afin de ne pas révéler l’existence d’un compte. Ce message ne garantit pas l’envoi si le fournisseur ou la limite d’envoi bloque l’e-mail.

`APP_ORIGIN` est la seule origine utilisée pour les liens e-mail et les retours d’authentification. En développement, son défaut est `http://127.0.0.1:3004`. Pour Vercel, configurer une origine HTTPS et ajouter ses URL `/auth/callback` et `/auth/recuperation` à la liste autorisée. Ne pas utiliser un hôte arbitraire fourni par un formulaire ou une URL de requête.

Les tests automatisés utilisent des réponses Auth simulées pour ce nouveau parcours : ils ne changent aucun vrai mot de passe et n’envoient aucun vrai e-mail. Le test de réception et de reconnexion doit être effectué sur le projet Supabase configuré.

Références : [récupération du mot de passe](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [mise à jour du mot de passe](https://supabase.com/docs/reference/javascript/auth-updateuser).


## 11. Recherche et filtres de l’administration — sans migration SQL

Dans `/gestion`, rechercher par référence, nom, e-mail, téléphone ou ville. Le filtre de statut se combine à la recherche. Cliquer « Rechercher » applique les critères et revient à la première page ; les raccourcis de statut conservent le texte de recherche. « Effacer les filtres » rétablit la liste complète.

La recherche s’exécute dans la base avant la pagination : elle n’est pas limitée aux 100 premiers résultats. Chaque page contient au maximum 25 demandes, triées par date décroissante puis identifiant pour un ordre stable. Les liens Précédente/Suivante conservent les filtres. Les critères restent présents dans l’URL et après rechargement. Une page devenue hors limites revient à la dernière page disponible. Les comptes clients conservent leur liste privée des 100 demandes les plus récentes.

Le rôle administrateur est revérifié avant toute requête de liste globale. Les comptes, lignes, devis, adresses et simulations gardent leurs politiques RLS. Le compteur correspond aux demandes filtrées, pas aux seules lignes affichées. Les valeurs de recherche sont limitées à 80 caractères et échappées selon la grammaire PostgREST. Les caractères `%` et `_` sont recherchés littéralement ; `*` reste le raccourci de motif reconnu par PostgREST.

Essai conseillé : rechercher une référence connue, filtrer « Simulation · Livrée », recharger, puis rechercher une référence inexistante pour vérifier le message « aucune demande ». Effacer les filtres et vérifier le retour de la liste.


## Navigation et interface

Le bouton « Administration » de l’en-tête ouvre `/gestion`. L’accès reste vérifié côté serveur et réservé aux administrateurs. Les démonstrations temporaires `/admin` et `/mes-demandes` sont accessibles depuis le pied de page et n’affichent aucune donnée du parcours connecté. La réinitialisation de la simulation conserve le panier non envoyé et les demandes Supabase.

Les formulaires et cartes partagent des espacements, titres et tailles de contrôles cohérents. La liste des demandes affiche le client, la ville, la date et un badge de statut ; l’ouverture de la carte sépare les articles, le devis, les actions, la livraison et l’historique. Les prix unitaires restent visibles sur mobile.
