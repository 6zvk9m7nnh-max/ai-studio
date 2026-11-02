# Fit Studio — première application mobile fonctionnelle

Application Expo / React Native séparée du site AI Studio existant. Cette première livraison fonctionne **sans clés API, sans serveur et sans abonnement payant**.

## Démarrer

Depuis le dossier `fitness-mobile` :

```bash
npm install
npx expo start
```

Ouvrir dans **Expo Go** sur un téléphone compatible ou lancer un simulateur iOS/Android. Expo Go sert aux tests ; la publication commerciale nécessitera ensuite des builds natifs.

## Fonctionnalités réellement implémentées

- Choix d'un objectif et d'un niveau sportif au premier lancement
- Programme découverte sur trois journées (haut du corps, bas du corps, corps entier)
- Séries, répétitions, consignes et temps de repos pour chaque exercice
- Validation des séries, chronomètre de repos et fin de séance
- Historique et statistiques de séances sauvegardés localement sur le téléphone
- Modification du profil et réinitialisation des données

## Limitations explicites

- **Pas encore de comptes ni de synchronisation cloud** : les données sont locales et peuvent être perdues en cas de désinstallation.
- **Pas encore de nutrition, d'illustrations sous licence, de paiement ni d'abonnement Premium.**
- Le programme est un exemple général non médical, à faire vérifier avant commercialisation.
- Les tests d'installation sur iPhone/Android et la publication ne sont **pas encore effectués**.

## Étapes suivantes

1. Ajouter Supabase Auth, schéma de données et politiques RLS.
2. Catalogue d'exercices avec médias sous licence et programmes validés.
3. Progression personnalisée, nutrition et accessibilité.
4. RevenueCat, tests d'intégration, builds et publication.

Le dépôt racine et la configuration Netlify existante restent inchangés.
