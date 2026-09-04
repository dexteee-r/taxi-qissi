# État du projet — Taxi Q.I.S.S

Journal court, tenu à jour au fil des sessions de dev. Complète (ne
remplace pas) `brief_dev_taxi_qiss.md` et `cdc_v1_taxi_qiss.md`.

## Fait (2026-09-04)

- Scaffold Astro (sortie statique), structure trilingue avec slugs traduits
  (`src/i18n/routes.js`), 21 pages générées + page 404 trilingue.
- Simulateur de prix client-only : autocomplétion + itinéraire routier réel
  via OpenRouteService, calcul de tarif (`src/lib/fare.js`), génération du
  message WhatsApp (`src/lib/whatsapp.js`), 4 états (vide/chargement/erreur/
  résultat), combobox accessible au clavier.
- Balisage `TaxiService`/`LocalBusiness` (JSON-LD) sur toutes les pages,
  `FAQPage` sur la home, `sitemap.xml` et `robots.txt` générés dynamiquement.
- `config/business.js` : toutes les valeurs métier non confirmées restent
  `[TO_BE_CONFIRMED]` et s'affichent comme telles (vérifié en dev).
- Build vérifié (`npm run build` → 21 pages + 404 + sitemap + robots, sans
  erreur) et testé dans le navigateur (états du simulateur, hreflang,
  JSON-LD, barre d'appel mobile fixe).

## Décisions prises

- Service cartographique : **OpenRouteService** (gratuit, pas de CB, pas
  d'infra à monter) — choisi par le développeur avec l'accord de
  l'utilisateur, à rediscuter avec le client si besoin. Isolé dans
  `src/lib/geocoding.js` pour rester remplaçable.
- Pas de framework UI : JS vanilla dans le simulateur pour limiter le poids
  JS (objectif LCP < 2,5 s).

## Connu comme manquant / en attente

- **Prototype Claude Design** cité comme document d'autorité par le brief
  (§1.3) pour la hiérarchie des pages et les parcours : jamais fourni. La
  structure actuelle des pages est une interprétation raisonnable du CDC,
  pas une conformité vérifiée au prototype.
- Contenus marketing NL/FR/EN (accroche, descriptions, FAQ, mentions
  légales, politique de confidentialité) : placeholders dans
  `src/content/{nl,fr,en}/*.json`, non rédigés (cf. CDC §8).
- Politique de confidentialité : brouillon technique, **pas prête pour
  publication** sans relecture juridique.
- Toutes les valeurs de `src/config/business.js` (téléphone, WhatsApp,
  licence IBP, nom commercial, domaine, communes desservies).
- Fournisseur d'analytics sans cookie : non choisi/câblé.
- Logo, couleur d'accent finale, photos véhicules.
- Pas encore testé sur device iOS/Android réel (encodage WhatsApp) — fait en
  dev uniquement, à refaire avant mise en ligne.

## Prochaines étapes probables

1. Obtenir du client les éléments du lot L0 (CDC §13).
2. Si le prototype Claude Design existe quelque part, le fournir pour
   vérifier/ajuster la structure de page actuelle.
3. Rédaction des contenus (accroche, services, FAQ, légal) une fois validés
   par le client.
4. Choisir et câbler un outil d'analytics sans cookie.
5. Config nginx (redirection HTTPS, `/` → `/nl/` en vrai 301, fallback
   `404.html`) sur le homelab.
