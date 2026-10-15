# Guide de modification

Ce fichier répond à une seule question : **« je veux changer ça, où je vais ? »**

Pour les décisions techniques et les explications de fond, voir le
[README](README.md).

## Les modifications les plus courantes

| Je veux changer… | Fichier | Remarque |
|---|---|---|
| Le numéro de téléphone, l'e-mail, l'adresse | `src/config/business.js` | Se répercute partout : en-tête, pied de page, WhatsApp, données Google |
| Un prix (prise en charge, prix au km, nuit) | `src/config/business.js`, objet `FARE` | Change aussi le simulateur et la page Tarifs |
| Un texte affiché sur le site | `src/i18n/fr.js` (ou `nl.js`, `en.js`) | **Les trois fichiers doivent garder les mêmes clés** |
| Un titre Google (onglet, résultats de recherche) | `src/i18n/seo.js` | Ce n'est pas du texte visible sur la page |
| Une couleur, une taille de texte | `src/styles/base.css` | Ce sont des variables : une seule ligne à changer |
| Le style d'une partie du site | `src/styles/` | Un fichier par zone, voir plus bas |
| Une question de la FAQ | `src/data/faqs.js` | `FAQS` = accueil, `FAQS_RATES` = page Tarifs (montants repris de la grille tarifaire) |
| Un service proposé | `src/data/services.js` | |
| Le lien d'avis Google (pied de page, page Contact) | `src/config/business.js`, `googleReviewUrl` (+ `googleMapsUrl`) | Les deux viennent de la même fiche |
| Une commune desservie | `src/config/business.js`, `servedMunicipalities` | `commune('Tienen', 'Tirlemont')` : nom néerlandais puis français ; un seul nom si identique |
| Une destination du menu d'accueil | `src/data/destinations.js` | Relancer ensuite `npm run verify:distances` |
| Les mentions légales, la confidentialité | `src/data/legal.js` | À relire si le simulateur change |
| L'adresse d'une page (`/fr/tarifs/`) | `src/i18n/routes.js` | Renommer aussi le fichier dans `src/pages/fr/` |

## Où se trouve quoi

```
src/
  config/business.js   TOUTES les infos de l'entreprise et les tarifs
  i18n/                les textes du site
    fr.js nl.js en.js    un fichier par langue (mêmes clés dans les trois)
    routes.js            les adresses des pages, traduites
    seo.js               titres et descriptions pour Google
  data/                les contenus en liste
    faqs.js services.js destinations.js legal.js
  styles/              toute l'apparence, découpée par zone
    base.css             couleurs, polices, tailles de texte
    layout.css           conteneurs et sections
    buttons.css forms.css
    simulator.css        le formulaire de prix et son reçu
    home.css rates-faq.css airport-contact.css
    header.css footer.css legal-404.css
    global.css           ne fait qu'assembler les fichiers ci-dessus
  components/          les morceaux de page réutilisables
  layouts/             le squelette commun à toutes les pages
  pages/               une page du site = un fichier
    nl/ fr/ en/
  lib/                 le code qui fait fonctionner les choses
    simulator.js         le formulaire de prix, de bout en bout
    address-field.js     un champ d'adresse avec suggestions
    geocoding.js         les appels à OpenRouteService
    fare.js              le calcul du prix
    whatsapp.js          le message pré-rempli
    route-map.js         les deux cartes
    format.js            l'affichage des nombres
    analytics.js         les statistiques de visite

scripts/               outils de maintenance, jamais envoyés au navigateur
tests/                 unit/ = logique pure, e2e/ = le site dans un navigateur
```

## Travailler sur le site

```bash
npm run dev
```

Ouvre <http://localhost:4321>. Les modifications s'affichent immédiatement.

```bash
npm test
```

Lance toutes les vérifications. **À faire avant chaque publication** : c'est
le filet qui attrape les erreurs avant les visiteurs.

```bash
npm run build
```

Fabrique le site final dans `dist/`. Vérifie la première ligne affichée :
`✓ Clé OpenRouteService trouvée` — sinon le simulateur ne fonctionnera pas.

Pour publier : `git push`. Vercel redéploie tout seul.

## Comment modifier sans rien casser

**Un texte du site se change dans `src/i18n/`, jamais dans une page.** Les
pages ne contiennent aucun texte en dur : elles vont le chercher. C'est ce qui
garantit que les trois langues restent alignées.

**Les trois fichiers de langue doivent avoir exactement les mêmes clés.** Si
tu ajoutes `nouveauTexte` dans `fr.js`, ajoute-le aussi dans `nl.js` et
`en.js`. Un test le vérifie et refusera de passer sinon.

**Ne remplace jamais un `[TO_BE_CONFIRMED]` par une valeur plausible.** Ces
marqueurs signalent une information que le client n'a pas encore donnée. Un
faux numéro en ligne est pire qu'un trou visible.

**Lance `npm test` avant de publier.** Si un test casse, son nom dit ce qui ne
va plus. Chaque test protège un problème réellement rencontré.

## Les pièges déjà rencontrés

Ces quatre-là ont chacun coûté du temps. Ils sont signalés en commentaire
dans le code, aux endroits concernés.

**Une carte doit être visible avant d'être dessinée.** Un élément masqué
mesure zéro pixel : Leaflet cadre alors dans le vide. Voir `lib/simulator.js`.

**Leaflet veut une vue avant des couches.** `setView()` doit être appelé avant
d'ajouter un cercle, sinon la carte plante silencieusement. Voir
`lib/route-map.js`.

**Une adresse tapée n'est pas une adresse choisie.** Le simulateur exige des
coordonnées, donc une suggestion sélectionnée. Voir `lib/address-field.js`.

**La clé API doit être dans l'environnement du build.** Sur Vercel :
Settings → Environment Variables, avec la case **Production** cochée, puis
redéployer à la main — ajouter une variable ne relance pas le build.
