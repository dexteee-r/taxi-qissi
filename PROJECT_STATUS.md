# État du projet — Taxi Q.I.S.S

Journal court, tenu à jour au fil des sessions de dev. Complète (ne
remplace pas) `brief_dev_taxi_qiss.md` et `cdc_v1_taxi_qiss.md`.

## Fait (2026-09-04, session 2 — reconstruction sur le prototype)

L'utilisateur a fourni le prototype Claude Design validé
(`../claude design template/TaxiDesktop.dc.html` + `TaxiScreen.dc.html`,
non versionné dans ce dépôt) et demandé de reconstruire le site dessus.
Quatre divergences entre prototype et CDC/brief ont été identifiées et
tranchées avec l'utilisateur (voir README.md) :

1. **Langue EN** — le prototype n'a que NL/FR. Ajoutée en suivant le même
   design ; traduction faite par le développeur, non relue par le client.
2. **Architecture du simulateur** — le prototype utilise une liste
   déroulante de destinations à distances fixes, pas d'autocomplétion
   d'adresse réelle. Retenu en **hybride** : dropdown du prototype +
   option "Autre adresse" qui déclenche un vrai lookup OpenRouteService
   (au lieu du message d'erreur systématique du prototype).
3. **Coordonnées de contact** — téléphone/WhatsApp/e-mail du prototype
   confirmés réels par l'utilisateur → intégrés dans `business.js` (plus
   de `[TO_BE_CONFIRMED]` pour ces champs). Domaine `taxiqissi.be` déduit
   de l'e-mail, pas confirmé séparément.
4. **Contenu du prototype** — confirmé comme approuvé/définitif (pas un
   habillage de maquette) → intégré tel quel pour NL/FR dans
   `src/data/*.js`.

Reconstruction complète : design system (typographie Cabinet Grotesk +
Satoshi, palette bleu #0369A1/vert WhatsApp #0F7A6D), header avec menu
mobile plein écran (`<details>` natif, pas de JS framework), barre d'action
fixe en bas sur mobile, sélecteur de langue à 3 options, 21 pages + 404
reconstruites avec le contenu et l'ordre de blocs du prototype.

**Bug trouvé et corrigé en cours de route** : `backdrop-filter` sur le
header transformait celui-ci en containing block CSS pour le menu mobile
(`position:fixed`), qui se retrouvait limité à 64px de haut au lieu de
couvrir l'écran. Retiré du header (voir README.md pour le détail).

Build vérifié (22 pages, sans erreur) et testé dans le navigateur : flux
simulateur (destination connue, destination aéroport `tbc`, "autre adresse"
sans résultat → état d'erreur avec bouton d'appel accessible), menu mobile
plein écran + bouton de fermeture, sélecteur de langue 3 langues, JSON-LD
avec les vraies données métier, contenu NL/FR/EN sur plusieurs pages.

## Fait (2026-09-04, session 1 — scaffold initial)

Scaffold Astro, structure trilingue, simulateur v1 (autocomplétion libre +
OpenRouteService), JSON-LD, sitemap/robots. Remplacé par la session 2
ci-dessus sur la base du prototype ; la logique de calcul de tarif
(`src/lib/fare.js`) et le module `src/lib/geocoding.js` ont été conservés
(adaptés pour le flux hybride).

## Connu comme manquant / en attente

- Numéro de licence IBP (absent du prototype, jamais fourni).
- Confirmation indépendante du domaine (actuellement déduit de l'e-mail).
- Distances/prix réels des transferts aéroport (`tbc` comme dans le
  prototype).
- Liste complète des communes desservies (le site affiche le sous-ensemble
  "22 plus demandées" du prototype, pas la liste complète du CDC §3).
- Relecture juridique de la politique de confidentialité (cf. CDC §15).
- Relecture du contenu anglais par le client.
- Fournisseur d'analytics sans cookie : non choisi/câblé.
- Logo réel, photos véhicules (le hero utilise un placeholder texte).
- Test sur device iOS/Android réel (encodage WhatsApp) — fait en dev
  uniquement.

## Prochaines étapes probables

1. Obtenir du client : licence IBP, confirmation domaine, prix/distances
   aéroports, liste communes complète (ou validation du sous-ensemble
   affiché), relecture EN.
2. Choisir et câbler un outil d'analytics sans cookie.
3. Config nginx (redirection HTTPS, `/` → `/nl/` en vrai 301, fallback
   `404.html`) sur le homelab.
4. Test réel iOS/Android du flux WhatsApp.
