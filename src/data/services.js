// La liste des services proposés, utilisée par la page d'accueil (version
// courte) et la page Services (version détaillée).

export const SERVICE_ICONS = [
  'M4 16.5h16M6.2 16.5l1.6-5.4A2.5 2.5 0 0 1 10.2 9.3h3.6a2.5 2.5 0 0 1 2.4 1.8l1.6 5.4M7.5 16.5V19M16.5 16.5V19',
  'M5 6h14v14H5zM8.5 3.5v4M15.5 3.5v4M5 11h14M12 14.5V17',
  'M3 13.5 21 6l-6.5 13-2.5-6-9-1.5Z',
  'M12 3.5l2.4 5.4 5.6.5-4.2 3.9 1.2 5.7L12 16.1 6.9 19l1.2-5.7L4 9.4l5.6-.5Z',
  'M4 8.5h16V19H4zM9 8.5V6h6v2.5M4 13.5h16',
];

export const SERVICES = {
  fr: [
    { title: 'Course immédiate', desc: 'Un appel, une voiture. À toute heure.', long: 'Vous appelez, nous partons. Dans Tienen et les communes voisines, de jour comme de nuit.' },
    { title: "Réservation à l'avance", desc: 'Train tôt le matin, rendez-vous, retour de soirée.', long: "Train de 6h, rendez-vous à l'hôpital, retour de mariage : nous notons l'heure et nous y sommes." },
    { title: 'Aéroport & gare', desc: 'Tous les aéroports, départ comme retour.', long: 'Tous les aéroports belges et frontaliers, aller comme retour, avec suivi du vol si vous nous donnez le numéro.' },
    { title: 'Événementiel', desc: 'Mariage, soirée, sortie de groupe.', long: "Mariages, fêtes, sorties de groupe. Plusieurs véhicules sur demande, horaires convenus à l'avance." },
    { title: 'Entreprises', desc: 'Trajets récurrents et facturation.', long: 'Trajets récurrents, accueil de vos clients, facturation mensuelle. Contactez-nous pour un accord.' },
  ],
  nl: [
    { title: 'Directe rit', desc: 'Eén telefoontje, één wagen. Op elk uur.', long: 'U belt, wij rijden. In Tienen en de buurgemeenten, dag en nacht.' },
    { title: 'Reservering vooraf', desc: 'Vroege trein, afspraak, terugrit ’s avonds.', long: 'Trein van 6u, afspraak in het ziekenhuis, terugrit na een feest: wij noteren het uur en staan er.' },
    { title: 'Luchthaven & station', desc: 'Alle luchthavens, heen en terug.', long: 'Alle Belgische en grensluchthavens, heen en terug, met vluchtopvolging als u het nummer doorgeeft.' },
    { title: 'Evenementen', desc: 'Huwelijk, feest, groepsuitstap.', long: 'Huwelijken, feesten, groepsuitstappen. Meerdere wagens op aanvraag, uren vooraf afgesproken.' },
    { title: 'Bedrijven', desc: 'Vaste ritten en facturatie.', long: 'Vaste ritten, uw klanten ophalen, maandelijkse facturatie. Contacteer ons voor een akkoord.' },
  ],
  en: [
    { title: 'Immediate ride', desc: 'One call, one car. Any time.', long: "You call, we drive. In Tienen and the neighbouring municipalities, day and night." },
    { title: 'Advance booking', desc: 'Early train, appointment, evening return.', long: "6am train, hospital appointment, ride home after a wedding: we note the time and we're there." },
    { title: 'Airport & station', desc: 'All airports, outbound and return.', long: 'All Belgian and cross-border airports, both ways, with flight tracking if you give us the flight number.' },
    { title: 'Events', desc: 'Weddings, parties, group outings.', long: 'Weddings, parties, group outings. Several vehicles on request, times agreed in advance.' },
    { title: 'Businesses', desc: 'Recurring rides and invoicing.', long: 'Recurring rides, picking up your clients, monthly invoicing. Contact us to set up an agreement.' },
  ],
};
