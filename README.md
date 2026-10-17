# AI Studio

Plateforme française de collaboration ChatGPT et Claude, conservant le design sombre existant. Chaque mission est associée à un projet et suit trois étapes : ChatGPT propose, Claude vérifie, ChatGPT finalise à partir des deux résultats. Les rôles personnalisés, la consigne, les résultats, les erreurs et les jetons consommés sont sauvegardés côté serveur dans Netlify Database.

## Configuration et aperçu

Dans Netlify → Project configuration → Environment variables, renseigner `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`, portée **Functions**, contexte **Deploy Previews**, puis redéployer l’aperçu. Le fichier `.env.example` fournit uniquement les noms. Aucun secret ne doit être placé dans `public/`, Git ou une conversation. Les SDK utilisent explicitement `https://api.openai.com/v1` et `https://api.anthropic.com` avec les modèles `gpt-4.1-mini` et `claude-haiku-4-5` ; la passerelle ne remplace pas les clés personnelles.

Le projet publie `public/` sans compilation. Les fonctions sont dans `netlify/functions/`. Netlify applique automatiquement les migrations à l’aperçu et isole sa base de la production. La migration existante a été conservée ; une nouvelle migration ajoute les missions et le compteur de consommation. Ne pas appliquer les migrations manuellement. Aucune publication automatique supplémentaire n’a été configurée.

Pour ouvrir localement : `netlify dev --port 8889`. Le fonctionnement des sauvegardes nécessite aussi la connexion Netlify Database. L’aperçu distant est généré par le processus de revue des modifications.

## Utilisation et limites

Créer ou choisir un projet dans Collaboration IA, saisir une consigne puis Envoyer. La progression indique l’étape active et les résultats apparaissent après chaque sauvegarde. « Recharger les missions » récupère l’état serveur ; « Reprendre la mission » continue à partir de la première étape manquante. Une requête en cours verrouille son étape ; après une interruption serveur, elle peut être reprise après 55 secondes. Ne pas renvoyer une nouvelle mission si le navigateur dépasse son délai : recharger d’abord les missions.

Le serveur impose un plafond global atomique de 30 tentatives fournisseur par jour UTC, soit 10 missions complètes sans nouvelle tentative. Le compteur est commun à tout le site sur sa branche de base ; les erreurs consomment également une tentative. Chaque appel a un délai de 40 secondes, aucune relance automatique et au maximum 1 600 jetons de sortie. Les réponses tronquées ne sont pas considérées comme terminées. La consigne est limitée à 8 000 caractères et chaque rôle à 400 caractères. Une limitation réseau par IP et domaine complète le quota quotidien. Ces limites réduisent la consommation mais ne constituent pas un plafond monétaire : configurer aussi les budgets dans les comptes fournisseurs.

L’espace reste lié au cookie HttpOnly de ce navigateur pendant 30 jours, sans compte ni synchronisation entre appareils. Les anciennes conversations restent dans les données exportées ; elles ne sont pas automatiquement converties en missions. Les missions sont conservées indépendamment de la réinitialisation des projets et tâches. Exporter avant de supprimer un projet ou de perdre le cookie. Les 100 missions les plus récentes sont chargées et exportées avec l’espace. Aucun code produit par les assistants n’est exécuté automatiquement.

## Vérifications

- `npm test` : validations de sécurité des routes, fermeture de l’ancien accès sans quota, transmission des résultats entre les trois étapes, SDK officiels simulés, limites de sortie et erreurs sans fuite de détails.
- `node --check public/studio.js` : syntaxe navigateur.
- `npx tsc --noEmit --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck netlify/functions/*.mts netlify/lib/*.ts db/schema.ts` : vérification TypeScript.

Sur l’aperçu connecté à la base, avec les deux clés : créer un projet, lancer une mission, vérifier les trois réponses et les jetons, recharger la page, tester la reprise après une erreur fournisseur et confirmer la sauvegarde. La persistance réelle, le verrouillage concurrent et le quota atomique nécessitent la migration appliquée par Netlify. Les tests simulés n’effectuent aucun appel facturable.
