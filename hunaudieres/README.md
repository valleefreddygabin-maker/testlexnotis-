# Hunaudières Matériaux — site vitrine

Page d’accueil pour Hunaudières Matériaux : « La déco du jardin et l’aménagement extérieur pour les professionnels et les particuliers ».
Site statique : HTML, CSS et JavaScript, sans étape de build ni dépendance.

```
index.html              page d’accueil
assets/css/style.css    styles (couleurs et polices en tête de fichier)
assets/js/main.js       parcours au défilement, menu, calculateur
assets/img/             images du jardin (jardin-*.jpg) et photos produits (produit-*.jpg)
rendus/                 scripts Blender qui ont produit ces images
```

Ouvrir `index.html` dans un navigateur suffit (ou `python3 -m http.server` dans ce dossier).

## Le concept

1. **Le jardin** : on entre dans l’image. La première photo (l’allée) part d’un cadre et s’ouvre en plein écran,
   puis on zoome vers les pas japonais ; leur image s’ouvre comme une fenêtre au point de zoom, et ainsi de suite :
   pas japonais → gabions → accès à la terrasse. Chaque étape affiche la famille de matériaux correspondante.
   Le point de zoom et l’intensité de chaque image se règlent dans `index.html` (`data-focal`, `data-zoom`).
2. **Nos matériaux** : 8 familles avec des vignettes de matière.
3. **Combien en faut-il ?** : calculateur de surface, volume et poids (densités moyennes, indiquées comme estimation).
4. **Pros & particuliers**.
5. **Contact**.

## Les images

Les 4 images du jardin et les 8 photos produits sont des **images de synthèse** calculées avec Blender (moteur Cycles),
pas des photos : ce ne sont ni des réalisations ni des produits réels de Hunaudières Matériaux.
À remplacer idéalement par de vraies photos (mêmes noms de fichiers dans `assets/img/`, format paysage 1920×1080
pour le jardin, portrait 4:5 pour les produits).

Pour les recalculer ou les modifier (Blender 4.2 ou `pip install bpy==4.2.0`) :

```bash
python rendus/garden.py -- shot=allee w=1920 h=1080 s=64 q=0.55 out=allee.png   # shot = allee | pas | gabions | terrasse
python rendus/products.py -- p=gravel w=720 h=900 s=64 out=gravier.png         # p = gravel | galets | pas | dallage | pierres | bois | bordures | paillage
```


## Contenus repris du site actuel

Nom, « Aménagement extérieur », l’accroche « La déco du jardin et l’aménagement extérieur pour les
professionnels et les particuliers », les boutons « Voir nos produits » et « Contactez-nous », le vert de la marque.

## À fournir / à valider

Signalé dans la page par des encadrés pointillés `[À …]` (classe `.todo`).

| Emplacement | À fournir |
|---|---|
| Nos matériaux | Catégories réelles du catalogue (celles affichées sont des propositions), vraies photos produits (celles affichées sont des images de synthèse), coloris, conditionnements |
| Étapes du jardin | À ajuster si certaines familles (gabions…) ne sont pas au catalogue ; vraies photos de réalisations si disponibles |
| Calculateur | Matériaux proposés et densités si vous avez les vôtres |
| Pros & particuliers | Services réels : tarifs pros, livraison, retrait, horaires… |
| Contact | Adresse, téléphone, e-mail, horaires ; lien du bouton « Contactez-nous » (`href="#"`, attribut `data-todo-link`) |
| Identité | Logo officiel (actuellement un monogramme « HM » en CSS), favicon, image de partage |
| Pied de page | Mentions légales, politique de confidentialité, réseaux sociaux |

Aucun chiffre, client ou avis n’a été inventé.
