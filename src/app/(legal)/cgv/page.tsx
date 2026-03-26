import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Conditions Générales de Vente | Fleet-Master',
  description: 'Conditions générales de vente - Fleet-Master',
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

        <p className="text-sm text-slate-400 mb-8">Derniere mise a jour : 26 mars 2026</p>

        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Objet</h2>
            <p className="leading-relaxed">
              Les presentes Conditions Generales de Vente (CGV) regissent l'utilisation du service FleetMaster,
              une solution SaaS de gestion de flotte editee par l'entreprise individuelle Stephane GEBUS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Services et Essai Gratuit</h2>
            <p className="leading-relaxed">
              FleetMaster propose une periode d'essai gratuite de 14 jours, sans engagement et sans saisie
              de carte bancaire. A l'issue de cette periode, l'utilisateur peut choisir de souscrire a un
              abonnement payant pour conserver l'acces a ses donnees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Prix et Paiement</h2>
            <p className="leading-relaxed">
              Les tarifs sont indiques en euros. Conformement a l'article 293 B du CGI, la TVA est non applicable.
              Le paiement s'effectue de maniere securisee par carte bancaire via notre prestataire Stripe.
              L'abonnement est facture mensuellement ou annuellement selon l'offre choisie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Duree et Resiliation</h2>
            <p className="leading-relaxed">
              L'abonnement est sans engagement de duree. L'utilisateur peut resilier a tout moment directement
              depuis son espace client. La resiliation prendra effet a la fin de la periode de facturation en cours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Responsabilites</h2>
            <p className="leading-relaxed">
              Le service FleetMaster est fourni &quot;en l'etat&quot;. Bien que nous mettions tout en oeuvre pour
              assurer une disponibilite de 99,5% du service, nous ne pourrons etre tenus responsables des
              interruptions liees a la maintenance ou aux pannes de reseaux tiers. Les donnees saisies restent
              sous la responsabilite de l'utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Propriete intellectuelle</h2>
            <p className="leading-relaxed">
              L'ensemble des elements (logiciel, code, design, logo) constituant le service FleetMaster
              est la propriete exclusive de Stephane GEBUS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Loi applicable et juridiction</h2>
            <p className="leading-relaxed">
              Les presentes CGV sont soumises au droit francais. En cas de litige, et a defaut d'accord amiable,
              les tribunaux francais seront seuls competents.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
