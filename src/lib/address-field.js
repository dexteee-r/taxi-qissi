// Un champ d'adresse avec suggestions (le "combobox" du simulateur).
//
// Les deux champs du formulaire — départ et destination — se comportent
// exactement pareil, donc ils partagent ce fichier.
//
// LA REGLE A RETENIR : un champ n'est valide que si son texte correspond à
// une adresse choisie dans la liste des suggestions. Taper une adresse n'est
// pas la choisir : on ne peut pas calculer un itinéraire depuis une simple
// chaîne de caractères, il faut des coordonnées. Modifier le texte annule
// donc le choix.
import { autocompleteAddress, MapServiceError } from './geocoding.js';

// On attend une pause dans la frappe avant d'interroger l'API : sans ça,
// chaque lettre tapée coûterait une requête sur notre quota journalier.
const PAUSE_AVANT_RECHERCHE_MS = 500;
const MIN_CARACTERES = 3;

/**
 * Transforme un <input> + un <ul> en champ d'adresse à suggestions.
 *
 * @param {object} options
 * @param {HTMLInputElement} options.input      le champ de saisie
 * @param {HTMLUListElement} options.listbox    la liste où afficher les suggestions
 * @param {string} options.idPrefix             préfixe des id des suggestions ("from", "dest")
 * @param {object} options.textes               textes traduits (voir src/i18n/)
 * @param {{lat: number, lon: number}} options.autour  centre pour classer les résultats
 * @param {() => void} [options.onChoix]        appelé quand une adresse est choisie
 * @returns un objet pour lire et piloter le champ (voir le `return` en bas)
 */
export function createAddressField({ input, listbox, idPrefix, textes, autour, onChoix }) {
  let suggestions = [];
  let indexActif = -1;
  let minuteur;
  let adresseChoisie = null;
  // Vrai quand la recherche a échoué, par opposition à "aucun résultat" :
  // les deux méritent une réponse différente au moment de calculer.
  let indisponible = false;

  function fermerListe() {
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    indexActif = -1;
  }

  // Une ligne qui informe ("Recherche…", "Aucune adresse trouvée") au lieu
  // d'une suggestion cliquable. Sans elle, un champ muet donne l'impression
  // que le site ignore la frappe.
  function afficherMessage(texte) {
    listbox.innerHTML = '';
    const ligne = document.createElement('li');
    ligne.className = 'suggestion-status';
    ligne.setAttribute('role', 'status');
    ligne.textContent = texte;
    listbox.appendChild(ligne);
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function afficherSuggestions() {
    listbox.innerHTML = '';
    suggestions.forEach((suggestion, index) => {
      const ligne = document.createElement('li');
      ligne.role = 'option';
      ligne.id = `${idPrefix}-opt-${index}`;
      ligne.textContent = suggestion.label;
      ligne.setAttribute('aria-selected', String(index === indexActif));
      // mousedown et non click : le clic arriverait après le blur, qui a
      // déjà refermé la liste.
      ligne.addEventListener('mousedown', (event) => {
        event.preventDefault();
        choisir(index);
      });
      listbox.appendChild(ligne);
    });
    listbox.hidden = suggestions.length === 0;
    input.setAttribute('aria-expanded', String(suggestions.length > 0));
    if (indexActif >= 0) {
      input.setAttribute('aria-activedescendant', `${idPrefix}-opt-${indexActif}`);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function choisir(index) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    input.value = suggestion.label;
    adresseChoisie = { lat: suggestion.lat, lon: suggestion.lon, label: suggestion.label };
    fermerListe();
    onChoix?.();
  }

  async function chercher(texte) {
    afficherMessage(textes.acSearching);
    try {
      suggestions = await autocompleteAddress(texte, autour);
      indexActif = -1;
      indisponible = false;
      if (suggestions.length === 0) afficherMessage(textes.acNoResult);
      else afficherSuggestions();
    } catch (erreur) {
      suggestions = [];
      indisponible = true;
      afficherMessage(textes.acUnavailable);
      if (erreur instanceof MapServiceError && erreur.kind === 'config') {
        console.error('Taxi QISSI : pas de clé OpenRouteService dans ce build — voir le README.');
      }
    }
  }

  input.addEventListener('input', () => {
    adresseChoisie = null;
    clearTimeout(minuteur);
    const texte = input.value;
    if (texte.trim().length < MIN_CARACTERES) {
      suggestions = [];
      fermerListe();
      return;
    }
    minuteur = setTimeout(() => chercher(texte), PAUSE_AVANT_RECHERCHE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (listbox.hidden) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      indexActif = Math.min(indexActif + 1, suggestions.length - 1);
      afficherSuggestions();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      indexActif = Math.max(indexActif - 1, 0);
      afficherSuggestions();
    } else if (event.key === 'Enter') {
      // Entrée sur une liste ouverte veut dire "je prends celle-là", jamais
      // "envoie le formulaire" : l'envoi échouerait sur l'adresse proposée.
      if (suggestions.length > 0) {
        event.preventDefault();
        choisir(indexActif >= 0 ? indexActif : 0);
      }
    } else if (event.key === 'Escape') {
      fermerListe();
    }
  });

  // Petit délai : sans lui, la liste se ferme avant que le clic sur une
  // suggestion ne soit pris en compte.
  input.addEventListener('blur', () => setTimeout(fermerListe, 100));

  return {
    /** L'adresse choisie ({lat, lon, label}), ou null si aucune. */
    get value() {
      return adresseChoisie;
    },
    /** Vrai si la dernière recherche a échoué (API en panne, pas de clé…). */
    get unavailable() {
      return indisponible;
    },
    /** Impose une adresse sans passer par la recherche. */
    set(adresse) {
      adresseChoisie = adresse;
      if (adresse) input.value = adresse.label;
    },
    /** Oublie l'adresse choisie, en gardant le texte affiché. */
    clear() {
      adresseChoisie = null;
    },
    /** Remet le focus et relance la recherche sur le texte déjà saisi. */
    prompt() {
      input.focus();
      if (input.value.trim().length >= MIN_CARACTERES) chercher(input.value);
    },
  };
}
