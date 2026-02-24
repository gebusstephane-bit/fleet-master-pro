import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Conditions Générales de Vente | FleetMaster Pro',
  description: 'Conditions générales de vente - FleetMaster Pro',
};

export default function CGVPage() {
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
          Conditions Générales de Vente
        </h1>

        {/* Contenu placeholder */}
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Objet</h2>
            <p className="leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Les présentes 
              Conditions Générales de Vente (CGV) régissent l'utilisation du service 
              FleetMaster Pro, solution SaaS de gestion de flotte automobile.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Prix et paiement</h2>
            <p className="leading-relaxed">
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
              Les prix sont indiqués en euros hors taxes. Le paiement s'effectue 
              par carte bancaire via notre prestataire Stripe, mensuellement ou 
              annuellement selon l'offre choisie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Durée et résiliation</h2>
            <p className="leading-relaxed">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. 
              L'abonnement est sans engagement. Vous pouvez résilier à tout moment 
              depuis votre espace client. La résiliation prend effet à la fin 
              de la période en cours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Responsabilités</h2>
            <p className="leading-relaxed">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. 
              Le service est fourni &quot;en l'état&quot;. Nous nous engageons à maintenir 
              une disponibilité de 99,5% du service, hors maintenance planifiée.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Propriété intellectuelle</h2>
            <p className="leading-relaxed">
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia. 
              Tous les droits de propriété intellectuelle relatifs au service FleetMaster Pro 
              restent notre propriété exclusive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Loi applicable et juridiction</h2>
            <p className="leading-relaxed">
              Les présentes CGV sont soumises au droit français. En cas de litige, 
              les tribunaux français seront compétents.
            </p>
          </section>

          <div className="mt-12 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400">
              <strong>Note :</strong> Ces conditions générales de vente sont des placeholders. 
              Vous devez les remplacer par vos CGV réelles validées par un juriste 
              avant la mise en production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
