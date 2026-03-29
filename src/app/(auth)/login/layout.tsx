import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Connexion Espace Client | FleetMaster",
  description: "Accédez à votre tableau de bord FleetMaster. Suivez vos véhicules, gérez vos alertes de maintenance et pilotez votre parc en temps réel.",
  alternates: {
    canonical: "https://fleet-master.fr/login",
  },
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
