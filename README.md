# LexNotis — site vitrine

Page d’accueil de LexNotis, agence d’IA sur mesure au Mans.
Site statique, sans dépendance ni étape de build : HTML, CSS et JavaScript natifs.

```
index.html            page d’accueil
assets/css/style.css  styles (variables de couleurs et typographies en tête de fichier)
assets/js/main.js     interactions au défilement, menu mobile, visuel animé
```

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Sections

1. **Accroche** — titre, puis visuel animé qui s’agrandit en plein écran au défilement
2. **Notre approche** — texte révélé mot à mot
3. **Services** — 4 services (le visuel s’ouvre au survol)
4. **Réalisations** — cartes à faire défiler horizontalement (glisser à la souris)
5. **Méthode** — 4 étapes avec titre fixe et barre de progression
6. **Rendez-vous** — appel à l’action plein écran
7. **Pied de page**

Les animations sont désactivées si le visiteur a activé « réduire les animations ».

## Contenus à fournir

Les emplacements manquants sont signalés dans la page par un encadré pointillé
orange `[À compléter …]` / `[À fournir …]` (classe `.todo`). Supprimez chaque encadré une fois le contenu en place.

| Emplacement | À fournir |
|---|---|
| Notre approche | Texte de présentation : histoire, fondateur·rice, valeurs |
| Services | Validation des 4 services et de leurs intitulés (proposés à partir de « agence d’IA sur mesure ») |
| Réalisations | Études de cas réelles : client (avec accord), contexte, solution, résultats mesurés, visuels, secteur, année |
| Méthode | Validation des étapes et durées réelles |
| Rendez-vous | Lien de réservation (Calendly, Cal.com…) → remplacer `href="#"` sur le bouton `data-todo-link` ; e-mail, téléphone, adresse |
| Boutons « Prendre rendez-vous » de l’en-tête et de l’accroche | Pointent vers la section Rendez-vous ; ils pourront pointer directement vers le lien de réservation |
| Pied de page | Mentions légales (raison sociale, SIRET, hébergeur), politique de confidentialité, réseaux sociaux |
| Identité | Logo définitif (actuellement : pastille dégradée + nom en typographie), favicon, image de partage (Open Graph) |
| Photos | Les visuels sont des compositions graphiques en CSS (classes `.v-dunes`, `.v-glow`, `.v-grid`, `.v-horizon`) en attendant de vraies photos ou captures de projets |

Aucun client, chiffre ni résultat n’a été inventé.
