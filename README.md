# Taxi Q.I.S.S — site web

Site statique trilingue (NL/FR/EN) pour Q.I.S.S SRL (service de taxi, Tienen).
Voir `brief_dev_taxi_qiss.md` et `docs (hors repo)/cdc_v1_taxi_qiss.md` (hors
de ce dépôt) pour les exigences complètes. Ce README documente uniquement ce
qui est nécessaire pour builder, développer et déployer.

## Contrainte d'architecture — à ne jamais casser

Le calcul d'itinéraire, l'estimation de prix et la construction du message
WhatsApp s'exécutent **entièrement dans le navigateur**. Aucune adresse, nom
ou donnée de formulaire ne doit transiter par un serveur, un log ou une base
de données. Voir `src/lib/geocoding.js`, `src/lib/fare.js`,
`src/lib/whatsapp.js` — toute la logique métier vit ici, côté client.

## Stack

- [Astro](https://astro.build) (sortie statique, `output: 'static'`)
- Aucun framework UI (JS vanilla dans les îlots `<script>` du simulateur) —
  minimise le JS expédié, cible LCP < 2,5 s
- [OpenRouteService](https://openrouteservice.org) pour l'autocomplétion
  d'adresses et le calcul d'itinéraire (choix par défaut, gratuit, sans
  infra à monter — voir `src/lib/geocoding.js` pour le remplacer)

## Développement

```sh
npm install
cp .env.example .env   # puis renseigner PUBLIC_ORS_API_KEY
npm run dev
```

```sh
npm run build     # build statique dans ./dist
npm run preview   # prévisualiser le build
```

## Configuration métier

Toutes les valeurs métier (téléphone, WhatsApp, licence IBP, domaine,
communes desservies) sont centralisées dans `src/config/business.js`. Tant
qu'une valeur n'est pas confirmée par le client, elle reste à
`[TO_BE_CONFIRMED]` et s'affiche comme telle dans le rendu — ne jamais la
remplacer par une valeur plausible.

Avant mise en ligne :

1. Renseigner `BUSINESS.phone`, `BUSINESS.whatsapp`, `BUSINESS.licenseNumber`,
   `BUSINESS.commercialName`, `BUSINESS.domain`, `BUSINESS.servedMunicipalities`.
2. Mettre à jour `site` dans `astro.config.mjs` avec le domaine réel (utilisé
   pour les canonicals, hreflang, sitemap.xml, robots.txt).
3. Configurer `PUBLIC_ORS_API_KEY` en production, et **restreindre la clé par
   domaine référent + plafonner le quota** sur le dashboard OpenRouteService
   avant d'ouvrir l'accès public (sinon facturation/abus possible).

## Contenus

Les textes marketing (accroche homepage, descriptions de services, FAQ,
mentions légales et politique de confidentialité) ne sont pas encore rédigés
— voir `cdc_v1_taxi_qiss.md` §8. Ils vivent dans `src/content/{nl,fr,en}/*.json`
et sont marqués `[À RÉDIGER]` / `[INHOUD NOG TE SCHRIJVEN]` /
`[CONTENT TO BE WRITTEN]`. Remplacer ces valeurs ne nécessite pas de toucher
aux gabarits `.astro`.

**La politique de confidentialité (`privacy.json`) est un brouillon
technique et ne doit pas être publiée sans relecture juridique** — elle
couvre les points listés au §10.2 du CDC (base légale, canal WhatsApp,
service cartographique, analytics) mais la formulation reste à valider.

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

La page 404 (`src/pages/404.astro`) est unique physiquement (contrainte des
sites statiques) mais contient les trois traductions ; un script détecte le
préfixe `/nl|fr|en/` de l'URL visitée pour afficher la bonne langue.

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

Pas de fournisseur câblé par défaut (décision en attente — cf. brief §8 :
solution sans cookie de suivi). `src/lib/analytics.js` expose `trackEvent()`
et ne fait rien tant qu'aucun script n'est chargé dans
`src/layouts/BaseLayout.astro`. Ne jamais faire transiter une donnée de
formulaire dans un événement analytics.

## Points en attente côté client

Voir `cdc_v1_taxi_qiss.md` §15 (points ouverts) et `brief_dev_taxi_qiss.md`
§10 (points à signaler). Résumé des blocages pour la mise en ligne :
téléphone, numéro WhatsApp, licence IBP, liste définitive des communes,
nom commercial définitif, contenus NL/FR/EN, validation juridique de la
politique de confidentialité et de l'affichage des tarifs.
