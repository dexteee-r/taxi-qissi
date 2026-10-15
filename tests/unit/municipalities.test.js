// Les communes desservies, dans la langue de la page (src/lib/municipalities.js).
import { describe, it, expect } from 'vitest';
import { BUSINESS } from '../../src/config/business.js';
import { communeLabel, findCommune, normalize } from '../../src/lib/municipalities.js';

const communes = BUSINESS.servedMunicipalities;
const parNom = (nl) => communes.find((c) => c.nl === nl);

describe('communeLabel', () => {
  it('shows the name of the page language first, the other between brackets', () => {
    expect(communeLabel(parNom('Tienen'), 'fr')).toBe('Tirlemont (Tienen)');
    expect(communeLabel(parNom('Tienen'), 'nl')).toBe('Tienen (Tirlemont)');
    expect(communeLabel(parNom('Geldenaken'), 'fr')).toBe('Jodoigne (Geldenaken)');
    expect(communeLabel(parNom('Geldenaken'), 'nl')).toBe('Geldenaken (Jodoigne)');
    expect(communeLabel(parNom('Scherpenheuvel'), 'fr')).toBe('Montaigu (Scherpenheuvel)');
    expect(communeLabel(parNom('Hannuit'), 'nl')).toBe('Hannuit (Hannut)');
    expect(communeLabel(parNom('Hannuit'), 'fr')).toBe('Hannut (Hannuit)');
  });

  it('follows the Dutch name on the English pages', () => {
    expect(communeLabel(parNom('Leuven'), 'en')).toBe('Leuven (Louvain)');
  });

  it('shows a single name when both languages share it', () => {
    for (const locale of ['nl', 'fr', 'en']) {
      expect(communeLabel(parNom('Hoegaarden'), locale)).toBe('Hoegaarden');
    }
  });

  it('keeps all 22 communes distinct on every page', () => {
    for (const locale of ['nl', 'fr', 'en']) {
      const labels = communes.map((c) => communeLabel(c, locale));
      expect(labels).toHaveLength(22);
      expect(new Set(labels).size).toBe(22);
    }
  });
});

describe('findCommune', () => {
  it('finds a commune by either of its names, on any page', () => {
    expect(findCommune(communes, 'Tirlemont')?.nl).toBe('Tienen');
    expect(findCommune(communes, 'Tienen')?.nl).toBe('Tienen');
    expect(findCommune(communes, 'Saint-Trond')?.nl).toBe('Sint-Truiden');
    expect(findCommune(communes, 'saint trond')?.nl).toBe('Sint-Truiden');
    expect(findCommune(communes, 'Grez-Doiceau')?.nl).toBe('Graven');
    expect(findCommune(communes, 'Graven')?.fr).toBe('Grez-Doiceau');
    expect(findCommune(communes, 'Montaigu')?.nl).toBe('Scherpenheuvel');
    expect(findCommune(communes, 'Hannut')?.nl).toBe('Hannuit');
    expect(findCommune(communes, 'Hannuit')?.fr).toBe('Hannut');
  });

  it('prefers the start of a name over a fragment in the middle', () => {
    expect(findCommune(communes, 'Lou')?.nl).toBe('Leuven');
  });

  it('returns null for a commune outside the list, or an empty query', () => {
    expect(findCommune(communes, 'Brussel')).toBeNull();
    expect(findCommune(communes, '')).toBeNull();
  });
});

describe('normalize', () => {
  it('drops case, accents and punctuation', () => {
    expect(normalize('Héverlée-Loo')).toBe('heverleeloo');
  });
});
