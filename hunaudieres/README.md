# Hunaudières Matériaux — site vitrine

Page d’accueil pour Hunaudières Matériaux : « La déco du jardin et l’aménagement extérieur pour les professionnels et les particuliers ».
Site statique : HTML, CSS et JavaScript, sans étape de build. Le jardin 3D utilise three.js (r149, fourni dans `assets/vendor/`, licence MIT).

```
index.html              page d’accueil
assets/css/style.css    styles (couleurs et polices en tête de fichier)
assets/js/textures.js   textures de matériaux générées (gravier, galets, dalles, pierre, bois…)
assets/js/garden.js     le jardin 3D et le trajet de la caméra
assets/js/main.js       défilement, menu, vignettes, calculateur
assets/vendor/          three.min.js
```

Ouvrir `index.html` dans un navigateur suffit (ou `python3 -m http.server` dans ce dossier).

## Le concept

1. **Le jardin** : une scène 3D plein écran. En faisant défiler, on traverse l’arche d’une haie,
   on suit une allée en pas japonais sur gravier, on longe des gabions, un bac en traverses, des bordures,
   et on arrive sur une terrasse en dallage. Chaque étape affiche la famille de matériaux correspondante.
   L’herbe bouge avec le vent, la caméra suit légèrement la souris.
2. **Nos matériaux** : 8 familles avec des vignettes de matière.
3. **Combien en faut-il ?** : calculateur de surface, volume et poids (densités moyennes, indiquées comme estimation).
4. **Pros & particuliers**.
5. **Contact**.

Sans WebGL, un fond dégradé remplace la scène et tous les textes restent lisibles.

## Contenus repris du site actuel

Nom, « Aménagement extérieur », l’accroche « La déco du jardin et l’aménagement extérieur pour les
professionnels et les particuliers », les boutons « Voir nos produits » et « Contactez-nous », le vert de la marque.

## À fournir / à valider

Signalé dans la page par des encadrés pointillés `[À …]` (classe `.todo`).

| Emplacement | À fournir |
|---|---|
| Nos matériaux | Catégories réelles du catalogue (celles affichées sont des propositions), photos produits, coloris, conditionnements |
| Étapes du jardin | À ajuster si certaines familles (gabions, traverses…) ne sont pas au catalogue |
| Calculateur | Matériaux proposés et densités si vous avez les vôtres |
| Pros & particuliers | Services réels : tarifs pros, livraison, retrait, horaires… |
| Contact | Adresse, téléphone, e-mail, horaires ; lien du bouton « Contactez-nous » (`href="#"`, attribut `data-todo-link`) |
| Identité | Logo officiel (actuellement un monogramme « HM » en CSS), favicon, image de partage |
| Pied de page | Mentions légales, politique de confidentialité, réseaux sociaux |

Aucun chiffre, client ou avis n’a été inventé.
