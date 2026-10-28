# Jeux de fléchettes

Cinq jeux de fléchettes dans une page web, pensés pour le téléphone :

- **Morpion** : grille 3×3 de chiffres de 1 à 20 (avec ou sans la bulle). Quatre touches sur une case la gagnent, trois cases alignées font gagner la partie.
- **Battle royale** : à chaque manche, le total le plus bas perd une vie. Les ex-aequo relancent 3 fléchettes chacun pour se départager.
- **Classique** : chacun doit faire plus que le joueur qui vient de jouer, sinon il perd une vie.
- **X01** : partir de 301, 501 ou 701 et finir à zéro, avec ou sans « double pour finir ».
- **Cricket** : trois modes. Le cricket standard ferme 15 à 20 et la bulle, le cut-throat envoie les points aux adversaires, et le cricket caché utilise sept cases tirées au hasard parmi 1 à 20 et la bulle.

Il n'y a ni serveur ni compte. Tout fonctionne dans le navigateur, et la partie en cours est sauvegardée sur l'appareil.

## Utiliser

- **En ligne** : à l'adresse de la publication GitHub Pages (voir ci-dessous).
- **En local** : ouvrir `index.html` dans un navigateur. Les polices viennent de Google Fonts ; hors connexion, une police de remplacement est utilisée.

## Structure

```
index.html                  page principale (liste des jeux)
assets/style.css            apparence commune
assets/common.js            état, sauvegarde, navigation, messages
assets/favicon.svg          icône
assets/apple-touch-icon.png icône de l'écran d'accueil iPhone
morpion/index.html          page du morpion
battle-royale/index.html    page du battle royale
classique/index.html        page du classique
x01/index.html              page du X01
cricket/index.html          page du cricket
js/morpion.js               règles du morpion
js/lives.js                 règles du battle royale et du classique (selon GAME_MODE)
js/x01.js                   règles du X01
js/cricket.js               règles du cricket (standard, cut-throat, caché)
```

Chaque page a sa propre clé de sauvegarde dans le navigateur, donc les parties ne se mélangent pas.

## Publier sur GitHub Pages

1. Pousser le dépôt sur GitHub.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Attendre une à deux minutes. Le site est alors disponible à `https://<votre-pseudo>.github.io/<nom-du-depot>/`.

## Licence

Non définie. Ajouter un fichier `LICENSE` si le code doit être réutilisé.
