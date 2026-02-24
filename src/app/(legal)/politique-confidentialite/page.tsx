import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Politique de Confidentialité | FleetMaster Pro',
  description: 'Politique de confidentialité et protection des données - FleetMaster Pro',
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-white mb-8">
          Politique de Confidentialité
        </h1>

        {/* Introduction RGPD */}
        <div className="mb-8 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-cyan-200">
            Conformément au Règlement Général sur la Protection des Données (RGPD), 
            nous nous engageons à protéger vos données personnelles.
          </p>
        </div>

        {/* Contenu placeholder */}
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Données collectées</h2>
            <p className="leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nous collectons 
              les données suivantes : nom, prénom, adresse email, numéro de téléphone, 
              et informations relatives à votre entreprise et votre flotte de véhicules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Finalité du traitement</h2>
            <p className="leading-relaxed">
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
              Vos données sont utilisées pour : la gestion de votre compte, 
              le suivi de votre flotte, et l'amélioration de nos services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Durée de conservation</h2>
            <p className="leading-relaxed">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. 
              Vos données sont conservées pendant la durée de votre abonnement 
              et 3 ans après la résiliation de celui-ci.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Vos droits</h2>
            <p className="leading-relaxed">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. 
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (droit à l'oubli)</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Contact DPO</h2>
            <p className="leading-relaxed">
              Pour exercer vos droits ou pour toute question sur le traitement de vos données, 
              contactez notre Délégué à la Protection des Données : dpo@fleetmaster.pro
            </p>
          </section>

          <div className="mt-12 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">
              <strong>Note :</strong> Cette politique de confidentialité est un placeholder. 
              Vous devez la remplacer par votre politique réelle conforme au RGPD 
              avant la mise en production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
