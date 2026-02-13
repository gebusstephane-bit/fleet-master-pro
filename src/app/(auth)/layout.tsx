/**
 * Layout Authentification
 * Layout spécifique pour les pages de login/register
 */

import { Logo } from '@/components/layout/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Section gauche - Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </div>

      {/* Section droite - Image/Brand (cachée sur mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 text-center">
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              Gérez votre flotte en toute simplicité
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              FleetMaster Pro vous aide à optimiser vos opérations, réduire les coûts 
              et améliorer la sécurité de vos véhicules et chauffeurs.
            </p>
            <div className="flex justify-center gap-8 pt-8">
              <Stat value="5-50" label="Véhicules" />
              <Stat value="100%" label="SaaS" />
              <Stat value="24/7" label="Support" />
            </div>
          </div>
          {/* Cercles décoratifs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
