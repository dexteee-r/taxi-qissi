# État du projet — Taxi Q.I.S.S

Journal court, tenu à jour au fil des sessions de dev. Complète (ne
remplace pas) `brief_dev_taxi_qiss.md` et `cdc_v1_taxi_qiss.md`.

## Fait (2026-09-04, session 3 — fidélité, tests, mesure)

**Fidélité au prototype.** Relecture ligne à ligne des deux artboards
(desktop + mobile) et correction des écarts structurels : échelle
typographique complète (h1 58/34 px, h2 30/21 px…), ordre des blocs qui
s'inverse entre mobile et desktop sur l'accueil (zone avant services en
mobile), section « zone » en pastilles + repli « les 22 communes » en
mobile, services en liste verticale (mobile) / grille 5 colonnes (desktop),
FAQ en deux colonnes en desktop, icônes dans le menu tiroir, contact en
libellés empilés sans boutons en mobile, bouton « calculer » collant avec
dégradé, bloc CTA aéroport en mobile, ordre du footer et langues en toutes
lettres, 404 conforme.

**Trois bugs réels trouvés en vérifiant** (aucun n'était visible à l'œil sur
capture d'écran seule) :

1. Astro injecte le `<script>` d'un composant comme frère dans le DOM, ce
   qui décalait les sélecteurs `:nth-child()` utilisés pour l'ordre des
   sections → remplacés par des classes explicites.
2. Des règles `display:flex` écrasaient l'attribut `hidden` (les messages de
   zone s'affichaient en permanence) → ajout d'un `[hidden]{display:none
   !important}` global.
3. Le conteneur du reçu n'était pas un flex, donc les `order` par breakpoint
   n'avaient aucun effet (bouton « modifier ma course » avant le message
   pré-rempli au lieu d'après).

**Tests.** 46 tests unitaires (Vitest) + 167 E2E (Playwright, desktop +
mobile) — voir README. Ils couvrent notamment la vérification qu'aucune
donnée de formulaire ne quitte le navigateur, l'encodage du message
WhatsApp, et le placement du JSON-LD.

**Analytics.** Umami auto-hébergé, sans cookie, piloté par variables
d'environnement (rien n'est chargé tant qu'elles sont vides). Section
« mesure d'audience » de la politique de confidentialité mise à jour dans
les trois langues.

**Mesure.** Contraste WCAG AA : 162 éléments audités sur l'accueil et les
tarifs (reçu compris), 0 échec. Build : ~24 Ko d'HTML par page, ~62 Ko
d'assets, LCP local 88 ms. Polices rapatriées en auto-hébergement → **plus
aucune requête tierce** (gain performance *et* confidentialité). JSON-LD
validé sur validator.schema.org : 0 erreur / 0 avertissement après
correction (`priceRange` et `openingHoursSpecification` déplacés sur
`provider`, l'exemple du CDC §11.4 étant invalide à cet endroit).

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
- URL + identifiant du serveur Umami (l'outil est choisi et câblé, il reste
  à monter l'instance sur le homelab).
- Logo réel (le favicon actuel est une icône provisoire), photos véhicules
  (les blocs image utilisent un placeholder texte).
- Test sur device iOS/Android réel (encodage WhatsApp) — les tests couvrent
  l'encodage de l'URL, pas le comportement de l'app WhatsApp.

## Prochaines étapes probables

1. Obtenir du client : licence IBP, confirmation domaine, prix/distances
   aéroports, liste communes complète (ou validation du sous-ensemble
   affiché), relecture EN, logo et photos.
2. Monter l'instance Umami sur le homelab et renseigner les deux variables
   d'environnement.
3. Config nginx (redirection HTTPS, `/` → `/nl/` en vrai 301, fallback
   `404.html`) sur le homelab — `tests/static-server.mjs` sert de référence
   exécutable pour ce comportement.
4. Test réel iOS/Android du flux WhatsApp.
5. Mesurer le LCP en conditions réelles (4G bridée) une fois en ligne, et
   passer un Lighthouse sur le domaine définitif.
