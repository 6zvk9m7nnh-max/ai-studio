# AI Studio

Interface française de collaboration ChatGPT / Claude conservant le design sombre du prototype. Les fichiers publics sont dans `public/`. Les SDK des fournisseurs et les accès à la base sont exclusivement dans les fonctions serveur.

## Configuration Netlify

Le fichier `netlify.toml` publie `public/` sans commande de compilation. Netlify déploie automatiquement les fonctions et applique les migrations de `netlify/database/migrations/`. Netlify Database conserve les projets, tâches et messages dans un espace privé lié à un cookie HttpOnly de 30 jours. Il n’y a pas de compte utilisateur ni de partage entre appareils dans cette première version. Les anciennes données locales ne sont pas importées automatiquement ; exporter l’ancien prototype avant migration si nécessaire.

La passerelle IA Netlify fournit automatiquement les accès aux deux fournisseurs. Pour utiliser vos propres comptes, créer `OPENAI_API_KEY` et `ANTHROPIC_API_KEY` dans Project configuration → Environment variables, portée Functions, avec les contextes Deploy Previews et Production appropriés. Saisir les valeurs uniquement dans l’interface sécurisée Netlify, puis redéployer. Ne pas définir de variable publique, ne pas placer de secret dans le HTML ou dans Git. Les SDK utilisent leurs constructeurs par défaut ; Netlify respecte les clés personnelles configurées. Les modèles sont `gpt-4.1-mini` et `claude-haiku-4-5`.

## Aperçu à tester

Utiliser le déploiement d’aperçu généré pour ces modifications avant de publier. Sa base Netlify est isolée de la production. Pour un développement local : `netlify dev --port 8889`.

1. Ouvrir Collaboration IA et envoyer une consigne en mode ChatGPT uniquement, puis Claude uniquement.
2. Choisir En équipe : ChatGPT propose, puis Claude reçoit réellement cette proposition et accomplit sa mission. Modifier les missions pour tester une autre répartition.
3. Vérifier les noms des auteurs, le chargement, Ctrl + Entrée, et les réponses après une question de suivi.
4. Simuler une indisponibilité fournisseur dans un environnement de test : vérifier l’erreur explicite et la conservation d’une réponse partielle. En cas d’échec total, Réessayer renvoie le même message sans le dupliquer. En cas d’échec partiel, envoyer une nouvelle consigne à l’assistant concerné.
5. Créer un projet et une tâche, recharger la page, puis vérifier la sauvegarde, l’export et l’effacement de conversation. Un navigateur sans le cookie ouvre un espace différent.
6. Vérifier dans le réseau navigateur que seules les routes `/api/chat` et `/api/workspace` sont appelées, sans clé dans les requêtes ou réponses.

Les appels IA sont facturables sur le compte configuré. Le serveur limite les requêtes par IP et domaine (10 appels IA/minute), la taille du contexte, les sorties et les délais fournisseurs. Aucun outil autonome ni exécution de code généré n’est activé. Les conversations sont envoyées aux fournisseurs choisis. Les 12 derniers messages sont utilisés comme contexte ; les messages plus anciens restent visibles et exportables. La configuration des clés n’est pas présentée comme une connexion vérifiée : un appel réel reste nécessaire.

## Vérification

`node --check public/studio.js`

`node --import tsx --test tests/chat.test.ts`

`npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck netlify/functions/chat.mts netlify/functions/workspace.mts db/schema.ts`
