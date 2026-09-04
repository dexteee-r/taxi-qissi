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
3. Configurer `PUBLIC_ORS_API_KEY` en production, et **restreindre la clé par
   domaine référent + plafonner le quota** sur le dashboard OpenRouteService
   avant d'ouvrir l'accès public (sinon facturation/abus possible) — cette
   clé n'est utilisée que par le chemin "Autre adresse" du simulateur.

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

Pas de fournisseur câblé par défaut (décision en attente — cf. brief §8 :
solution sans cookie de suivi). `src/lib/analytics.js` expose `trackEvent()`
et ne fait rien tant qu'aucun script n'est chargé dans
`src/layouts/BaseLayout.astro`. Ne jamais faire transiter une donnée de
formulaire dans un événement analytics.

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
