# Taxi Q.I.S.S — site web

> **Pour modifier le site (un texte, un prix, une couleur), commence par le
> [GUIDE.md](GUIDE.md).** Ce README-ci explique les décisions techniques et
> les pourquoi ; le guide dit où aller.

Site statique trilingue (NL/FR/EN) pour Q.I.S.S SRL (service de taxi, Tienen).
Design et parcours utilisateur repris du prototype Claude Design validé
(`../claude design template/TaxiDesktop.dc.html` + `TaxiScreen.dc.html`,
hors dépôt). Voir `brief_dev_taxi_qiss.md` et
`docs (hors repo)/cdc_v1_taxi_qiss.md` (hors dépôt) pour les exigences
complètes. Ce README documente ce qui est nécessaire pour builder,
développer et déployer — et les décisions prises pour concilier le
prototype avec le CDC/brief.

## Contrainte d'architecture — à ne jamais casser

Le calcul d'itinéraire, l'estimation de prix et la construction du message
WhatsApp s'exécutent **entièrement dans le navigateur**. Aucune adresse, nom
ou donnée de formulaire ne doit transiter par un serveur, un log ou une base
de données. Voir `src/lib/geocoding.js`, `src/lib/fare.js`,
`src/lib/whatsapp.js` — toute la logique métier vit ici, côté client.

## Stack

- [Astro](https://astro.build) (sortie statique, `output: 'static'`)
- Aucun framework UI (JS vanilla dans les îlots `<script>` du simulateur,
  menu mobile et sélecteur de langue en `<details>` natif) — minimise le JS
  expédié, cible LCP < 2,5 s
- Polices Cabinet Grotesk + Satoshi via Fontshare (CDN utilisé par le
  prototype)
- [OpenRouteService](https://openrouteservice.org) pour la recherche
  d'adresse et le calcul d'itinéraire — appelé à chaque estimation (voir
  "Simulateur" ci-dessous)

## Simulateur de prix — deux adresses libres

Historique du choix, parce qu'il explique la forme du code :

1. Le prototype validé proposait une **liste déroulante de quinze
   destinations** avec des distances fixes, au lieu de l'autocomplétion
   libre du brief/CDC (§5.4 / §7.7).
2. Le 2026-09-04, architecture **hybride** : la liste pour le cas courant,
   plus une entrée « Autre adresse » ouvrant une recherche réelle.
3. Le 2026-09-05, décision de l'utilisateur : **la liste disparaît**. Départ
   et destination sont deux champs libres à suggestions, et chaque
   estimation est une mesure routière réelle entre deux adresses choisies.

Ce que ça implique, et qu'il faut assumer :

⚠️ **Il n'existe plus de chemin qui produise un prix sans appeler l'API.**
Avant, la liste déroulante servait un prix hors ligne ; maintenant, toute
estimation coûte au minimum une requête d'itinéraire, plus une recherche
d'adresse par pause de frappe dans chaque champ. Le débounce de 500 ms, le
cache de session et le minimum de 3 caractères limitent la casse, mais
**plafonner le quota journalier sur le dashboard OpenRouteService n'est plus
une précaution, c'est une condition de mise en ligne** — et une panne de
l'API n'est plus dégradée par une liste de secours : elle affiche le message
« service indisponible » et le bouton d'appel.

`src/data/destinations.js` reste, avec un rôle différent : il alimente les
pages transferts aéroport, la courte liste du bloc d'estimation de la page
d'accueil (formulaire GET qui doit fonctionner sans JavaScript), et la
reconnaissance des aéroports décrite plus bas. Ses distances ne servent plus
au calcul.

### Les deux champs d'adresse : une adresse « résolue », pas du texte

Le départ et la destination sont tous deux des combobox construits par la
même fabrique (`createAddressField` dans `PriceSimulator.astro`). Règle
unique, dont tout le reste découle : **un champ n'est valide que lorsque son
texte correspond à une coordonnée que le visiteur a choisie dans les
suggestions.** Taper une adresse n'est pas la choisir — on ne mesure pas un
itinéraire depuis une chaîne de caractères. Modifier le texte annule le
choix ; changer de destination ne l'annule pas.

Conséquences concrètes :

- **Le départ est réellement utilisé.** Il est résolu comme la destination,
  et c'est lui qui sert de point de départ à la mesure. L'adresse
  pré-remplie (`BUSINESS.defaultPickup`) a sa coordonnée déjà connue : la
  garder évite la recherche d'adresse, mais plus le calcul d'itinéraire.
- **Les messages d'erreur disent ce qui s'est réellement passé.** « Adresse
  introuvable » est réservé à un vrai `not_found` ; une adresse tapée mais
  non choisie renvoie « choisissez une adresse dans la liste » et rouvre les
  suggestions ; un quota épuisé ou une panne réseau renvoient « calcul
  d'itinéraire indisponible ». Envoyer tout le monde chercher une faute de
  frappe parce que notre quota est épuisé masquait le vrai problème.
- **Au-delà de la destination la plus lointaine que le client propose**
  (`FURTHEST_PRESET_KM`, dérivé de la liste elle-même), le prix reste
  affiché mais un encart invite à appeler pour un tarif ferme.
- **L'autocomplétion couvre `BE,NL,FR,DE,LU`**, avec `focus.point` sur
  Tienen pour garder les résultats locaux en tête. La Belgique seule rendait
  Maastricht et Eindhoven — pourtant proposés comme transferts aéroport —
  impossibles à saisir.
- **La règle « pas de prix aéroport tant que le client ne l'a pas fixé »
  a survécu à la liste déroulante.** L'aéroport est reconnu à la
  coordonnée choisie (`airportAt()`, rayon de 3 km autour des cinq aéroports
  connus), pas à une entrée de menu. Tant qu'aucun `price` n'est renseigné
  sur l'entrée dans `destinations.js`, taper « Brussels Airport » afficherait
  « à confirmer » et le bouton d'appel, jamais un prix inventé (CDC §11.4).
  Les cinq aéroports ont désormais un forfait fixe confirmé par le client
  (Zaventem 130 €, Charleroi 150 € le 2026-09-15 ; Liège 160 €, Maastricht
  240 €, Eindhoven 320 € le 2026-09-16) : la règle « aucun prix inventé »
  reste testée au niveau des données (`tests/unit/destinations.test.js`),
  prête à protéger un futur aéroport ajouté sans prix. Le client a aussi
  précisé que ces forfaits sont ceux d'une prise en charge à Tienen et
  peuvent varier pour un autre point de départ — d'où la note affichée sous
  le prix (`flatFareNote`, `#flat-fare-note` dans le simulateur).
- **Le `?from=` de la page d'accueil est traité comme du texte saisi** :
  tronqué à 120 caractères, et non résolu tant qu'il diffère de l'adresse
  par défaut. Le calcul automatique ne se déclenche donc que si le point de
  départ est connu ; sinon les suggestions s'ouvrent dessus.

### Distances mesurées : à quoi elles servent encore

Les distances livrées avec le prototype étaient des estimations de maquette,
fausses de −60 % à +68 %. Elles ont été mesurées via OpenRouteService :

```sh
npm run verify:distances         # compare, sans rien modifier
npm run verify:distances:write   # met à jour src/data/destinations.js
```

Le script refuse d'écrire sans `--ors` : ces données doivent venir du même
routeur que celui interrogé à l'exécution.

Depuis la suppression de la liste déroulante, **aucune de ces distances
n'est plus affichée à un visiteur** — le simulateur mesure tout en direct.
Ce que le script produit reste utile pour trois choses :

- le `lat`/`lon` de chaque destination, pris au bout de l'itinéraire mesuré,
  qui sert à reconnaître les aéroports et à résoudre le `?dest=` de la page
  d'accueil ;
- `src/data/route-geometries.js`, qui n'est plus envoyé au navigateur mais
  reste la provenance vérifiable de ces coordonnées ;
- un point de comparaison si un jour les prix affichés paraissent faux.

⚠️ **Le biais reste à connaître.** Ce sont des trajets de centre à centre, et
un routeur optimise le *temps*, pas la distance. Viser la grand-place plutôt
que la gare ajoute plusieurs kilomètres à cause des zones piétonnes (Leuven :
33,6 km vers la Grote Markt contre 26 km vers la gare). Comme le tarif est
kilométrique, le point de référence déplace le prix annoncé — c'est vrai
aussi des adresses que les visiteurs saisissent eux-mêmes.

## Développement

```sh
npm install
cp .env.example .env   # puis renseigner ORS_API_KEY (sans elle, aucune estimation n'est possible)
npm run dev
```

```sh
npm run build     # build statique dans ./dist
npm run preview   # prévisualiser le build
```

## Tests

```sh
npm test           # unitaires + end-to-end
npm run test:unit  # Vitest — logique métier pure
npm run test:e2e   # Playwright — desktop + mobile, sur le build réel
```

- **Unitaires (`tests/unit/`)** : formule tarifaire (y compris les bornes du
  supplément de nuit et le refus des entrées invalides), construction et
  encodage du message WhatsApp (accents, flèches, sauts de ligne), intégrité
  des 21 routes et des trois dictionnaires, garde sur les valeurs métier
  encore `[TO_BE_CONFIRMED]`.
- **E2E (`tests/e2e/`)** : les 21 pages répondent avec un seul `h1`, des
  `hreflang` réciproques et des métadonnées uniques ; le changement de langue
  reste sur la même page ; parcours complet du simulateur (destination
  saisie et choisie, aéroport « à confirmer », nuit, adresse tapée mais
  jamais choisie, recherche sans résultat, panne de l'API, recalcul) ; **vérification qu'aucune donnée de formulaire ne quitte le
  navigateur** ; menu mobile plein écran ; cibles tactiles ≥ 44 px ; absence
  de débordement horizontal ; sitemap/robots/404 ; JSON-LD.

Playwright sert `dist/` via `tests/static-server.mjs` (et non `astro
preview`, qui se démonise dans certains environnements). Ce petit serveur
reproduit aussi le comportement attendu du reverse proxy : index de
répertoire + repli sur `404.html`.

## Configuration métier

`src/config/business.js` centralise les valeurs métier.

**Confirmées** (source : prototype validé, confirmées réelles par
l'utilisateur le 2026-09-04) : nom commercial (« Taxi QISSI »), téléphone,
WhatsApp, e-mail. Le domaine `taxiqissi.be` était **déduit** du domaine de
l'e-mail confirmé, pas explicitement validé séparément — **confirmé le
2026-09-17** : `taxiqissi.be` répond (redirection 308 vers
`www.taxiqissi.be`, qui sert le site), et `site` dans `astro.config.mjs`
pointait déjà sur la bonne valeur.

**Toujours en attente** : `licenseNumber` (vergunning IBP — absente du
prototype, non fournie). Reste `[TO_BE_CONFIRMED]` et s'affiche comme tel
dans le rendu — ne jamais la remplacer par une valeur plausible.

Avant mise en ligne :

1. Renseigner `BUSINESS.licenseNumber`.
2. Déclarer `ORS_API_KEY` **dans les variables d'environnement de l'hébergeur**
   (sur Vercel : Settings → Environment Variables). Le `.env` local n'est pas
   déployé : sans ça, le simulateur fonctionne en local et échoue en
   production — plus aucune estimation n'est possible sans la clé. Puis **plafonner le quota journalier** sur le dashboard
   OpenRouteService avant d'ouvrir l'accès public.

### Carte de l'itinéraire

Le résultat du simulateur affiche l'itinéraire réel sur une carte (Leaflet +
fonds OpenStreetMap), conformément au CDC §7.1. Trois points de conception :

- **Chargement différé** (brief §7) : Leaflet, sa CSS et les tuiles ne sont
  récupérés qu'après le calcul d'une estimation. Rien n'est préchargé —
  `npm run build` place Leaflet (145 Ko) dans un chunk séparé, et la CSS est
  importée en `?url` pour ne pas finir en `<link>` bloquant dans le `<head>`.
- **Zéro appel supplémentaire** : le tracé arrive dans la réponse du calcul
  d'itinéraire déjà payé pour obtenir la distance. Les polylignes
  pré-calculées de `src/data/route-geometries.js` ne sont plus envoyées au
  navigateur depuis que les deux champs sont libres.
- **Dégradation propre** (brief §5.3) : si Leaflet ou les tuiles échouent,
  la carte reste masquée et le prix, le message WhatsApp et le bouton
  d'appel fonctionnent normalement. Testé en coupant le fournisseur de
  tuiles.

### Carte de la zone desservie (page Contact)

La page Contact affiche le rayon d'intervention (~20 km autour de Tienen) sur
la même carte, à la place du cercle pointillé décoratif du prototype
(`src/components/ServiceAreaMap.astro`). Elle n'est pas derrière un clic,
contrairement à celle du simulateur, d'où deux différences :

- **Chargement à l'entrée dans le champ de vision** (`IntersectionObserver`,
  marge de 200 px) plutôt qu'au chargement de la page : les autres pages ne
  demandent toujours aucune tuile, et la politique de confidentialité le dit.
- **Le dessin du prototype reste le repli** : il est dans le HTML servi, donc
  visible sans JavaScript, et il est remis en place si Leaflet ou les tuiles
  échouent (`tests/e2e/contact-map.spec.js` coupe le chunk Leaflet pour le
  vérifier).

Pas d'épingle d'adresse, volontairement : la légende décrit une zone, et le
point mémorisé est la ville, pas la porte du bureau.

⚠️ Piège Leaflet : il faut appeler `setView()` **avant** d'ajouter les
couches. Tant que la carte n'a pas de vue, Leaflet met les couches en
attente, et un cercle sans carte ne sait pas donner ses limites — le
`fitBounds(cercle.getBounds())` qui suit lève alors une exception, la carte
se rabat silencieusement sur le dessin. La carte d'itinéraire n'a pas le
problème : elle cadre sur une liste de points, pas sur une couche.

⚠️ Les tuiles sont **la seule requête tierce du site**. Elles envoient l'IP
du visiteur et la zone consultée à OpenStreetMap — c'est déclaré dans la
politique de confidentialité. Le fournisseur est une constante dans
`src/lib/route-map.js` : la politique d'usage d'OSM déconseille les tuiles
en production à fort trafic, prévoyez un fournisseur dédié si l'audience
grandit.

### Contrainte API : la clé passe par l'URL, pas par un en-tête

OpenRouteService **rejette l'en-tête `Authorization` en CORS** (« Request
header field authorization is not allowed by Access-Control-Allow-Headers »).
La forme documentée pour les serveurs ne fonctionne donc jamais depuis un
navigateur. Les deux appels sont des `GET` avec `api_key` en paramètre, ce
qui évite aussi tout preflight. Ne pas « corriger » ça en repassant à un
POST JSON avec en-tête : ça casserait le simulateur en production alors que
les tests unitaires, qui simulent `fetch`, continueraient de passer.

### Pourquoi la clé n'a pas de préfixe `PUBLIC_`

Elle finit forcément dans le bundle navigateur — le brief §1.1 interdit tout
proxy serveur, donc l'appel de routage part du client (§5.4 l'anticipe).
Astro n'expose côté client que les variables `PUBLIC_*`, mais les
hébergeurs signalent ce préfixe comme une fuite. `astro.config.mjs` injecte
donc la valeur au moment du build, ce qui permet de nommer la variable
`ORS_API_KEY` sans préfixe. `PUBLIC_ORS_API_KEY` reste lue en repli.

⚠️ Renommer ne change **rien** à l'exposition : quel que soit le nom, la clé
est lisible dans le JavaScript livré. Les vraies protections sont le quota
journalier du fournisseur (pas de facture possible sur le plan gratuit) et le
repli sur le bouton d'appel si l'API ne répond plus. Ne jamais mettre dans
cette variable une clé qui donnerait accès à autre chose qu'au routage.

## Contenus

Les textes NL/FR affichés (accroche, services, FAQ, mentions légales,
politique de confidentialité) proviennent du prototype validé et ont été
explicitement approuvés par l'utilisateur comme contenu définitif (et non
comme simple habillage de maquette) — voir `src/data/services.js`,
`src/data/faqs.js`, `src/data/legal.js`, `src/i18n/dictionary.js`.

**Le texte anglais (EN) est une traduction faite par le développeur**,
autorisée explicitement par l'utilisateur lors de l'ajout de la 3e langue
(le prototype n'avait que NL/FR) — **non relu par le client**. À faire
valider avant mise en ligne si l'anglais reste dans le périmètre V1.

La politique de confidentialité (`src/data/legal.js`) suit la structure du
prototype ; une section a été ajoutée (non présente dans le prototype, qui
n'utilisait aucun service tiers) pour documenter l'envoi de données à
OpenRouteService (les deux adresses saisies).

## Structure trilingue

Slugs traduits, définis une seule fois dans `src/i18n/routes.js`
(source de vérité pour le routing, le hreflang et le sitemap) :

| Page | NL | FR | EN |
|---|---|---|---|
| Home | `/nl/` | `/fr/` | `/en/` |
| Services | `/nl/diensten/` | `/fr/services/` | `/en/services/` |
| Aéroport | `/nl/luchthavenvervoer/` | `/fr/transport-aeroport/` | `/en/airport-transfer/` |
| Tarifs | `/nl/tarieven/` | `/fr/tarifs/` | `/en/rates/` |
| Contact | `/nl/contact/` | `/fr/contact/` | `/en/contact/` |
| Mentions légales | `/nl/juridische-info/` | `/fr/mentions-legales/` | `/en/legal-notice/` |
| Confidentialité | `/nl/privacybeleid/` | `/fr/politique-confidentialite/` | `/en/privacy-policy/` |

Ordre de navigation repris du prototype : Home, Tarifs, Aéroport, Services,
Contact (voir `Header.astro`/`Footer.astro`).

La page 404 (`src/pages/404.astro`) est unique physiquement (contrainte des
sites statiques) mais contient les trois traductions ; un script détecte le
préfixe `/nl|fr|en/` de l'URL visitée pour afficher la bonne langue.

## Polices

Cabinet Grotesk et Satoshi sont **auto-hébergées** dans `public/fonts/`
(cinq fichiers woff2, ~110 Ko au total), et non chargées depuis le CDN de
Fontshare comme le faisait le prototype. Deux raisons : supprimer un
aller-retour tiers bloquant sur le chemin critique (objectif LCP < 2,5 s),
et éviter d'envoyer l'adresse IP de chaque visiteur à un tiers — ce qui
devrait sinon figurer dans la politique de confidentialité.

Les deux fontes visibles au-dessus de la ligne de flottaison sont
préchargées dans `BaseLayout.astro`. Pour mettre à jour une fonte,
retélécharger le woff2 depuis fontshare.com et remplacer le fichier ; les
`@font-face` sont en haut de `src/styles/global.css`.

## Balisage structuré

`SchemaOrg.astro` produit un `TaxiService` dont le `provider` est le
`LocalBusiness`. **Attention** : l'exemple du CDC §11.4 place `priceRange` et
`openingHoursSpecification` directement sur `TaxiService` — le validateur
schema.org les rejette à ce niveau (ce sont des propriétés de
`LocalBusiness`). Ils sont donc portés par `provider`. Vérifié sur
validator.schema.org : 0 erreur, 0 avertissement, pour `TaxiService` comme
pour `FAQPage`. Un test E2E verrouille ce placement.

## Un piège CSS à connaître si vous touchez le header

`.site-header` n'a **pas** de `backdrop-filter`, volontairement : cette
propriété (comme `transform`/`filter`) transforme son élément en containing
block pour tout descendant `position:fixed` — ici, le panneau plein écran
du menu mobile (`.mobile-menu-panel`), qui se retrouvait alors limité à la
hauteur du header (64px) au lieu de couvrir l'écran. Si vous réintroduisez
un flou sur le header, sortez le menu mobile de sa hiérarchie DOM, ou testez
soigneusement sur mobile.

## Toponymes bilingues et H1 de l'accueil

- **Communes** (`servedMunicipalities`, `src/lib/municipalities.js`) : chaque
  commune porte son nom néerlandais et français. La page affiche celui de sa
  langue d'abord, l'autre entre parenthèses (« Tirlemont (Tienen) » en FR,
  « Tienen (Tirlemont) » en NL/EN) — les deux formes sont dans le texte, donc
  indexables. Le champ « Votre commune ? » reconnaît l'un ou l'autre. Ne
  renseigner une paire que si le client l'a confirmée.
- **H1 de l'accueil** : porte le mot-clé (« Taxi à Tienen, jour et nuit »,
  clé `h1`) ; l'ancienne accroche (« Où voulez-vous aller ? », clé
  `heroHook`) est le sous-titre juste dessous (`.hero-hook`).

## Contenu SEO validé (2026-10-19)

- **Titles et meta descriptions** (`src/i18n/seo.js`) : mot-clé en tête, marque
  à la fin (« Taxi à Tienen, jour et nuit — Taxi QISSI »), appel à l'action
  (« Appelez-nous ou écrivez sur WhatsApp ») sur les 5 pages commerciales.
  Limites vérifiées par test : titre ≤ 60, description ≤ 155 caractères.
  Mentions légales et confidentialité gardent un titre sobre. Le mot
  « réserver » est évité : le site dit qu'on ne réserve pas en ligne.
- **FAQ de la page Tarifs** (`FAQS_RATES`, `src/data/faqs.js`) : 4 questions
  (calcul du prix, attente à la seconde près, paiement par carte, gare de
  Tienen), avec les données structurées `FAQPage`. Les montants viennent de
  `FARE` : changer un tarif met la FAQ à jour.
- **Bloc Contact** « Que mentionner dans votre message ? »
  (`MessageTips.astro`) : reprend les champs du message WhatsApp pré-rempli.
- **Gare de Tienen** nommée dans le texte « Réservation à l'avance » de la page
  Services (`src/data/services.js`).
- **Pas encore fait** : la FAQ de la page Transport aéroport attend les
  réponses du client (forfaits « aller simple » ? supplément de nuit ? prix du
  retour ?), et l'étoffement de la page Services attend les infos véhicules.

## Avis Google

Le lien d'avis de la fiche Google Business Profile
(`BUSINESS.googleReviewUrl`, `src/config/business.js`) apparaît à deux endroits :
le **pied de page** de toutes les pages (`Footer.astro`) et une invitation
dédiée sur la page **Contact** (`ReviewCta.astro`). Le texte du lien dit ce
qu'il fait (« Laisser un avis sur Google ») et nomme l'entreprise et la ville ;
le lien est un lien normal (`target="_blank" rel="noopener"`, ni `nofollow` ni
`sponsored` : c'est un lien éditorial vers sa propre fiche). Chaque clic est
compté via `data-analytics="google_review_click"`.

Les données structurées (`SchemaOrg.astro`) relient aussi le site à la fiche :
`provider.hasMap` et `provider.sameAs` pointent vers l'URL Maps du lieu
(`BUSINESS.googleMapsUrl`, construite avec l'identifiant de lieu que Google
renvoie en redirigeant le lien d'avis). Si Google régénère le lien d'avis, les
deux constantes sont à mettre à jour ensemble. Aucune note moyenne
(`aggregateRating`) n'est publiée : on n'affiche jamais de notation qu'on ne
peut pas prouver.

## Domaine Vercel bloqué à l'indexation

`taxiqissi.be` et `taxi-qissi.vercel.app` servent le même build : un site
statique n'a aucun moyen de savoir, au moment de la génération, sur quel
nom de domaine il finira consulté. `robots.txt` et les balises `<meta>` ne
peuvent donc pas différer entre les deux.

`vercel.json` s'en charge à la place, au niveau de la plateforme plutôt que
du site : un en-tête `X-Robots-Tag: noindex, nofollow` est ajouté à toutes
les réponses, mais seulement quand la requête arrive sur
`taxi-qissi.vercel.app` (matcher `host`). `taxiqissi.be` n'est pas concerné
et reste indexable normalement.

✅ **Vérifié en conditions réelles le 2026-09-17** (le domaine `taxiqissi.be`
ne répondait pas encore lors de l'écriture initiale de cette section) :

```sh
curl -sI https://taxi-qissi.vercel.app/ | grep -i x-robots-tag
# → X-Robots-Tag: noindex, nofollow
curl -sI https://taxiqissi.be/ | grep -i x-robots-tag   # doit être vide
```

### Racine `/` : vraie redirection 301 (pas le tampon meta-refresh)

`astro.config.mjs` déclare `redirects: { '/': '/nl/' }`, mais pour un build
statique Astro ne peut produire qu'une page-tampon (`<meta
http-equiv="refresh">` + `<meta name="robots" content="noindex">` — cette
dernière balise volontaire, pour ne jamais indexer une page sans contenu).
Search Console signale donc `/`, `www` et `http://` comme « exclues par la
balise noindex » — normal, mais le rapport reste plus propre avec une vraie
redirection.

`vercel.json` en ajoute une (`redirects`, HTTP 301) : Vercel l'applique en
périphérie, avant même de servir la page-tampon, sur tous les domaines
(`taxiqissi.be`, `www.taxiqissi.be`, `taxi-qissi.vercel.app`). La
page-tampon générée par Astro reste dans `dist/` en filet de secours pour
un hébergement sans cette configuration (voir homelab ci-dessous).

## Hébergement (homelab)

- Build reproductible, sans dépendance à un service tiers : `npm run build`
  produit un dossier `dist/` statique à servir tel quel.
- Configurer le reverse proxy pour :
  - rediriger HTTP → HTTPS ;
  - servir `dist/404.html` pour toute route non trouvée, quel que soit le
    préfixe de langue (`try_files ... /404.html` sous nginx) ;
  - effectuer une vraie redirection HTTP 301 `/` → `/nl/` (le
    `redirects` d'Astro dans `astro.config.mjs` ne produit qu'un fallback
    meta-refresh pour le build statique).
- Vérifier les conditions d'utilisation du FAI avant mise en ligne d'un
  service commercial (brief §12).

## Analytics

Deux outils, l'un actif, l'autre en attente.

**Vercel Web Analytics** (actif depuis le 2026-09-11). Activé côté
tableau de bord Vercel, puis câblé ici via `@vercel/analytics/astro`
(`<Analytics />` dans `BaseLayout.astro`). Son script se charge sur un
chemin du même domaine (`/_vercel/insights/script.js`) — Vercel le sert
lui-même en périphérie, ce n'est jamais un appel réseau visible vers un
domaine tiers, et le test E2E "serves no third-party requests" reste donc
vert. Ça ne dispense pas de le déclarer : les données de visite partent
bien vers Vercel Inc. (société américaine), disclosure ajoutée à la
politique de confidentialité (`src/data/legal.js`).

⚠️ **Piège vérifié le 2026-09-11** : en `astro dev`, ce script charge sa
version de débogage depuis `https://va.vercel-scripts.com` — un vrai appel
tiers, propre au développement local. Ne pas confondre avec le
comportement en production (build statique), où le chemin est bien
`/_vercel/insights/script.js`. Vérifié en inspectant les deux dans un
navigateur, pas seulement en lisant le code du paquet — les deux branches
existent dans le bundle compilé, seul le test en conditions réelles dit
laquelle s'exécute.

**Umami**, auto-hébergé, prévu par le brief (§8 : sans cookie de suivi,
donc sans bandeau de consentement à traduire trois fois) mais toujours en
attente d'une instance qui tourne quelque part. Activation : renseigner
`PUBLIC_UMAMI_SRC` et `PUBLIC_UMAMI_WEBSITE_ID` dans `.env` — tant qu'ils
sont vides, cette moitié ne charge rien, en dev comme en production.

Les deux tournent en parallèle sans se gêner : `trackEvent()` dans
`src/lib/analytics.js` envoie chaque événement aux deux à la fois (chacun
protégé par son propre `try/catch`, un outil absent ou en panne ne doit
jamais faire échouer l'autre ni casser la page).

Événements instrumentés (via l'attribut `data-analytics`, cf. brief §8) :
`call_click`, `whatsapp_click`, `simulator_open`, `estimate_success`,
`whatsapp_send`, `google_review_click`. Ne jamais faire transiter une donnée de formulaire dans un
événement — ce sont des noms d'événements anonymes, sans paramètre.

Pour changer d'outil (Plausible CE, GoatCounter…) : la balise script dans
`src/layouts/BaseLayout.astro` et l'appel unique dans `src/lib/analytics.js`.

## Performance et images

Le build est volontairement léger : ~24 Ko d'HTML par page, ~62 Ko d'assets,
deux scripts, **aucune requête vers un tiers** (polices comprises, cf.
`global.css`). Toutes les icônes sont des SVG inline — il n'y a donc à ce
jour aucune balise `<img>` à différer.

Quand les photos de véhicules arriveront (elles remplaceront les
placeholders `.airport-media`), elles doivent :

- passer par `<Image />` d'`astro:assets` ou porter `loading="lazy"`,
  `decoding="async"` et des `width`/`height` explicites (évite le
  décalage de mise en page) ;
- être servies en AVIF/WebP avec un repli JPEG ;
- rester hors du premier écran, sinon retirer le `lazy` sur celle qui
  devient l'élément LCP.

## Points en attente côté client

- Numéro de licence IBP (vergunning individueel bezoldigd personenvervoer).
- Règle précise de variation du forfait aéroport selon l'adresse de prise
  en charge : les cinq prix (confirmés les 2026-09-15 et 2026-09-16) sont
  ceux d'un départ de Tienen, mais le client a seulement signalé qu'ils
  "peuvent différencier" pour un autre point de départ, sans donner de
  règle de calcul. En attendant, le site affiche une note invitant à
  confirmer le prix exact par téléphone (`flatFareNote`) plutôt que
  d'inventer un ajustement.
- Liste définitive des communes desservies — celle affichée est le
  sous-ensemble "22 plus demandées" du prototype, pas la liste complète du
  CDC §3. Côté noms : seules les 7 paires NL/FR confirmées par le client
  (2026-10-15 et 2026-10-19) sont affichées (Tienen/Tirlemont,
  Leuven/Louvain, Sint-Truiden/Saint-Trond, Geldenaken/Jodoigne,
  Graven/Grez-Doiceau, Scherpenheuvel/Montaigu, Hannuit/Hannut) ; toute autre
  paire est à confirmer avant d'être ajoutée.
- Relecture juridique de la politique de confidentialité et validation de
  l'affichage des tarifs (cf. `cdc_v1_taxi_qiss.md` §15).
- Relecture du contenu anglais par le client si l'anglais reste au périmètre.
- URL et identifiant du serveur Umami une fois celui-ci monté sur le homelab.
- Logo définitif : remplacer `public/favicon.svg` (icône provisoire) et
  ajouter un `apple-touch-icon.png`.
- Test sur téléphone réel (iOS **et** Android) du message WhatsApp
  pré-rempli — les tests automatisés couvrent l'encodage, pas le
  comportement de l'app WhatsApp elle-même.
