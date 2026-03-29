import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Tarifs FleetMaster | Essai Gratuit 14 Jours Sans CB - Gestion de Flotte",
  description: "Découvrez les abonnements FleetMaster. Tarification transparente, sans engagement. Rentabilisez votre parc dès le premier mois. Essai gratuit 14 jours sans carte bancaire.",
  alternates: {
    canonical: "https://fleet-master.fr/pricing",
  },
  openGraph: {
    title: "Tarifs FleetMaster | Essai Gratuit 14 Jours Sans CB",
    description: "Tarification transparente pour rentabiliser votre parc dès le premier mois. Sans engagement.",
    url: "https://fleet-master.fr/pricing",
    siteName: "FleetMaster",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "https://fleet-master.fr/og-image.png", width: 1200, height: 630 }],
  },
}

export default function PricingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
