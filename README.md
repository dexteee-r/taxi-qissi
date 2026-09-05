# Taxi Q.I.S.S — site web

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
- [OpenRouteService](https://openrouteservice.org) pour le seul cas qui
  nécessite un lookup d'adresse en direct (voir "Simulateur" ci-dessous)

## Simulateur de prix — architecture hybride

Le prototype validé utilise une **liste déroulante de destinations
prédéfinies** (communes proches, gares, hôpital, 5 aéroports) avec des
distances fixes (`src/data/destinations.js`), au lieu de l'autocomplétion
libre + itinéraire temps réel décrite dans le brief/CDC (§5.4 / §7.7). Ce
choix de design a été confirmé par l'utilisateur.

Architecture retenue (2026-09-04, décision explicite de l'utilisateur) :
**hybride**. La liste déroulante du prototype reste le chemin principal
(rapide, gratuit, aucune donnée envoyée à un tiers). L'option « Autre
adresse » — qui dans le prototype menait systématiquement à un message
d'erreur — déclenche à la place une recherche d'adresse réelle via
OpenRouteService (autocomplétion + distance routière depuis la base de
Taxi QISSI). C'est le seul flux qui envoie une donnée saisie à un tiers ;
c'est documenté dans `src/data/legal.js` (section confidentialité).

Les aéroports sont marqués `tbc: true` dans `destinations.js` — prix et
distance "à confirmer", exactement comme dans le prototype ; le simulateur
affiche alors un CTA d'appel au lieu d'un prix.

### Distances : vérifiées, pas devinées

Les distances livrées avec le prototype étaient des estimations de maquette,
fausses de −60 % à +68 %. Elles sont désormais mesurées via OpenRouteService :

```sh
npm run verify:distances         # compare, sans rien modifier
npm run verify:distances:write   # met à jour src/data/destinations.js
```

Le script refuse d'écrire sans `--ors` : les distances stockées doivent venir
du même routeur que celui interrogé à l'exécution, sinon la même destination
serait facturée différemment selon le chemin emprunté par le visiteur.

⚠️ **À faire valider par le chauffeur.** Ce sont des trajets de centre à
centre, et un routeur optimise le *temps*, pas la distance. Viser la grand-
place plutôt que la gare ajoute plusieurs kilomètres à cause des zones
piétonnes (Leuven : 33,6 km vers la Grote Markt contre 26 km vers la gare).
Comme le tarif est kilométrique, le point de référence déplace le prix
annoncé.

## Développement

```sh
npm install
cp .env.example .env   # puis renseigner PUBLIC_ORS_API_KEY (nécessaire uniquement pour "Autre adresse")
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
  connue, aéroport « à confirmer », nuit, « autre adresse » sans résultat,
  recalcul) ; **vérification qu'aucune donnée de formulaire ne quitte le
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
WhatsApp, e-mail. Le domaine `taxiqissi.be` est **déduit** du domaine de
l'e-mail confirmé, pas explicitement validé séparément — à vérifier.

**Toujours en attente** : `licenseNumber` (vergunning IBP — absente du
prototype, non fournie). Reste `[TO_BE_CONFIRMED]` et s'affiche comme tel
dans le rendu — ne jamais la remplacer par une valeur plausible.

Avant mise en ligne :

1. Confirmer `BUSINESS.domain` et renseigner `BUSINESS.licenseNumber`.
2. Vérifier que `site` dans `astro.config.mjs` correspond au domaine réel.
3. Déclarer `ORS_API_KEY` **dans les variables d'environnement de l'hébergeur**
   (sur Vercel : Settings → Environment Variables). Le `.env` local n'est pas
   déployé : sans ça, l'option « Autre adresse » fonctionne en local et échoue
   en production. Puis **plafonner le quota journalier** sur le dashboard
   OpenRouteService avant d'ouvrir l'accès public.

### Carte de l'itinéraire

Le résultat du simulateur affiche l'itinéraire réel sur une carte (Leaflet +
fonds OpenStreetMap), conformément au CDC §7.1. Trois points de conception :

- **Chargement différé** (brief §7) : Leaflet, sa CSS, les tracés et les
  tuiles ne sont récupérés qu'après le calcul d'une estimation. Rien n'est
  préchargé — `npm run build` place Leaflet (145 Ko) et les tracés (20 Ko)
  dans des chunks séparés, et la CSS est importée en `?url` pour ne pas
  finir en `<link>` bloquant dans le `<head>`.
- **Zéro appel supplémentaire** : le tracé des 15 destinations est
  pré-calculé dans `src/data/route-geometries.js` (polylignes encodées,
  générées par le script de vérification) ; l'option « Autre adresse »
  réutilise la géométrie déjà présente dans la réponse de son calcul
  d'itinéraire.
- **Dégradation propre** (brief §5.3) : si Leaflet ou les tuiles échouent,
  la carte reste masquée et le prix, le message WhatsApp et le bouton
  d'appel fonctionnent normalement. Testé en coupant le fournisseur de
  tuiles.

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
OpenRouteService via le chemin "Autre adresse".

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

**Umami**, auto-hébergé à côté du site (brief §8 : sans cookie de suivi,
donc sans bandeau de consentement à traduire trois fois). Choisi parce qu'il
est libre, gratuit, ne pose aucun cookie, ne stocke pas de donnée
personnelle, et parce que l'auto-hébergement garde les statistiques sur la
même machine que le site.

Activation : renseigner `PUBLIC_UMAMI_SRC` et `PUBLIC_UMAMI_WEBSITE_ID` dans
`.env`. Tant qu'ils sont vides, **aucun script de mesure n'est chargé** — ni
en dev, ni dans un build de pré-lancement.

Événements instrumentés (via l'attribut `data-analytics`, cf. brief §8) :
`call_click`, `whatsapp_click`, `simulator_open`, `estimate_success`,
`whatsapp_send`. Ne jamais faire transiter une donnée de formulaire dans un
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
- Confirmation indépendante du domaine `taxiqissi.be` (actuellement déduit
  de l'e-mail).
- Distances/prix réels des transferts aéroport (actuellement `tbc`, comme
  dans le prototype).
- Liste définitive des communes desservies — celle affichée est le
  sous-ensemble "22 plus demandées" du prototype, pas la liste complète du
  CDC §3.
- Relecture juridique de la politique de confidentialité et validation de
  l'affichage des tarifs (cf. `cdc_v1_taxi_qiss.md` §15).
- Relecture du contenu anglais par le client si l'anglais reste au périmètre.
- URL et identifiant du serveur Umami une fois celui-ci monté sur le homelab.
- Logo définitif : remplacer `public/favicon.svg` (icône provisoire) et
  ajouter un `apple-touch-icon.png`.
- Test sur téléphone réel (iOS **et** Android) du message WhatsApp
  pré-rempli — les tests automatisés couvrent l'encodage, pas le
  comportement de l'app WhatsApp elle-même.
