/**
 * Constants pour l'onboarding
 * Centralise la configuration des étapes et textes
 */

export const ONBOARDING_STEPS = [
  {
    id: 1,
    key: "welcome",
    title: "Bienvenue",
    description: "Découvrez Fleet-Master",
    duration: "2 min",
  },
  {
    id: 2,
    key: "company",
    title: "Votre entreprise",
    description: "Informations sur votre société",
    duration: "2 min",
  },
  {
    id: 3,
    key: "vehicle",
    title: "Premier véhicule",
    description: "Ajoutez votre premier camion",
    duration: "3 min",
  },
  {
    id: 4,
    key: "driver",
    title: "Premier chauffeur",
    description: "Ajoutez un conducteur (optionnel)",
    duration: "2 min",
    optional: true,
  },
  {
    id: 5,
    key: "complete",
    title: "C'est parti !",
    description: "Tout est prêt",
    duration: "1 min",
  },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_TEXTS = {
  welcome: {
    headline: "Bienvenue sur Fleet-Master",
    subheadline:
      "La première plateforme de gestion de flotte qui anticipe les pannes avant qu'elles n'arrivent.",
    features: [
      {
        icon: "Shield",
        title: "Maintenance prédictive",
        description: "Notre IA analyse vos données moteur pour prédire les pannes 14 jours à l'avance.",
      },
      {
        icon: "TrendingDown",
        title: "Réduisez vos coûts",
        description: "Jusqu'à 30% d'économies sur vos coûts de maintenance.",
      },
      {
        icon: "Clock",
        title: "Gagnez du temps",
        description: "Gérez votre flotte en quelques clics, où que vous soyez.",
      },
    ],
    cta: "Commencer l'installation",
    skip: "Passer l'installation",
  },
  company: {
    headline: "Parlez-nous de votre entreprise",
    subheadline:
      "Ces informations nous aident à personnaliser votre expérience.",
    fields: {
      name: {
        label: "Nom de l'entreprise",
        placeholder: "Transport Dupont SARL",
      },
      siret: {
        label: "Numéro SIRET",
        placeholder: "123 456 789 00012",
        help: "14 chiffres, sans espaces",
      },
      fleetSize: {
        label: "Taille de votre flotte",
        placeholder: "5",
        help: "Nombre de véhicules",
      },
      industry: {
        label: "Secteur d'activité",
        placeholder: "Transport routier de marchandises",
      },
    },
  },
  vehicle: {
    headline: "Ajoutez votre premier véhicule",
    subheadline:
      "Vous pourrez ajouter les autres plus tard depuis le dashboard.",
    fields: {
      registrationNumber: {
        label: "Immatriculation",
        placeholder: "AB-123-CD",
        help: "Format: AA-123-AA",
      },
      brand: {
        label: "Marque",
        placeholder: "Renault",
      },
      model: {
        label: "Modèle",
        placeholder: "Trafic",
      },
      mileage: {
        label: "Kilométrage actuel",
        placeholder: "45000",
        help: "En kilomètres",
      },
    },
  },
  driver: {
    headline: "Ajoutez un chauffeur",
    subheadline: "Cette étape est optionnelle. Vous pourrez ajouter des chauffeurs plus tard.",
    fields: {
      firstName: {
        label: "Prénom",
        placeholder: "Jean",
      },
      lastName: {
        label: "Nom",
        placeholder: "Dupont",
      },
      email: {
        label: "Email",
        placeholder: "jean.dupont@entreprise.fr",
      },
      phone: {
        label: "Téléphone",
        placeholder: "06 12 34 56 78",
      },
    },
    skip: "Passer cette étape",
  },
  complete: {
    headline: "Félicitations ! 🎉",
    subheadline: "Votre compte est maintenant configuré et prêt à l'emploi.",
    recap: {
      title: "Récapitulatif",
      company: "Entreprise configurée",
      vehicle: "Véhicule ajouté",
      driver: "Chauffeur ajouté",
    },
    cta: "Accéder au dashboard",
    tips: [
      {
        icon: "Wrench",
        title: "Planifiez votre première maintenance",
        description: "Ajoutez vos prochaines vidanges et contrôles techniques.",
      },
      {
        icon: "Route",
        title: "Créez une tournée",
        description: "Optimisez vos livraisons avec notre planificateur intelligent.",
      },
      {
        icon: "Bell",
        title: "Activez les notifications",
        description: "Soyez alerté des échéances et anomalies en temps réel.",
      },
    ],
  },
} as const;

export const STORAGE_KEY = "onboarding_progress";
