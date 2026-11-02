# Fit Studio — banque d'images d'exercices (MVP)

## Objectif
Chaque fiche d'exercice doit présenter **une photographie du mouvement exact** et, si possible, deux vues (départ/arrivée). Les photos d'ambiance ne remplacent jamais une démonstration.

## Source potentielle identifiée
- [wger](https://wger.de/) fournit une API publique avec les exercices et leurs images : https://wger.de/api/v2/exerciseinfo/
- L'API inclut des métadonnées de licences pour les images, notamment un style « Photo ».
- **Vérifier la licence de chaque image** avant de la télécharger, de la copier dans le dépôt ou de l'utiliser dans une application publique. Certaines images sont des dessins et ne satisfont pas au cahier des charges.
- Le catalogue [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) constitue une autre piste à vérifier pour les vues début/fin. Vérifier visuellement les photos et leurs conditions d'utilisation.

## Règles d'intégration
1. Associer chaque image à un identifiant d'exercice précis, pas seulement à une catégorie « jambes » ou « musculation ».
2. Conserver la source, l'auteur, la licence, l'URL d'origine et la date de vérification.
3. Contrôler la technique sportive avant publication.
4. Ne pas présenter une photo générique comme une instruction de mouvement.
5. Pour la démonstration Safari, utiliser un texte de substitution clair lorsqu'aucune image exacte n'est validée.

## Blocage actuel
Les photos du programme PDF précédent ne sont pas présentes dans les fichiers accessibles du projet. Aucune photo de ce PDF n'a donc été copiée ni prétendument intégrée.

## Publication
La version Safari existe dans `fitness-web/index.html`. La configuration GitHub Pages se trouve dans `.github/workflows/fitness-web-pages.yml`, mais le site HTTPS public doit encore être vérifié. Le site Netlify AI Studio existant ne doit pas être remplacé.
